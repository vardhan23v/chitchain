import { z } from "zod";
import { contractAs, demoWallet, errorMessage, getCircle, getMember, getMembers, getRound, isConfigured, preflight, roundPhase, sendTx, type Tier } from "../chain";
import { activeMandates, agentLogForRound, insertAgentLog, type AgentLogRow, type MandateRow } from "../db";
import { auditSystem } from "../auth/audit";
import { chatJSON } from "../llm";
import { asMst, asPct, decideBid, effectiveCap, lowestAcceptedPayout, type Plan, type RoundFacts } from "./guardrails";

export const AGENT_ONLY_DEMO = "agent only available for custodial demo wallets";

const planSchema = z.object({
  bidThisRound: z.boolean(),
  discountPct: z.number().min(0).max(100), // guardrails clamp to the real cap
  reason: z.string().min(1).max(400),
});

const inFlight = new Set<string>(); // `${circleId}:${member}` while a decision/tx is running

interface PromptCtx { round: number; roundsLeft: number; tier: Tier; secondsLeft: number; phase: "contribution" | "bidding" | "settling"; collected: bigint }
function prompt(m: MandateRow, facts: RoundFacts, ctx: PromptCtx): string {
  const capPct = asPct(effectiveCap(facts), facts.expectedPot);
  return [
    "You are a bidding agent in an on-chain chit fund (rotating savings circle) on the MST testnet (currency: MST).",
    "Each round every member pays a contribution into the pot. Members bid a DISCOUNT: the share of the pot they give up to the others as dividends.",
    "The largest discount wins the pot now (payout = pot − discount, minus a small fee and a holdback released at the end).",
    "Bidding higher wins sooner but costs more; not bidding earns dividends and waits. Members who already won cannot bid again.",
    "",
    `Member goal (verbatim): "${m.goal}"`,
    `Desired payout: ${m.desired_payout ? asMst(BigInt(m.desired_payout)) : "not stated"}. Urgency: ${m.urgency ?? "not stated"}. Risk tolerance: ${m.risk_tolerance ?? "not stated"}.`,
    `Member's own max discount: ${m.max_discount_pct ?? "none"}%.${facts.riskTolerance === "low" ? " Low risk tolerance caps the discount at 10% of the pot." : ""}`,
    "",
    `Round ${ctx.round}; rounds left including this one: ${ctx.roundsLeft}.`,
    `Phase: ${ctx.phase}${ctx.phase === "contribution" ? " (contributions still open, pot may grow)" : " (contributions closed, pot is final)"}; seconds until bidding closes: ${ctx.secondsLeft}.`,
    `Expected pot: ${asMst(facts.expectedPot)} (collected so far ${asMst(ctx.collected)}).`,
    `Current best discount: ${asMst(facts.bestDiscount)} (${asPct(facts.bestDiscount, facts.expectedPot)} of pot) → current lowest accepted payout: ${asMst(lowestAcceptedPayout(facts))}.`,
    `Max discount allowed for this member: ${asMst(effectiveCap(facts))} (${capPct} of pot; contract max ${asPct(facts.maxDiscount, facts.expectedPot)}).`,
    "A bid must be STRICTLY higher than the current best discount to count.",
    "",
    "Decide for THIS round only. Reply with JSON exactly like:",
    `{"bidThisRound": true|false, "discountPct": <number 0-${capPct.replace("%", "")}, % of pot>, "reason": "<one or two plain sentences addressed to the member, amounts in MST, mention the lowest accepted payout>"}`,
  ].join("\n");
}

/**
 * Plan and (if allowed) bid for one mandate in the current round. Always logs a decision.
 * `force` re-plans even if a decision for this round was already logged (mandate update / bidding-only window).
 */
export async function decideForMandate(m: MandateRow, force = false): Promise<AgentLogRow | null> {
  const wallet = demoWallet(m.member);
  if (!wallet) throw new Error(AGENT_ONLY_DEMO); // custodial demo wallet required
  const key = `${m.circle_id}:${m.member.toLowerCase()}`;
  if (inFlight.has(key)) return null;
  inFlight.add(key);
  try {
    const [circle, round, member, members] = await Promise.all([
      getCircle(m.circle_id), getRound(m.circle_id), getMember(m.circle_id, m.member), getMembers(m.circle_id),
    ]);
    if (circle.status !== 1) return null;
    if (!force && (await agentLogForRound(m.circle_id, round.round, m.member))) return null; // one decision per round
    const states = await Promise.all(members.map((a) => getMember(m.circle_id, a)));
    const roundsLeft = states.filter((s) => !s.removed && !s.hasWon).length;
    const nowSec = Math.floor(Date.now() / 1000);
    const phase = roundPhase(round, nowSec);
    const facts: RoundFacts = {
      expectedPot: round.expectedPot, maxDiscount: round.maxDiscount, bestDiscount: round.bestDiscount,
      eligible: member.joined && !member.removed && !member.hasWon,
      isBestBidder: round.bestBidder.toLowerCase() === m.member.toLowerCase(),
      roundOpen: nowSec < round.deadline, mandateMaxPct: m.max_discount_pct,
      desiredPayout: m.desired_payout ? BigInt(m.desired_payout) : null, urgency: m.urgency, riskTolerance: m.risk_tolerance,
    };
    let plan: Plan | null = null;
    if (facts.eligible && facts.roundOpen && !facts.isBestBidder) {
      const ctx: PromptCtx = { round: round.round, roundsLeft, tier: member.tier, secondsLeft: round.deadline - nowSec, phase, collected: round.collected };
      plan = await chatJSON(prompt(m, facts, ctx), planSchema, { timeoutMs: 8000 });
    }
    const d = decideBid(facts, plan, m.goal);
    const base = { circleId: m.circle_id, round: round.round, member: wallet.address, agentWallet: wallet.address, source: d.source };

    if (d.bid === null) {
      console.log(`[agent] circle ${m.circle_id} round ${round.round} ${wallet.label}: skip — ${d.reason}`);
      return insertAgentLog({ ...base, bidThisRound: false, discount: 0n, reason: d.reason, txHash: null, error: null });
    }
    const contract = contractAs(wallet.wallet); // custodial demo wallet — bid from the member's own key
    try {
      await preflight(contract, "placeBid", [m.circle_id, d.bid]); // never send a bid that would revert
      const rc = await sendTx(`agent ${wallet.label} circle ${m.circle_id} round ${round.round}`, wallet.wallet, () => contract.placeBid(m.circle_id, d.bid));
      auditSystem("AGENT", "agent.bid", `circle:${m.circle_id}`, "ok", rc.hash, { round: round.round, member: wallet.address, label: wallet.label, discount: d.bid.toString(), source: d.source });
      return insertAgentLog({ ...base, bidThisRound: true, discount: d.bid, reason: d.reason, txHash: rc.hash, error: null });
    } catch (e) {
      const err = errorMessage(e);
      console.error(`[agent] circle ${m.circle_id} round ${round.round} ${wallet.label}: bid failed: ${err}`);
      auditSystem("AGENT", "agent.bid", `circle:${m.circle_id}`, "failed", null, { round: round.round, member: wallet.address, label: wallet.label, discount: d.bid.toString(), error: err });
      return insertAgentLog({ ...base, bidThisRound: true, discount: d.bid, reason: d.reason, txHash: null, error: err });
    }
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Re-plan for every active mandate in a circle.
 * `trigger` "round": after CircleStarted / RoundSettled (one decision per round unless forced).
 * `trigger` "bidding": the contribution phase just ended — plan once more against the final pot (forced, once per round by the keeper).
 */
export async function planRound(circleId: number, trigger: "round" | "bidding" = "round"): Promise<void> {
  if (!isConfigured()) return;
  for (const m of await activeMandates(circleId)) {
    try {
      await decideForMandate(m, trigger === "bidding");
    } catch (e) {
      console.error(`[agent] circle ${circleId} member ${m.member}: ${errorMessage(e)}`);
    }
  }
}
