/** Builds the public auction snapshot (GET /auction/:circleId) straight from the contract + indexed bid count. */
import { ZeroAddress, formatEther } from "ethers";
import { getCircle, getRound, labelOf, potOf, roundPhase, type CircleView, type RoundView } from "../chain";
import { countBids } from "../db";
import type { AuctionSnapshot, AuctionStatus } from "./types";

export const mst = (wei: bigint): number => Number(formatEther(wei));

export function statusOf(circle: CircleView, round: RoundView, nowSec: number): AuctionStatus {
  if (circle.status !== 1) return "INACTIVE";
  const p = roundPhase(round, nowSec);
  if (p === "contribution" || p === "closing") return "CONTRIBUTION";
  if (p === "decision") return "DECISION";
  return p === "bidding" ? "BIDDING" : "SETTLING";
}

/** Pure assembly from contract views (unit-testable); `bidCount` comes from the indexed BidPlaced rows. */
export function snapshotFrom(circleId: number, circle: CircleView, round: RoundView, bidCount: number, nowSec = Math.floor(Date.now() / 1000)): AuctionSnapshot {
  const status = statusOf(circle, round, nowSec);
  const secondsRemaining = status === "CONTRIBUTION" ? Math.max(0, round.contributionDeadline - nowSec)
    : status === "DECISION" ? Math.max(0, round.decisionDeadline - nowSec)
    : status === "BIDDING" ? Math.max(0, round.deadline - nowSec) : 0;
  const pot = potOf(round); // assembled pot once contributions closed
  const bestPayout = round.bestDiscount >= pot ? 0n : pot - round.bestDiscount;
  const hasBest = round.bestBidder !== ZeroAddress && round.bestBidder !== "";
  const hasRecipient = round.recipient !== ZeroAddress && round.recipient !== "";
  return {
    circleId, round: round.round, roundsTotal: circle.maxMembers, status,
    expectedPot: pot.toString(), collected: round.collected.toString(), maxDiscount: round.maxDiscount.toString(),
    bestDiscount: round.bestDiscount.toString(), bestBidder: hasBest ? round.bestBidder.toLowerCase() : null,
    bestBidderLabel: hasBest ? labelOf(round.bestBidder) : null, bestPayout: bestPayout.toString(),
    biddingDeadline: round.deadline, contributionDeadline: round.contributionDeadline, decisionDeadline: round.decisionDeadline, secondsRemaining, bidCount,
    recipient: hasRecipient ? round.recipient.toLowerCase() : null, recipientLabel: hasRecipient ? labelOf(round.recipient) : null,
    expectedPotMst: mst(pot), collectedMst: mst(round.collected), maxDiscountMst: mst(round.maxDiscount),
    bestDiscountMst: mst(round.bestDiscount), bestPayoutMst: mst(bestPayout), nowSec,
  };
}

export interface SnapshotBundle { snapshot: AuctionSnapshot; circle: CircleView; round: RoundView }
export async function buildSnapshot(circleId: number): Promise<SnapshotBundle> {
  const [circle, round] = await Promise.all([getCircle(circleId), getRound(circleId)]);
  const bidCount = await countBids(circleId, round.round);
  return { snapshot: snapshotFrom(circleId, circle, round, bidCount), circle, round };
}
