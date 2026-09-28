/**
 * v4 RISK GUARD: the deterministic gate between an AI decision and a transaction. Pure (no I/O) so every
 * reason code is unit-tested. The crew can only propose; nothing reaches `placeBid` unless this returns allowed.
 * Checks run in the documented order and the first failure wins.
 */
import type { AuctionStatus } from "./types";

export type RiskReason =
  | "MAX_BID_EXCEEDED" | "MAX_DISCOUNT_PCT_EXCEEDED" | "ABOVE_CONTRACT_MAX" | "NOT_HIGHER_THAN_BEST"
  | "AUCTION_NOT_ACTIVE" | "WRONG_CIRCLE" | "WRONG_ROUND" | "STRATEGY_EXPIRED" | "AGENT_NOT_ENABLED"
  | "WALLET_UNAUTHORIZED" | "INSUFFICIENT_BALANCE" | "NOT_ELIGIBLE";

/** 0.02 MST kept back for gas. */
export const GAS_RESERVE_WEI = 20_000_000_000_000_000n;

export interface RiskInput {
  /** proposed discount in wei */
  discount: bigint;
  /** agent limits */
  maxDiscount: bigint; maxDiscountPct: number; agentCircleId: number; agentStatus: string; autonomous: boolean; expiresAt: number | null;
  /** auction as read now */
  circleId: number; round: number; auctionStatus: AuctionStatus; expectedPot: bigint; contractMaxDiscount: bigint; bestDiscount: bigint;
  /** round the decision was computed for */
  decisionRound: number;
  /** wallet */
  isDemoWallet: boolean; balance: bigint;
  member: { joined: boolean; hasWon: boolean; removed: boolean; paidThisRound: boolean };
  nowSec: number;
  gasReserve?: bigint;
}
export type RiskResult = { allowed: true } | { allowed: false; reason: RiskReason; detail: string };

export function pctOfPot(pot: bigint, pct: number): bigint {
  const bps = BigInt(Math.round(Math.max(0, pct) * 100));
  return (pot * bps) / 10_000n;
}
const block = (reason: RiskReason, detail: string): RiskResult => ({ allowed: false, reason, detail });

/** Human copy for a blocked reason (shown in the activity log and status). */
export const RISK_COPY: Record<RiskReason, string> = {
  MAX_BID_EXCEEDED: "The proposed bid is above your maximum discount",
  MAX_DISCOUNT_PCT_EXCEEDED: "The proposed bid is above your maximum discount percentage",
  ABOVE_CONTRACT_MAX: "The proposed bid is above the circle's maximum discount",
  NOT_HIGHER_THAN_BEST: "The proposed bid does not beat the current best bid",
  AUCTION_NOT_ACTIVE: "Bidding is not open right now",
  WRONG_CIRCLE: "The decision was made for a different circle",
  WRONG_ROUND: "The decision was made for a different round",
  STRATEGY_EXPIRED: "Your strategy has expired",
  AGENT_NOT_ENABLED: "The agent is not active or autonomous bidding is off",
  WALLET_UNAUTHORIZED: "Only custodial demo wallets can bid",
  INSUFFICIENT_BALANCE: "The demo wallet does not have enough MST for gas",
  NOT_ELIGIBLE: "This wallet is not eligible to bid this round",
};

export function riskGuard(i: RiskInput): RiskResult {
  const reserve = i.gasReserve ?? GAS_RESERVE_WEI;
  if (i.discount > i.maxDiscount) return block("MAX_BID_EXCEEDED", `${i.discount} > max ${i.maxDiscount}`);
  const pctCap = pctOfPot(i.expectedPot, i.maxDiscountPct);
  if (i.discount > pctCap) return block("MAX_DISCOUNT_PCT_EXCEEDED", `${i.discount} > ${i.maxDiscountPct}% of pot (${pctCap})`);
  if (i.discount > i.contractMaxDiscount) return block("ABOVE_CONTRACT_MAX", `${i.discount} > contract max ${i.contractMaxDiscount}`);
  if (i.discount <= i.bestDiscount) return block("NOT_HIGHER_THAN_BEST", `${i.discount} <= best ${i.bestDiscount}`);
  if (i.auctionStatus !== "BIDDING") return block("AUCTION_NOT_ACTIVE", `auction status ${i.auctionStatus}`);
  if (i.circleId !== i.agentCircleId) return block("WRONG_CIRCLE", `circle ${i.circleId} != agent circle ${i.agentCircleId}`);
  if (i.decisionRound !== i.round) return block("WRONG_ROUND", `decision round ${i.decisionRound} != current round ${i.round}`);
  if (i.expiresAt !== null && i.nowSec > i.expiresAt) return block("STRATEGY_EXPIRED", `expired at ${i.expiresAt}`);
  if (i.agentStatus !== "ACTIVE" || !i.autonomous) return block("AGENT_NOT_ENABLED", `status ${i.agentStatus}, autonomous ${i.autonomous}`);
  if (!i.isDemoWallet) return block("WALLET_UNAUTHORIZED", "member is not a custodial demo wallet");
  if (i.balance < reserve) return block("INSUFFICIENT_BALANCE", `balance ${i.balance} < reserve ${reserve}`);
  if (!i.member.joined || i.member.hasWon || i.member.removed || !i.member.paidThisRound) {
    return block("NOT_ELIGIBLE", `joined=${i.member.joined} hasWon=${i.member.hasWon} removed=${i.member.removed} paidThisRound=${i.member.paidThisRound}`);
  }
  return { allowed: true };
}
