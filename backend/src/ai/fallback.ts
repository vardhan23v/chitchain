/**
 * Deterministic fallback decision used when the crew service is unreachable, times out, or returns garbage.
 * Pure (no I/O). Port of the v2 guardrails logic to the v4 strategy vocabulary:
 *   desired payout → discount = pot − desired; urgency high → best + 5 % of pot; low → wait unless < 25 % of the
 *   bidding window remains; never above the caps (agent max wei, agent max %, contract max).
 * Also clamps a crew proposal so Node never trusts a number it did not check.
 */
import { formatEther } from "ethers";
import { pctOfPot } from "./riskGuard";
import type { Decision, DecisionKind } from "./types";

export interface FallbackStrategy {
  desiredPayout: bigint | null; maxDiscount: bigint; maxDiscountPct: number; urgency: string; riskTolerance: string;
}
export interface FallbackAuction {
  status: string; expectedPot: bigint; bestDiscount: bigint; contractMaxDiscount: bigint;
  /** seconds until bidding closes / full bidding window length */
  secondsRemaining: number; biddingWindowSec: number;
}

/** Wei → "0.45 MST". */
export function asMst(wei: bigint): string {
  const [i, f = ""] = formatEther(wei).split(".");
  const frac = f.slice(0, 4).replace(/0+$/, "");
  return `${i}${frac ? `.${frac}` : ""} MST`;
}
/** The strictest cap that applies to this agent in this round. */
export function capFor(s: Pick<FallbackStrategy, "maxDiscount" | "maxDiscountPct" | "riskTolerance">, a: Pick<FallbackAuction, "expectedPot" | "contractMaxDiscount">): bigint {
  let cap = s.maxDiscount;
  const pct = pctOfPot(a.expectedPot, s.maxDiscountPct);
  if (pct < cap) cap = pct;
  if (a.contractMaxDiscount < cap) cap = a.contractMaxDiscount;
  if (s.riskTolerance === "low") { const c = pctOfPot(a.expectedPot, 10); if (c < cap) cap = c; }
  return cap;
}
/** Smallest discount that beats the current best: best + 1 % of pot (at least 1 wei above). */
export function minWinning(a: Pick<FallbackAuction, "expectedPot" | "bestDiscount">): bigint {
  const bump = pctOfPot(a.expectedPot, 1);
  return a.bestDiscount + (bump > 0n ? bump : 1n);
}
const payout = (pot: bigint, d: bigint): bigint => (d >= pot ? 0n : pot - d);
const make = (decision: DecisionKind, discount: bigint | null, reasonCode: string, reason: string, confidence: number): Decision =>
  ({ decision, discount, reasonCode, reason, confidence, source: "fallback", analyst: null });

export function fallbackDecide(s: FallbackStrategy, a: FallbackAuction): Decision {
  if (a.status !== "BIDDING") return make("WAIT", null, "NOT_BIDDING", "Bidding is not open yet; waiting.", 1);
  const cap = capFor(s, a);
  const floor = minWinning(a);
  if (floor > cap) {
    return make("STOP", null, "MAX_REACHED", `The current best discount (${asMst(a.bestDiscount)}) is already at or above your maximum (${asMst(cap)}); the agent cannot bid within your limits.`, 1);
  }
  const fraction = a.biddingWindowSec > 0 ? a.secondsRemaining / a.biddingWindowSec : 0;
  const nearEnd = fraction < 0.25;

  if (s.desiredPayout !== null) {
    let discount = a.expectedPot > s.desiredPayout ? a.expectedPot - s.desiredPayout : 0n;
    if (discount > cap) {
      return make("STOP", null, "PAYOUT_UNREACHABLE", `Reaching a payout of ${asMst(s.desiredPayout)} would need a ${asMst(discount)} discount, above your maximum of ${asMst(cap)}.`, 1);
    }
    if (discount < floor) {
      if (s.urgency === "high" || nearEnd) {
        discount = floor;
      } else {
        return make("WAIT", null, "PAYOUT_ACCEPTABLE", `The lowest accepted payout is ${asMst(payout(a.expectedPot, a.bestDiscount))}, at or below your desired ${asMst(s.desiredPayout)}; waiting for a better moment.`, 0.8);
      }
    }
    return make("BID", discount, "DESIRED_PAYOUT", `Bidding a ${asMst(discount)} discount so the payout becomes ${asMst(payout(a.expectedPot, discount))} of the ${asMst(a.expectedPot)} pot.`, 0.8);
  }
  if (s.urgency === "high") {
    let discount = a.bestDiscount + pctOfPot(a.expectedPot, 5);
    if (discount > cap) discount = cap;
    if (discount < floor) discount = floor;
    return make("BID", discount, "URGENT", `High urgency: bidding a ${asMst(discount)} discount (best + 5 % of pot) for a payout of ${asMst(payout(a.expectedPot, discount))}.`, 0.75);
  }
  if (s.urgency === "low" && !nearEnd) {
    return make("WAIT", null, "LOW_URGENCY", `Low urgency and ${Math.round(fraction * 100)} % of the bidding window remains; waiting.`, 0.8);
  }
  if (!nearEnd) return make("WAIT", null, "TIME_REMAINS", `${Math.round(fraction * 100)} % of the bidding window remains; waiting for rivals to show their hand.`, 0.7);
  return make("BID", floor, "NEAR_EXPIRY", `Bidding closes soon: offering the smallest winning discount, ${asMst(floor)}, for a payout of ${asMst(payout(a.expectedPot, floor))}.`, 0.7);
}

/**
 * Clamps a crew proposal into the agent's limits. Never raises a bid above the caps; a BID that cannot beat the
 * best within the caps becomes STOP (MAX_REACHED). A BID with no amount becomes WAIT.
 */
export function clampDecision(d: Decision, s: FallbackStrategy, a: FallbackAuction): Decision {
  if (d.decision !== "BID") return { ...d, discount: null };
  if (d.discount === null || d.discount <= 0n) return { ...d, decision: "WAIT", discount: null, reasonCode: "NO_AMOUNT", reason: `${d.reason} (no bid amount was proposed)` };
  const cap = capFor(s, a);
  const floor = minWinning(a);
  if (floor > cap) return { ...d, decision: "STOP", discount: null, reasonCode: "MAX_REACHED", reason: `The current best discount (${asMst(a.bestDiscount)}) is already at or above your maximum (${asMst(cap)}).` };
  let discount = d.discount;
  if (discount > cap) discount = cap;
  if (discount < floor) discount = floor;
  return { ...d, discount };
}
