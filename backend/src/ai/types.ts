/** v4 shared shapes: auction snapshot (GET /auction/:id), strategy sent to the crew, and the crew's decision. */

export type AuctionStatus = "CONTRIBUTION" | "BIDDING" | "SETTLING" | "INACTIVE";

/** Wire shape of GET /auction/:circleId (wei as strings, MST as numbers). */
export interface AuctionSnapshot {
  circleId: number; round: number; roundsTotal: number; status: AuctionStatus;
  expectedPot: string; collected: string; maxDiscount: string; bestDiscount: string;
  bestBidder: string | null; bestBidderLabel: string | null; bestPayout: string;
  biddingDeadline: number; contributionDeadline: number; secondsRemaining: number; bidCount: number;
  expectedPotMst: number; collectedMst: number; maxDiscountMst: number; bestDiscountMst: number; bestPayoutMst: number;
  nowSec: number;
}

export type Level = "low" | "medium" | "high";
/** What the crew receives as `strategy` (MST numbers, never wei, never keys). */
export interface StrategyBrief {
  agentId: string; circleId: number; member: string; goal: string;
  desiredPayoutMst: number | null; maxDiscountMst: number; maxDiscountPct: number;
  urgency: Level; riskTolerance: Level; expiresAt: number | null; autonomous: boolean;
}

export type DecisionKind = "WAIT" | "BID" | "STOP";
export interface Decision {
  decision: DecisionKind;
  /** Discount to offer, in wei; null unless decision === "BID". */
  discount: bigint | null;
  reasonCode: string;
  reason: string;
  confidence: number;
  source: "crew" | "fallback";
  analyst: Record<string, unknown> | null;
}
/** Decision as returned over HTTP (bigint → string). */
export interface DecisionApi extends Omit<Decision, "discount"> { discount: string | null; discountMst: number | null; payout: string | null }
export function decisionToApi(d: Decision, expectedPot: bigint): DecisionApi {
  const payout = d.discount === null ? null : (d.discount >= expectedPot ? 0n : expectedPot - d.discount).toString();
  return { ...d, discount: d.discount === null ? null : d.discount.toString(), discountMst: d.discount === null ? null : Number(d.discount) / 1e18, payout };
}
