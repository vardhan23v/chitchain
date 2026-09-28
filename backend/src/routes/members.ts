import { Router } from "express";
import { contractAs, getCircle, getCircleCount, getMember, isConfigured, oracle, sendTx, type Tier } from "../chain";
import { circleNames, eventsInvolving, isDemoCircle } from "../db";
import { assessRisk, type RiskResult } from "../risk";
import { audit, auditSystem } from "../auth/audit";
import { requireAuth, requireSelfOrAdmin } from "../auth/middleware";
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

/** Circles the address joined, newest first (bounded scan over circleCount; cached 5 s per address). Shared by /members/:addr/circles and /me/circles. */
const CIRCLES_CACHE_MS = 5000;
const circlesCache = new Map<string, { at: number; body: Record<string, unknown>[] }>();
export async function circlesForAddress(addressRaw: string): Promise<Record<string, unknown>[]> {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  const address = parseAddress(addressRaw);
  const key = address.toLowerCase();
  const hit = circlesCache.get(key);
  if (hit && Date.now() - hit.at < CIRCLES_CACHE_MS) return hit.body;
  const count = await getCircleCount();
  const joined: number[] = [];
  for (let id = count; id >= 1; id--) if ((await getMember(id, address)).joined) joined.push(id); // newest first
  const names = await circleNames(joined);
  const out: Record<string, unknown>[] = [];
  for (const id of joined) {
    const [c, isDemo, defaults] = await Promise.all([getCircle(id), isDemoCircle(id), defaultsOf(id)]);
    const me = await memberInfo(id, address, c.round, defaults.latestByMember.get(key));
    out.push({ ...circleSummary(id, c, isDemo, names.get(id)), me });
  }
  circlesCache.set(key, { at: Date.now(), body: out });
  return out;
}
members.get("/members/:addr/circles", wrap(async (req, res) => { res.json({ circles: await circlesForAddress(req.params.addr) }); }));

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
    auditSystem("ORACLE", "oracle.setRiskTier", address.toLowerCase(), "ok", txHash, { tier: result.tier, score: result.score });
  }
  return { ...result, txHash };
}

/** POST /members/:addr/assess — self or ADMIN. Audited as member.assess (+ oracle.setRiskTier when a tx was sent). */
members.post("/members/:addr/assess", requireAuth(), requireSelfOrAdmin("addr"), wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  const force = ["1", "true", "yes"].includes(String(req.query.force ?? "").toLowerCase());
  let result;
  try { result = await assessAndSetTier(address, force); } catch (e) {
    audit(req, "member.assess", address.toLowerCase(), "failed", { meta: { error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
  audit(req, "member.assess", address.toLowerCase(), "ok", { txHash: result.txHash, meta: { score: result.score, tier: result.tier, force } });
  res.json(result);
}));
