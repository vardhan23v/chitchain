import { z } from "zod";
import { contractAs, demoWallet, errorMessage, getCircle, getMember, getMembers, getRound, isConfigured, preflight, sendTx, type Tier } from "../chain";
import { activeMandates, agentLogForRound, insertAgentLog, type AgentLogRow, type MandateRow } from "../db";
import { chatJSON } from "../llm";
import { asPct, decideBid, type Plan, type RoundFacts } from "./guardrails";
import { formatEther } from "ethers";

export const AGENT_ONLY_DEMO = "agent only available for custodial demo wallets";

const planSchema = z.object({
  bidThisRound: z.boolean(),
  discountPct: z.number().min(0).max(100), // guardrails clamp to the real cap
  reason: z.string().min(1).max(400),
});

const inFlight = new Set<string>(); // `${circleId}:${member}` while a decision/tx is running

function prompt(m: MandateRow, facts: RoundFacts, ctx: { round: number; roundsLeft: number; tier: Tier; secondsLeft: number }): string {
  return [
    "You are a bidding agent in an on-chain chit fund (rotating savings circle).",
    "Each round every member pays a contribution; the member offering the largest DISCOUNT (a share of the pot given up to the others as dividends) wins the pot now.",
    "Bidding higher wins sooner but costs more; not bidding earns dividends and waits. Members who already won cannot bid again.",
    "",
    `Member goal (verbatim): "${m.goal}"`,
    `Round ${ctx.round}; rounds left including this one: ${ctx.roundsLeft}; seconds until this round closes: ${ctx.secondsLeft}.`,
    `Expected pot: ${formatEther(facts.expectedPot)} MSTC. Current best discount: ${asPct(facts.bestDiscount, facts.expectedPot)} of pot.`,
    `Contract max discount: 40% of pot. Member's own max: ${m.max_discount_pct ?? "none"}%.`,
    "A bid must be STRICTLY higher than the current best to count.",
    "",
    "Decide for THIS round only. Reply with JSON exactly like:",
    '{"bidThisRound": true|false, "discountPct": <number 0-40, % of pot>, "reason": "<one or two plain sentences addressed to the member>"}',
  ].join("\n");
}

/** Plan and (if allowed) bid for one mandate in the current round. Always logs a decision. */
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
    const facts: RoundFacts = {
      expectedPot: round.expectedPot, maxDiscount: round.maxDiscount, bestDiscount: round.bestDiscount,
      eligible: member.joined && !member.removed && !member.hasWon,
      isBestBidder: round.bestBidder.toLowerCase() === m.member.toLowerCase(),
      roundOpen: nowSec < round.deadline, mandateMaxPct: m.max_discount_pct,
    };
    let plan: Plan | null = null;
    if (facts.eligible && facts.roundOpen && !facts.isBestBidder) {
      plan = await chatJSON(prompt(m, facts, { round: round.round, roundsLeft, tier: member.tier, secondsLeft: round.deadline - nowSec }), planSchema, { timeoutMs: 8000 });
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
      return insertAgentLog({ ...base, bidThisRound: true, discount: d.bid, reason: d.reason, txHash: rc.hash, error: null });
    } catch (e) {
      const err = errorMessage(e);
      console.error(`[agent] circle ${m.circle_id} round ${round.round} ${wallet.label}: bid failed: ${err}`);
      return insertAgentLog({ ...base, bidThisRound: true, discount: d.bid, reason: d.reason, txHash: null, error: err });
    }
  } finally {
    inFlight.delete(key);
  }
}

/** Re-plan for every active mandate in a circle (called after CircleStarted / RoundSettled). */
export async function planRound(circleId: number): Promise<void> {
  if (!isConfigured()) return;
  for (const m of await activeMandates(circleId)) {
    try {
      await decideForMandate(m);
    } catch (e) {
      console.error(`[agent] circle ${circleId} member ${m.member}: ${errorMessage(e)}`);
    }
  }
}
