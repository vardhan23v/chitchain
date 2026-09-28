/**
 * Deterministic guardrails around the LLM's bid plan. Pure: no I/O, so it is unit-testable.
 * The LLM only proposes; these rules decide what is actually allowed on-chain.
 *
 * v2 vocabulary: a bid is a DISCOUNT (wei) taken off the expected pot; the "lowest accepted payout" is
 * expectedPot − bestDiscount, i.e. what the current best bidder is willing to walk away with.
 */
import { formatEther } from "ethers";

export type Level = "low" | "medium" | "high";
export interface Plan { bidThisRound: boolean; discountPct: number; reason: string }
export interface RoundFacts {
  expectedPot: bigint; maxDiscount: bigint; bestDiscount: bigint;
  eligible: boolean; isBestBidder: boolean; roundOpen: boolean;
  mandateMaxPct: number | null;
  /** Mandate fields (v2). All optional; absent → previous behaviour (urgency words in the goal). */
  desiredPayout?: bigint | null; urgency?: Level | null; riskTolerance?: Level | null;
}
export interface Decision { bid: bigint | null; reason: string; source: "llm" | "fallback" }

export const URGENCY = /\b(need|urgent|urgently|now|this month|before|deadline|asap|immediately|soon|emergency)\b/i;
export function isUrgent(goal: string): boolean { return URGENCY.test(goal); }

/** Low risk tolerance: never give up more than this share of the pot. */
export const LOW_RISK_CAP_PCT = 10;

export function pctOfPot(pot: bigint, pct: number): bigint {
  const bps = BigInt(Math.round(Math.max(0, pct) * 100)); // 2-decimal precision
  return (pot * bps) / 10_000n;
}
export function asPct(amount: bigint, pot: bigint): string {
  return pot === 0n ? "0%" : `${(Number((amount * 10_000n) / pot) / 100).toFixed(2)}%`;
}
/** Wei → "0.45 MST" (trailing zeros trimmed, at most 4 decimals). */
export function asMst(wei: bigint): string {
  const s = formatEther(wei);
  const [i, f = ""] = s.split(".");
  const frac = f.slice(0, 4).replace(/0+$/, "");
  return `${i}${frac ? `.${frac}` : ""} MST`;
}
/** expectedPot − discount, floored at 0. */
export function payoutFor(f: Pick<RoundFacts, "expectedPot">, discount: bigint): bigint {
  return discount >= f.expectedPot ? 0n : f.expectedPot - discount;
}
export function lowestAcceptedPayout(f: Pick<RoundFacts, "expectedPot" | "bestDiscount">): bigint { return payoutFor(f, f.bestDiscount); }

/** Effective cap: contract max ∧ member's stated max (% of pot) ∧ 10 % of pot when risk tolerance is low. */
export function effectiveCap(f: RoundFacts): bigint {
  let cap = f.maxDiscount;
  if (f.mandateMaxPct !== null) { const c = pctOfPot(f.expectedPot, f.mandateMaxPct); if (c < cap) cap = c; }
  if (f.riskTolerance === "low") { const c = pctOfPot(f.expectedPot, LOW_RISK_CAP_PCT); if (c < cap) cap = c; }
  return cap;
}

export function decideBid(f: RoundFacts, plan: Plan | null, goal: string): Decision {
  const src: Decision["source"] = plan ? "llm" : "fallback";
  if (!f.roundOpen) return { bid: null, reason: "Bidding for this round is closed; waiting for settlement.", source: src };
  if (!f.eligible) return { bid: null, reason: "Not eligible to bid this round (already won, removed, or not a member).", source: src };
  if (f.isBestBidder) return { bid: null, reason: `Already the best bidder this round (lowest accepted payout ${asMst(lowestAcceptedPayout(f))}); no need to outbid myself.`, source: src };
  const cap = effectiveCap(f);
  const minPayout = payoutFor(f, cap);

  if (plan) {
    if (!plan.bidThisRound) return { bid: null, reason: plan.reason, source: "llm" };
    let discount = pctOfPot(f.expectedPot, plan.discountPct);
    if (discount > cap) discount = cap;
    if (discount <= f.bestDiscount) {
      const bump = f.bestDiscount + pctOfPot(f.expectedPot, 1);
      if (bump > cap) {
        return { bid: null, reason: `${plan.reason} — but the lowest accepted payout is already ${asMst(lowestAcceptedPayout(f))}, at or below my floor of ${asMst(minPayout)}, so I skip.`, source: "llm" };
      }
      discount = bump;
    }
    return { bid: discount, reason: plan.reason, source: "llm" };
  }

  // No LLM: desired payout → discount = pot − desired (must beat the best bid); urgency → best + 5 % of pot; otherwise sit out.
  if (f.desiredPayout !== null && f.desiredPayout !== undefined) {
    let discount = f.expectedPot > f.desiredPayout ? f.expectedPot - f.desiredPayout : 0n;
    if (discount > cap) discount = cap;
    if (discount <= f.bestDiscount) {
      return {
        bid: null,
        reason: `The lowest accepted payout is already ${asMst(lowestAcceptedPayout(f))}, at or below your desired ${asMst(f.desiredPayout)} (my floor is ${asMst(minPayout)}); skipping this round.`,
        source: "fallback",
      };
    }
    return {
      bid: discount,
      reason: `I bid a ${asMst(discount)} discount so the lowest accepted payout becomes ${asMst(payoutFor(f, discount))} of the ${asMst(f.expectedPot)} pot, matching your desired payout of ${asMst(f.desiredPayout)}.`,
      source: "fallback",
    };
  }
  const urgent = f.urgency === "high" || isUrgent(goal);
  if (!urgent) {
    return { bid: null, reason: `Goal is not urgent; skipping this round to earn dividends (lowest accepted payout now ${asMst(lowestAcceptedPayout(f))}).`, source: "fallback" };
  }
  let discount = f.bestDiscount + pctOfPot(f.expectedPot, 5);
  if (discount > cap) discount = cap;
  if (discount <= f.bestDiscount) {
    return { bid: null, reason: `Goal is urgent, but the lowest accepted payout (${asMst(lowestAcceptedPayout(f))}) is already at my floor of ${asMst(minPayout)}; skipping.`, source: "fallback" };
  }
  return {
    bid: discount,
    reason: `Goal sounds urgent, so I bid a ${asMst(discount)} discount (best + 5 % of pot): lowest accepted payout ${asMst(payoutFor(f, discount))} of ${asMst(f.expectedPot)}.`,
    source: "fallback",
  };
}
