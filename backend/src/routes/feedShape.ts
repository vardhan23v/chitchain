import { agentLogByTx, type AgentLogRow, type EventRow, type MandateRow } from "../db";

export interface FeedEvent {
  id: number; circleId: number | null; round: number | null; name: string;
  args: Record<string, string | number | boolean>; txHash: string; logIndex: number; block: number; ts: number;
  agent: { reason: string; member: string } | null;
}

/**
 * DB row → API FeedEvent; BidPlaced rows whose tx matches an agent log carry the agent's reason.
 * DefaultDetected args keep their wei strings and gain `partial` (collateral did not cover the whole contribution → member removed).
 * The frontend maps event names to display text.
 */
export async function eventRowToFeed(r: EventRow): Promise<FeedEvent> {
  let agent: FeedEvent["agent"] = null;
  if (r.name === "BidPlaced") {
    const log = await agentLogByTx(r.tx_hash);
    if (log) agent = { reason: log.reason, member: log.member };
  }
  const args = JSON.parse(r.args_json) as Record<string, string | number | boolean>;
  if (r.name === "DefaultDetected") {
    const required = BigInt(String(args.required ?? "0"));
    const fromCollateral = BigInt(String(args.fromCollateral ?? "0"));
    args.partial = fromCollateral < required;
  }
  return { id: r.id, circleId: r.circle_id, round: r.round, name: r.name, args, txHash: r.tx_hash, logIndex: r.log_index, block: r.block, ts: r.ts, agent };
}

export interface AgentLog {
  id: number; circleId: number; round: number; member: string; agentWallet: string; bidThisRound: boolean;
  discount: string; reason: string; source: "llm" | "fallback"; txHash: string | null; error: string | null; ts: number;
}
export function agentLogToApi(r: AgentLogRow): AgentLog {
  return {
    id: r.id, circleId: r.circle_id, round: r.round, member: r.member, agentWallet: r.agent_wallet,
    bidThisRound: r.bid_this_round === 1, discount: r.discount, reason: r.reason,
    source: r.source === "llm" ? "llm" : "fallback", txHash: r.tx_hash, error: r.error, ts: r.ts,
  };
}

export interface Mandate {
  circleId: number; member: string; goal: string; desiredPayout: string | null /* wei */; maxDiscountPct: number | null;
  urgency: "low" | "medium" | "high" | null; riskTolerance: "low" | "medium" | "high" | null; active: boolean; createdAt: number;
}
export function mandateToApi(r: MandateRow): Mandate {
  return {
    circleId: r.circle_id, member: r.member, goal: r.goal, desiredPayout: r.desired_payout, maxDiscountPct: r.max_discount_pct,
    urgency: r.urgency, riskTolerance: r.risk_tolerance, active: r.active === 1, createdAt: r.created_at,
  };
}

// ───────────── v2 shapes shared by /circles/:id, /circles/:id/defaults, /members/:addr/circles ─────────────
export type ContributionStatus = "PAID" | "PENDING" | "COVERED_BY_COLLATERAL" | "PARTIALLY_COVERED" | "DEFAULTED";
export interface DefaultInfo {
  round: number; required: string; fromCollateral: string; fromReserve: string; shortfall: string; remainingCollateral: string;
  status: "COVERED_BY_COLLATERAL" | "PARTIALLY_COVERED"; potFullyFunded: boolean; txHash: string; ts: number;
}
/** Builds a DefaultInfo from an indexed DefaultDetected row; `remainingCollateral` is the member's collateral as read now. */
export function defaultInfoFrom(r: EventRow, remainingCollateral: bigint): DefaultInfo & { member: string } {
  const a = JSON.parse(r.args_json) as Record<string, string | number | boolean>;
  const required = String(a.required ?? "0");
  const fromCollateral = String(a.fromCollateral ?? "0");
  const shortfall = String(a.shortfall ?? "0");
  return {
    member: String(a.member ?? ""), round: r.round ?? Number(a.round ?? 0),
    required, fromCollateral, fromReserve: String(a.fromReserve ?? "0"), shortfall, remainingCollateral: remainingCollateral.toString(),
    status: BigInt(fromCollateral) >= BigInt(required) ? "COVERED_BY_COLLATERAL" : "PARTIALLY_COVERED",
    potFullyFunded: BigInt(shortfall) === 0n, txHash: r.tx_hash, ts: r.ts,
  };
}
