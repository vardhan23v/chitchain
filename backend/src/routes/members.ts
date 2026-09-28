import { Router } from "express";
import { contractAs, getCircle, getCircleCount, getMember, isConfigured, oracle, sendTx, type Tier } from "../chain";
import { eventsInvolving, isDemoCircle } from "../db";
import { assessRisk, type RiskResult } from "../risk";
import { circleSummary, defaultsOf, memberInfo } from "./circles";
import { eventRowToFeed } from "./feedShape";
import { ApiError, optionalInt, parseAddress, wrap } from "./util";

export const members = Router();

/** GET /members/:addr/activity?limit= — every indexed event naming the address (member / winner / bidder), newest first. */
members.get("/members/:addr/activity", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  const limit = Math.min(Math.max(optionalInt(req.query.limit) ?? 50, 1), 200);
  const rows = await eventsInvolving(address, limit);
  res.json({ events: await Promise.all(rows.map(eventRowToFeed)) });
}));

/** GET /members/:addr/circles — circles the address joined (bounded scan over circleCount; cached 5 s per address). */
const CIRCLES_CACHE_MS = 5000;
const circlesCache = new Map<string, { at: number; body: unknown }>();
members.get("/members/:addr/circles", wrap(async (req, res) => {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  const address = parseAddress(req.params.addr);
  const key = address.toLowerCase();
  const hit = circlesCache.get(key);
  if (hit && Date.now() - hit.at < CIRCLES_CACHE_MS) { res.json(hit.body); return; }
  const count = await getCircleCount();
  const out = [];
  for (let id = count; id >= 1; id--) { // newest first
    const m = await getMember(id, address);
    if (!m.joined) continue;
    const [c, isDemo, defaults] = await Promise.all([getCircle(id), isDemoCircle(id), defaultsOf(id)]);
    const me = await memberInfo(id, address, c.round, defaults.latestByMember.get(key));
    out.push({ ...(circleSummary(id, c, isDemo) as Record<string, unknown>), me });
  }
  const body = { circles: out };
  circlesCache.set(key, { at: Date.now(), body });
  res.json(body);
}));

members.get("/members/:addr/risk", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  res.json(await assessRisk(address));
}));

/** Computes the score and sends setRiskTier from the oracle wallet if the tier differs (or ?force=1). */
export async function assessAndSetTier(address: string, force: boolean): Promise<RiskResult & { txHash: string | null }> {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (!oracle) throw new ApiError(503, "RISK_ORACLE_PRIVATE_KEY not configured", "NO_ORACLE");
  const oracleContract = contractAs(oracle);
  const result = await assessRisk(address, true);
  let txHash: string | null = null;
  if (force || result.onChainTier !== result.tier) {
    const rc = await sendTx(`oracle setRiskTier ${address} → ${result.tier}`, oracle, () => oracleContract.setRiskTier(address, result.tier));
    txHash = rc.hash;
    result.onChainTier = result.tier as Tier;
  }
  return { ...result, txHash };
}

members.post("/members/:addr/assess", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  const force = ["1", "true", "yes"].includes(String(req.query.force ?? "").toLowerCase());
  res.json(await assessAndSetTier(address, force));
}));
