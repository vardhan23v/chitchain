import { Router } from "express";
import { ZeroAddress } from "ethers";
import {
  contractAddress, getCircle, getCircleCount, getMember, getMembers, getRequiredCollateral, getRound, getRoundHistory, isConfigured, labelOf, provider,
  roundPhase, toJson, type CircleView, type MemberView, type RoundView,
} from "../chain";
import { z } from "zod";
import {
  activeMandates, circleNames, countDistinctTx, countEventsForCircle, eventsForCircleByName, getCircleMeta, getUser, isDemoCircle, updateUser, upsertCircleMeta,
  type CircleMetaRow, type EventRow,
} from "../db";
import { settleNow } from "../keeper";
import { audit } from "../auth/audit";
import { ipOf, rateLimit } from "../auth/ratelimit";
import { optionalAuth, requireAuth } from "../auth/middleware";
import { defaultInfoFrom, mandateToApi, type ContributionStatus, type DefaultInfo } from "./feedShape";
import { ApiError, parseId, wrap } from "./util";

export const circles = Router();

function requireContract(): void { if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT"); }

/** CircleSummary = contract CircleView (v2) + id + isDemo + v3 name / organizerWallet (from CircleMeta, null when unclaimed). bigint → string at the JSON edge. */
export function circleSummary(id: number, c: CircleView, isDemo: boolean, meta?: CircleMetaRow | null): Record<string, unknown> {
  return toJson({ id, ...c, isDemo, name: meta?.name ?? null, organizerWallet: meta?.organizerWallet ?? null }) as Record<string, unknown>;
}
/** circleSummary with its own CircleMeta lookup (use circleNames() to batch when listing). */
export async function circleSummaryOf(id: number, c: CircleView): Promise<Record<string, unknown>> {
  const [isDemo, meta] = await Promise.all([isDemoCircle(id), getCircleMeta(id)]);
  return circleSummary(id, c, isDemo, meta);
}

/** RoundInfo = contract RoundView + phase + lowestAcceptedPayout (expectedPot − bestDiscount). */
export function roundInfo(r: RoundView, nowSec = Math.floor(Date.now() / 1000)): unknown {
  const lowest = r.bestDiscount >= r.expectedPot ? 0n : r.expectedPot - r.bestDiscount;
  return toJson({ ...r, lowestAcceptedPayout: lowest, phase: roundPhase(r, nowSec) });
}

const ALL_CACHE_MS = 5000;
let allCache: { at: number; list: { id: number; c: CircleView }[] } | null = null;
/** Every circle's CircleView (ascending id), cached 5 s. Pass `fresh` to bypass the cache. */
export async function allCircles(fresh = false): Promise<{ id: number; c: CircleView }[]> {
  if (!fresh && allCache && Date.now() - allCache.at < ALL_CACHE_MS) return allCache.list;
  const count = await getCircleCount();
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const views = await Promise.all(ids.map((id) => getCircle(id)));
  const list = ids.map((id, i) => ({ id, c: views[i] }));
  allCache = { at: Date.now(), list };
  return list;
}

async function requireCircle(id: number): Promise<void> {
  if (id > (await getCircleCount())) throw new ApiError(404, "circle not found", "NOT_FOUND");
}

/** Latest indexed DefaultDetected row per member (lowercase address) for a circle, plus all rows newest first. */
export async function defaultsOf(circleId: number): Promise<{ latestByMember: Map<string, EventRow>; all: EventRow[] }> {
  const rows = await eventsForCircleByName(circleId, ["DefaultDetected"]);
  const latestByMember = new Map<string, EventRow>();
  for (const r of rows) {
    const a = JSON.parse(r.args_json) as { member?: string };
    if (typeof a.member === "string") latestByMember.set(a.member.toLowerCase(), r); // ascending → last write wins
  }
  return { latestByMember, all: rows.reverse() };
}

/**
 * Contribution status for the CURRENT round: paid → PAID; removed → DEFAULTED; a default recorded at the most recent
 * settlement (round − 1, or this round once the circle is Completed) → how it was covered; otherwise PENDING.
 */
export function contributionStatusOf(m: MemberView, circleRound: number, lastDefault: DefaultInfo | null): ContributionStatus {
  if (m.paidThisRound) return "PAID";
  if (m.removed) return "DEFAULTED";
  if (lastDefault && lastDefault.round >= circleRound - 1) return lastDefault.status;
  return "PENDING";
}

/** MemberInfo for one address (shared by /circles/:id and /members/:addr/circles). */
export async function memberInfo(circleId: number, address: string, circleRound: number, lastDefaultRow: EventRow | undefined): Promise<Record<string, unknown>> {
  const [m, required] = await Promise.all([getMember(circleId, address), getRequiredCollateral(address, circleId)]);
  const lastDefault = lastDefaultRow ? defaultInfoFrom(lastDefaultRow, m.collateral) : null;
  let lastDefaultOut: DefaultInfo | null = null;
  if (lastDefault) { const { member: _member, ...rest } = lastDefault; lastDefaultOut = rest; }
  return {
    ...(toJson({ address, label: labelOf(address), custodial: labelOf(address) !== null, ...m, requiredCollateral: required }) as Record<string, unknown>),
    contributionStatus: contributionStatusOf(m, circleRound, lastDefault),
    lastDefault: lastDefaultOut,
  };
}

circles.get("/circles", wrap(async (_req, res) => {
  requireContract();
  const list = [...(await allCircles())].reverse();
  const names = await circleNames(list.map((x) => x.id));
  const out = await Promise.all(list.map(async ({ id, c }) => circleSummary(id, c, await isDemoCircle(id), names.get(id))));
  res.json({ circles: out });
}));

circles.get("/circles/:id", wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  await requireCircle(id);
  const [c, round, addrs, isDemo, defaults, meta] = await Promise.all([getCircle(id), getRound(id), getMembers(id), isDemoCircle(id), defaultsOf(id), getCircleMeta(id)]);
  const [members, txCount, mandates] = await Promise.all([
    Promise.all(addrs.map((address) => memberInfo(id, address, c.round, defaults.latestByMember.get(address.toLowerCase())))),
    countEventsForCircle(id),
    activeMandates(id),
  ]);
  let latestDefault: (DefaultInfo & { member: string; label: string | null }) | null = null;
  const newest = defaults.all[0];
  if (newest) {
    const info = defaultInfoFrom(newest, 0n);
    const state = members.find((m) => String(m.address).toLowerCase() === info.member.toLowerCase());
    latestDefault = { ...info, remainingCollateral: state ? String(state.collateral) : "0", label: labelOf(info.member) };
  }
  res.json({
    circle: circleSummary(id, c, isDemo, meta), round: roundInfo(round), members, txCount, mandates: mandates.map(mandateToApi), latestDefault,
  });
}));

/** Settled rounds ascending (RoundHistoryRow[]) from getRoundHistory + indexed RoundSettled / DividendCredited. */
export async function roundsOf(id: number, c?: CircleView): Promise<unknown[]> {
  const [circle, addrs, events] = await Promise.all([c ?? getCircle(id), getMembers(id), eventsForCircleByName(id, ["RoundSettled", "DividendCredited"])]);
  const settledUpTo = circle.status === 2 ? circle.round : circle.status === 1 ? circle.round - 1 : 0;
  const settledTx = new Map<number, string>();
  const dividendCount = new Map<number, number>();
  for (const e of events) {
    if (e.round === null) continue;
    if (e.name === "RoundSettled") settledTx.set(e.round, e.tx_hash);
    else dividendCount.set(e.round, (dividendCount.get(e.round) ?? 0) + 1);
  }
  let activeCount: number | null = null; // fallback when the index has no DividendCredited rows for a round
  const rounds = [];
  for (let r = 1; r <= settledUpTo; r++) {
    const h = await getRoundHistory(id, r);
    if (h.settledAt === 0) continue; // not settled (should not happen below settledUpTo)
    const hasWinner = h.winner !== ZeroAddress;
    const dividendsTotal = hasWinner ? h.discount : h.pot - h.fee;
    let n = dividendCount.get(r) ?? 0;
    if (n === 0 && dividendsTotal > 0n) {
      if (activeCount === null) {
        const states = await Promise.all(addrs.map((a) => getMember(id, a)));
        activeCount = states.filter((s) => !s.removed).length;
      }
      n = Math.max(activeCount - (hasWinner ? 1 : 0), 1);
    }
    rounds.push(toJson({
      round: r, winner: hasWinner ? h.winner : null, winnerLabel: hasWinner ? labelOf(h.winner) : null,
      pot: h.pot, payout: h.payout, discount: h.discount, fee: h.fee, holdback: h.holdback,
      dividendsTotal, dividendPerMember: n > 0 ? dividendsTotal / BigInt(n) : 0n,
      settledAt: h.settledAt, txHash: settledTx.get(r) ?? null,
    }));
  }
  return rounds;
}

/** GET /circles/:id/rounds */
circles.get("/circles/:id/rounds", wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  await requireCircle(id);
  res.json({ rounds: await roundsOf(id) });
}));

/** GET /circles/:id/defaults — every indexed DefaultDetected for the circle, newest first. */
circles.get("/circles/:id/defaults", wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  await requireCircle(id);
  const { all } = await defaultsOf(id);
  const collateral = new Map<string, bigint>();
  const out = [];
  for (const r of all) {
    const a = (JSON.parse(r.args_json) as { member?: string }).member ?? "";
    const key = a.toLowerCase();
    if (!collateral.has(key)) collateral.set(key, a ? (await getMember(id, a)).collateral : 0n);
    const info = defaultInfoFrom(r, collateral.get(key) ?? 0n);
    out.push({ ...info, label: labelOf(info.member) });
  }
  res.json({ defaults: out });
}));

/** POST /circles/:id/settle — public (settlement is permissionless on-chain); 5/min per IP; audited with the caller if signed in. */
const settleLimiter = rateLimit({ perMinute: 5, keys: (req) => [`settle:${ipOf(req)}`] });
circles.post("/circles/:id/settle", settleLimiter, optionalAuth(), wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  const c = await getCircle(id);
  if (c.status !== 1) throw new ApiError(409, "circle is not active", "NotActive");
  if (Math.floor(Date.now() / 1000) <= c.roundDeadline) throw new ApiError(409, "bidding deadline has not passed", "BiddingNotOver");
  let txHash: string;
  try { txHash = await settleNow(id, "api settle"); } catch (e) {
    audit(req, "circle.settle", `circle:${id}`, "failed", { meta: { round: c.round, error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
  audit(req, "circle.settle", `circle:${id}`, "ok", { txHash, meta: { round: c.round } });
  res.json({ txHash });
}));

const claimBody = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).nullable().optional(),
  txHash: z.string().trim().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
});
/** POST /circles/:id/claim — the on-chain creator names their circle and becomes its organizer (MEMBER → ORGANIZER). */
circles.post("/circles/:id/claim", requireAuth(), wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  await requireCircle(id);
  const parsed = claimBody.safeParse(req.body ?? {});
  if (!parsed.success) throw new ApiError(400, "body must be { name, description?, txHash? }", "BAD_BODY");
  const me = req.auth!.address;
  const c = await getCircle(id);
  if (c.creator.toLowerCase() !== me) {
    audit(req, "circle.claim", `circle:${id}`, "denied", { meta: { creator: c.creator.toLowerCase() } });
    throw new ApiError(403, "only the on-chain creator can claim this circle", "NOT_CREATOR");
  }
  const meta = await upsertCircleMeta(id, { name: parsed.data.name, description: parsed.data.description ?? null, organizerWallet: me });
  let user = await getUser(me);
  if (user && user.role === "MEMBER") user = await updateUser(me, { role: "ORGANIZER" });
  audit(req, "circle.claim", `circle:${id}`, "ok", { txHash: parsed.data.txHash ?? null, meta: { name: meta.name } });
  res.json({ circle: circleSummary(id, c, await isDemoCircle(id), meta), user });
}));

circles.get("/stats", wrap(async (_req, res) => {
  if (!isConfigured()) { res.json({ circlesLive: 0, circlesTotal: 0, mstcInContract: "0", txCount: 0 }); return; }
  const [list, balance, txCount] = await Promise.all([allCircles(), provider.getBalance(contractAddress!), countDistinctTx()]);
  res.json({
    circlesLive: list.filter(({ c }) => c.status === 0 || c.status === 1).length,
    circlesTotal: list.length,
    mstcInContract: balance.toString(),
    txCount,
  });
}));
