/**
 * Deterministic guardrails around the LLM's bid plan. Pure: no I/O, so it is unit-testable.
 * The LLM only proposes; these rules decide what is actually allowed on-chain.
 */
export interface Plan { bidThisRound: boolean; discountPct: number; reason: string }
export interface RoundFacts {
  expectedPot: bigint; maxDiscount: bigint; bestDiscount: bigint;
  eligible: boolean; isBestBidder: boolean; roundOpen: boolean;
  mandateMaxPct: number | null;
}
export interface Decision { bid: bigint | null; reason: string; source: "llm" | "fallback" }

export const URGENCY = /\b(need|urgent|urgently|now|this month|before|deadline|asap|immediately|soon|emergency)\b/i;
export function isUrgent(goal: string): boolean { return URGENCY.test(goal); }

export function pctOfPot(pot: bigint, pct: number): bigint {
  const bps = BigInt(Math.round(Math.max(0, pct) * 100)); // 2-decimal precision
  return (pot * bps) / 10_000n;
}
export function asPct(amount: bigint, pot: bigint): string {
  return pot === 0n ? "0%" : `${(Number((amount * 10_000n) / pot) / 100).toFixed(2)}%`;
}

/** Effective cap: contract max (40% of pot) ∧ member's stated max (% of pot), if any. */
export function effectiveCap(f: RoundFacts): bigint {
  const contractCap = f.maxDiscount;
  if (f.mandateMaxPct === null) return contractCap;
  const memberCap = pctOfPot(f.expectedPot, f.mandateMaxPct);
  return memberCap < contractCap ? memberCap : contractCap;
}

export function decideBid(f: RoundFacts, plan: Plan | null, goal: string): Decision {
  if (!f.roundOpen) return { bid: null, reason: "Round is closed; waiting for settlement.", source: plan ? "llm" : "fallback" };
  if (!f.eligible) return { bid: null, reason: "Not eligible to bid this round (already won, removed, or not a member).", source: plan ? "llm" : "fallback" };
  if (f.isBestBidder) return { bid: null, reason: "Already the highest bidder this round; no need to outbid myself.", source: plan ? "llm" : "fallback" };
  const cap = effectiveCap(f);

  if (plan) {
    if (!plan.bidThisRound) return { bid: null, reason: plan.reason, source: "llm" };
    let discount = pctOfPot(f.expectedPot, plan.discountPct);
    if (discount > cap) discount = cap;
    if (discount <= f.bestDiscount) {
      const bump = f.bestDiscount + pctOfPot(f.expectedPot, 1);
      if (bump > cap) {
        return { bid: null, reason: `${plan.reason} — but the current best bid (${asPct(f.bestDiscount, f.expectedPot)} of pot) is already at or above my limit (${asPct(cap, f.expectedPot)}), so I skip.`, source: "llm" };
      }
      discount = bump;
    }
    return { bid: discount, reason: plan.reason, source: "llm" };
  }

  // No LLM: urgency words → bestDiscount + 5% of pot (clamped); otherwise sit out.
  if (!isUrgent(goal)) {
    return { bid: null, reason: "Goal is not urgent; skipping this round to keep the pot (and dividends) intact.", source: "fallback" };
  }
  let discount = f.bestDiscount + pctOfPot(f.expectedPot, 5);
  if (discount > cap) discount = cap;
  if (discount <= f.bestDiscount) {
    return { bid: null, reason: `Goal is urgent, but the best bid (${asPct(f.bestDiscount, f.expectedPot)} of pot) already meets my limit (${asPct(cap, f.expectedPot)}); skipping.`, source: "fallback" };
  }
  return { bid: discount, reason: `Goal sounds urgent, so I bid ${asPct(discount, f.expectedPot)} of the pot (best + 5%) to win this round.`, source: "fallback" };
}
