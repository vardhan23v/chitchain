import { agentLogByTx, type AgentLogRow, type EventRow, type MandateRow } from "../db";

export interface FeedEvent {
  id: number; circleId: number | null; round: number | null; name: string;
  args: Record<string, string | number | boolean>; txHash: string; logIndex: number; block: number; ts: number;
  agent: { reason: string; member: string } | null;
}

/** DB row → API FeedEvent; BidPlaced rows whose tx matches an agent log carry the agent's reason. */
export function eventRowToFeed(r: EventRow): FeedEvent {
  let agent: FeedEvent["agent"] = null;
  if (r.name === "BidPlaced") {
    const log = agentLogByTx(r.tx_hash);
    if (log) agent = { reason: log.reason, member: log.member };
  }
  return {
    id: r.id, circleId: r.circle_id, round: r.round, name: r.name,
    args: JSON.parse(r.args_json) as Record<string, string | number | boolean>,
    txHash: r.tx_hash, logIndex: r.log_index, block: r.block, ts: r.ts, agent,
  };
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

export interface Mandate { circleId: number; member: string; goal: string; maxDiscountPct: number | null; active: boolean; createdAt: number }
export function mandateToApi(r: MandateRow): Mandate {
  return { circleId: r.circle_id, member: r.member, goal: r.goal, maxDiscountPct: r.max_discount_pct, active: r.active === 1, createdAt: r.created_at };
}
