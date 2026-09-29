import type { CircleSummary, MemberInfo, Tier } from "@/lib/types";

/** Contract `_coveragePct`: share of a winner's remaining dues that must stay locked (Low 50 %, Medium 75 %, else 100 %). */
function coveragePct(tier: Tier): bigint {
  return tier === 1 ? 50n : tier === 2 ? 75n : 100n;
}

export interface PayoutPreview {
  pot: bigint;
  fee: bigint;
  discount: bigint;
  /** locked with the winner's collateral until the circle completes */
  holdback: bigint;
  /** claimable right after settlement */
  now: bigint;
  /** now + holdback: everything the winner eventually receives from this pot */
  total: bigint;
}

/**
 * Mirrors ChitChain v2.2 `_settle` + `_applyHoldback` for a would-be winner, from contract state the room already has:
 * payout = pot − fee − discount; holdback = min(payout, max(tier coverage gap, payout × holdbackBps)). Read-only preview;
 * the contract computes the real numbers at settlement.
 */
export function previewPayout(
  circle: Pick<CircleSummary, "contribution" | "feeBps" | "holdbackBps">,
  members: Pick<MemberInfo, "address" | "joined" | "removed" | "hasWon" | "tier" | "collateral">[],
  winner: string,
  pot: bigint,
  discount = 0n
): PayoutPreview {
  const fee = (pot * BigInt(circle.feeBps)) / 10_000n;
  let payout = pot - fee - discount;
  if (payout < 0n) payout = 0n;
  const w = members.find((m) => m.address.toLowerCase() === winner.toLowerCase());
  const eligibleAfter = members.filter((m) => m.joined && !m.removed && !m.hasWon && m.address.toLowerCase() !== winner.toLowerCase()).length;
  let holdback = 0n;
  if (w) {
    const owed = BigInt(circle.contribution) * BigInt(eligibleAfter);
    const required = (owed * coveragePct(w.tier)) / 100n;
    const collateral = BigInt(w.collateral);
    const tierHold = collateral < required ? required - collateral : 0n;
    const flat = (payout * BigInt(circle.holdbackBps)) / 10_000n;
    holdback = tierHold > flat ? tierHold : flat;
    if (holdback > payout) holdback = payout;
  }
  return { pot, fee, discount, holdback, now: payout - holdback, total: payout };
}
