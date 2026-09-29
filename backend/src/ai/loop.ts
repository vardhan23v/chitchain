/**
 * v4 agent loop: MONITOR → ANALYZE → DECIDE → VALIDATE → BID → VERIFY → CONTINUE, every 4 s for each ACTIVE BidAgent.
 * The crew (Python) or the deterministic fallback proposes; the Risk Guard validates; only then does Node send
 * `placeBid` from the custodial demo wallet. Every step is written as an AgentEvent (short text + user reason).
 */
import { formatEther } from "ethers";
import { contractAs, demoWallet, errorMessage, getMember, isConfigured, potOf, preflight, provider, sendTx, type CircleView, type RoundView } from "../chain";
import { loop } from "../bus";
import { activeBidAgents, getBidAgent, insertAgentLog, lastAgentEvent, listAgentEvents, type BidAgentApi } from "../db";
import { auditSystem } from "../auth/audit";
import { clampDecision, fallbackDecide, asMst, type FallbackAuction, type FallbackStrategy } from "./fallback";
import { crewConfigured, evaluateWithCrew } from "./crewClient";
import { maybeDemoRival } from "./demoRival";
import { RISK_COPY, riskGuard } from "./riskGuard";
import { buildSnapshot, type SnapshotBundle } from "./snapshot";
import { recordEvent, setAgentStatus } from "./sse";
import type { AuctionSnapshot, Decision, Level, StrategyBrief } from "./types";

export const TICK_MS = 4000;
const LLM_MIN_INTERVAL_SEC = 20;
const CREW_TIMEOUT_MS = 20_000;
const MAX_FAILURES = 3;
const HISTORY_LINES = 12;

interface Mem {
  snapKey: string | null; lastBest: bigint | null; lastLlmAt: number; lastLlmBest: bigint | null; nextRetryAt: number; startRound: number | null;
}
const mem = new Map<string, Mem>();
const running = new Set<string>();
const memOf = (id: string): Mem => {
  let m = mem.get(id);
  if (!m) { m = { snapKey: null, lastBest: null, lastLlmAt: 0, lastLlmBest: null, nextRetryAt: 0, startRound: null }; mem.set(id, m); }
  return m;
};
export const nowSec = (): number => Math.floor(Date.now() / 1000);
const short = (a: string): string => `${a.slice(0, 6)}…${a.slice(-4)}`;
const level = (v: string): Level => (v === "low" || v === "high" ? v : "medium");

async function finish(agent: BidAgentApi, reason: string): Promise<void> {
  await recordEvent(agent.id, "DONE", "Agent finished", reason);
  await setAgentStatus(agent.id, { status: "DONE", statusReason: reason, lastDecision: "STOP", lastReason: reason });
  mem.delete(agent.id);
}

function toBrief(agent: BidAgentApi): StrategyBrief {
  return {
    agentId: agent.id, circleId: agent.circleId, member: agent.member, goal: agent.goal,
    desiredPayoutMst: agent.desiredPayout === null ? null : Number(formatEther(BigInt(agent.desiredPayout))),
    maxDiscountMst: Number(formatEther(BigInt(agent.maxDiscount))), maxDiscountPct: agent.maxDiscountPct,
    urgency: level(agent.urgency), riskTolerance: level(agent.riskTolerance), expiresAt: agent.expiresAt, autonomous: agent.autonomous,
  };
}
function toFallback(agent: BidAgentApi, snap: AuctionSnapshot, round: RoundView, circle: CircleView): { s: FallbackStrategy; a: FallbackAuction } {
  return {
    s: { desiredPayout: agent.desiredPayout === null ? null : BigInt(agent.desiredPayout), maxDiscount: BigInt(agent.maxDiscount), maxDiscountPct: agent.maxDiscountPct, urgency: agent.urgency, riskTolerance: agent.riskTolerance },
    a: { status: snap.status, expectedPot: potOf(round), bestDiscount: round.bestDiscount, contractMaxDiscount: round.maxDiscount, secondsRemaining: snap.secondsRemaining, biddingWindowSec: Math.max(1, circle.biddingDuration) },
  };
}

/** ANALYZE + DECIDE: crew first (timeout 20 s), deterministic fallback otherwise. The crew's number is always clamped. */
async function decide(agent: BidAgentApi, snap: AuctionSnapshot, round: RoundView, circle: CircleView): Promise<{ d: Decision; crewError: string | null }> {
  const { s, a } = toFallback(agent, snap, round, circle);
  if (crewConfigured()) {
    try {
      const history = (await listAgentEvents(agent.id, { limit: 200 })).slice(-HISTORY_LINES).map((e) => ({ ts: e.ts, kind: e.kind, text: e.text, reason: e.reason, data: e.data }));
      const raw = await evaluateWithCrew({ strategy: toBrief(agent), auction: snap, history }, CREW_TIMEOUT_MS);
      return { d: clampDecision(raw, s, a), crewError: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[aiBidding] ${agent.id}: crew failed (${msg}); using fallback`);
      return { d: fallbackDecide(s, a), crewError: msg };
    }
  }
  return { d: fallbackDecide(s, a), crewError: null };
}

/** BID + VERIFY: preflight, send from the custodial demo wallet, wait for 1 confirmation, log everywhere. */
async function execute(agent: BidAgentApi, discount: bigint, snap: AuctionSnapshot, round: RoundView): Promise<void> {
  const w = demoWallet(agent.member);
  if (!w) throw new Error("not a custodial demo wallet");
  const m = memOf(agent.id);
  const pot = potOf(round);
  const payout = discount >= pot ? 0n : pot - discount;
  const contract = contractAs(w.wallet); // custodial demo wallet — bids from the member's own key
  const ctx = `ai ${w.label} circle ${agent.circleId} round ${snap.round}`;
  try {
    await preflight(contract, "placeBid", [agent.circleId, discount]); // never send a tx that would revert
    const rc = await sendTx(ctx, w.wallet, () => contract.placeBid(agent.circleId, discount).then(async (res) => {
      await recordEvent(agent.id, "TX_SUBMITTED", `Transaction submitted ${short(res.hash)}`, "Bid sent to the MST testnet; waiting for confirmation.", { txHash: res.hash, discount: discount.toString(), payout: payout.toString(), round: snap.round });
      return res;
    }));
    const block = await provider.getBlock(rc.blockNumber).catch(() => null);
    const ts = block?.timestamp ?? nowSec();
    await insertAgentLog({ circleId: agent.circleId, round: snap.round, member: w.address, agentWallet: w.address, bidThisRound: true, discount, reason: agent.lastReason ?? "AI agent bid", source: "llm", txHash: rc.hash, error: null });
    auditSystem("AGENT", "ai.bid", `circle:${agent.circleId}`, "ok", rc.hash, { round: snap.round, member: w.address, label: w.label, discount: discount.toString(), agentId: agent.id });
    await recordEvent(agent.id, "TX_CONFIRMED", `Bid confirmed in block ${rc.blockNumber}`, `Your bid of ${asMst(discount)} discount is on-chain (payout ${asMst(payout)}).`, {
      txHash: rc.hash, block: rc.blockNumber, ts, discount: discount.toString(), payout: payout.toString(), round: snap.round, simulated: false,
    });
    await setAgentStatus(agent.id, { lastBid: discount.toString(), lastTxHash: rc.hash, failures: 0 });
    m.lastBest = discount;
  } catch (e) {
    const err = errorMessage(e);
    const failures = agent.failures + 1;
    auditSystem("AGENT", "ai.bid", `circle:${agent.circleId}`, "failed", null, { round: snap.round, member: w.address, label: w.label, discount: discount.toString(), error: err, agentId: agent.id });
    await insertAgentLog({ circleId: agent.circleId, round: snap.round, member: w.address, agentWallet: w.address, bidThisRound: true, discount, reason: agent.lastReason ?? "AI agent bid", source: "llm", txHash: null, error: err });
    await recordEvent(agent.id, "TX_FAILED", `Transaction failed (${err})`, `The bid could not be placed: ${err}.`, { error: err, discount: discount.toString(), round: snap.round, failures });
    m.nextRetryAt = nowSec() + 8 * 2 ** failures;
    if (failures >= MAX_FAILURES) {
      await recordEvent(agent.id, "PAUSED", "Agent paused", "Repeated transaction failures");
      await setAgentStatus(agent.id, { failures, status: "PAUSED", statusReason: "Repeated transaction failures" });
    } else {
      await setAgentStatus(agent.id, { failures });
    }
  }
}

/**
 * One evaluation tick for one agent. `force` bypasses the LLM rate limit and failure backoff (used by /evaluate).
 * Returns the decision taken this tick, or null when the tick ended before a decision (quiet phases, rate limit, finished).
 */
export async function tickAgent(agent: BidAgentApi, force = false): Promise<{ decision: Decision; bundle: SnapshotBundle } | null> {
  if (!isConfigured()) return null;
  if (running.has(agent.id)) return null;
  running.add(agent.id);
  try {
    const m = memOf(agent.id);
    const now = nowSec();
    // 1. expiry / circle state
    if (agent.expiresAt !== null && now > agent.expiresAt) { await finish(agent, "Strategy expired"); return null; }
    const bundle = await buildSnapshot(agent.circleId);
    const { snapshot: snap, round, circle } = bundle;
    if (snap.status === "INACTIVE") { await finish(agent, "Circle is no longer active"); return null; }
    if (m.startRound === null) {
      const info = await lastAgentEvent(agent.id, "INFO");
      const r = Number(info?.data?.round);
      m.startRound = Number.isInteger(r) && r > 0 ? r : snap.round;
    }
    if (snap.round > m.startRound) {
      if (agent.durationSec === null) { await finish(agent, "Auction ended"); return null; }
      m.startRound = snap.round; m.lastBest = null; m.lastLlmBest = null;
      await recordEvent(agent.id, "INFO", `Round ${snap.round} started`, "The previous round settled; your strategy is still active, so the agent keeps monitoring.", { round: snap.round });
    }
    // 2. MONITOR
    const best = round.bestDiscount;
    const key = `${snap.status}:${best}:${snap.bidCount}:${Math.floor(snap.secondsRemaining / 30)}`;
    if (key !== m.snapKey) {
      m.snapKey = key;
      await recordEvent(agent.id, "REFRESH", "Auction state refreshed", null, { status: snap.status, round: snap.round, bestDiscount: snap.bestDiscount, bidCount: snap.bidCount, secondsRemaining: snap.secondsRemaining });
    }
    const bestChanged = m.lastBest !== null && best !== m.lastBest;
    if (bestChanged && snap.bestBidder !== agent.member) {
      const who = snap.bestBidderLabel ?? (snap.bestBidder ? short(snap.bestBidder) : "unknown");
      await recordEvent(agent.id, "BID_SEEN", `New bid detected: ${asMst(best)} discount by ${who}`, `Another member now leads with a ${asMst(best)} discount (payout ${snap.bestPayoutMst} MST).`, { bestDiscount: snap.bestDiscount, bestBidder: snap.bestBidder, label: snap.bestBidderLabel, round: snap.round });
    }
    m.lastBest = best;
    // 9. demo rival (real bid from another custodial wallet, once per round)
    if (await maybeDemoRival(agent, snap, round, now)) return null; // next tick sees the new bid
    // 3. quiet phases
    const quiet = async (reason: string): Promise<{ decision: Decision; bundle: SnapshotBundle }> => {
      const decision: Decision = { decision: "WAIT", discount: null, reasonCode: "QUIET", reason, confidence: 1, source: "fallback", analyst: null };
      if (agent.lastDecision !== "WAIT" || agent.lastReason !== reason) {
        await recordEvent(agent.id, "DECISION", "Decision: WAIT", reason, { decision: "WAIT", reasonCode: "QUIET", round: snap.round });
        await setAgentStatus(agent.id, { lastDecision: "WAIT", lastReason: reason });
      }
      return { decision, bundle };
    };
    // v2.2: the agent never opens an auction. It only acts after the recipient declined the full pot on-chain.
    if (snap.status !== "BIDDING") {
      return quiet(snap.status === "CONTRIBUTION" ? "Waiting for contributions; an auction opens only if the recipient declines the full pot"
        : snap.status === "DECISION" ? "Waiting for the recipient to accept or decline the full pot"
        : "Bidding closed; waiting for settlement");
    }
    if (snap.bestBidder === agent.member) return quiet("You hold the winning bid");
    // 4. ANALYZE + DECIDE (rate-limited)
    if (!force && now < m.nextRetryAt) return null;
    if (!force && now - m.lastLlmAt < LLM_MIN_INTERVAL_SEC && m.lastLlmBest === best) return null;
    m.lastLlmAt = now; m.lastLlmBest = best;
    const { d, crewError } = await decide(agent, snap, round, circle);
    await recordEvent(agent.id, "EVALUATED", d.source === "crew" ? "Evaluated by the AI crew" : "Evaluated by deterministic rules", null, {
      source: d.source, confidence: d.confidence, reasonCode: d.reasonCode, analyst: d.analyst, crewError, round: snap.round,
    });
    const label = d.decision === "BID" && d.discount !== null ? `Decision: BID ${asMst(d.discount)}` : `Decision: ${d.decision}`;
    const payout = d.discount === null ? null : (d.discount >= potOf(round) ? 0n : potOf(round) - d.discount).toString();
    await recordEvent(agent.id, "DECISION", label, d.reason, { decision: d.decision, discount: d.discount?.toString() ?? null, payout, confidence: d.confidence, reasonCode: d.reasonCode, source: d.source, round: snap.round });
    agent = await setAgentStatus(agent.id, { lastDecision: d.decision, lastReason: d.reason });
    if (d.decision === "STOP") {
      const maxHit = /^(MAX_|PAYOUT_UNREACHABLE)/.test(d.reasonCode);
      await finish(agent, maxHit ? "Your maximum has been reached" : d.reason);
      return { decision: d, bundle };
    }
    if (d.decision === "WAIT" || d.discount === null) return { decision: d, bundle };
    // 5. permission
    if (!agent.autonomous) {
      const reason = "Autonomous bidding is off; bid not submitted";
      await recordEvent(agent.id, "DECISION", label, reason, { decision: "BID", discount: d.discount.toString(), payout, needsApproval: true, round: snap.round });
      if (agent.status !== "PAUSED") {
        await recordEvent(agent.id, "PAUSED", "Agent paused", "Needs your approval");
        await setAgentStatus(agent.id, { status: "PAUSED", statusReason: "Needs your approval", lastBid: d.discount.toString() });
      }
      return { decision: d, bundle };
    }
    // 6. VALIDATE (risk guard)
    const w = demoWallet(agent.member);
    const [member, balance] = await Promise.all([getMember(agent.circleId, agent.member), provider.getBalance(agent.member)]);
    const risk = riskGuard({
      discount: d.discount, maxDiscount: BigInt(agent.maxDiscount), maxDiscountPct: agent.maxDiscountPct, agentCircleId: agent.circleId,
      agentStatus: agent.status, autonomous: agent.autonomous, expiresAt: agent.expiresAt,
      circleId: snap.circleId, round: snap.round, auctionStatus: snap.status, expectedPot: potOf(round), contractMaxDiscount: round.maxDiscount, bestDiscount: round.bestDiscount,
      decisionRound: snap.round, isDemoWallet: w !== null, balance,
      member: { joined: member.joined, hasWon: member.hasWon, removed: member.removed, paidThisRound: member.paidThisRound }, nowSec: nowSec(),
    });
    if (!risk.allowed) {
      const copy = RISK_COPY[risk.reason];
      await recordEvent(agent.id, "RISK_BLOCKED", `Risk guard blocked: ${risk.reason}`, copy, { reason: risk.reason, detail: risk.detail, discount: d.discount.toString(), round: snap.round });
      if (risk.reason.startsWith("MAX_")) { await finish(agent, "Your maximum has been reached"); }
      else await setAgentStatus(agent.id, { lastDecision: "WAIT", lastReason: copy });
      return { decision: { ...d, decision: "WAIT", discount: null, reasonCode: risk.reason, reason: copy }, bundle };
    }
    await recordEvent(agent.id, "RISK_PASSED", "Risk guard passed", `Bid of ${asMst(d.discount)} is within your limits and the circle rules.`, { discount: d.discount.toString(), round: snap.round, checks: 12 });
    // 7-8. BID + VERIFY
    await execute(agent, d.discount, snap, round);
    return { decision: d, bundle };
  } finally {
    running.delete(agent.id);
  }
}

async function tick(): Promise<void> {
  if (!isConfigured()) return;
  for (const agent of await activeBidAgents()) {
    try { await tickAgent(agent); }
    catch (e) { console.error(`[aiBidding] agent ${agent.id}: ${errorMessage(e)}`); }
  }
}

/** Runs one forced evaluation for an agent by id (used by POST /ai/bidding/evaluate). */
export async function evaluateNow(agentId: string): Promise<{ decision: Decision; bundle: SnapshotBundle } | null> {
  const agent = await getBidAgent(agentId);
  if (!agent) return null;
  return tickAgent(agent, true);
}
export function isRunning(agentId: string): boolean { return running.has(agentId); }
export function forgetAgent(agentId: string): void { mem.delete(agentId); }

export function startAiBidding(): void {
  console.log(`[aiBidding] crew ${crewConfigured() ? "configured" : "not configured (deterministic fallback only)"}`);
  loop("aiBidding", TICK_MS, tick);
}
