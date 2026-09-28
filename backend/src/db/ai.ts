/**
 * v4: BidAgent + AgentEvent persistence (autonomous AI bidding). Rows are returned as-is from Prisma
 * (camelCase, wei as decimal strings) because that is exactly the API shape in the contract.
 */
import type { AgentEvent as PAgentEvent, BidAgent as PBidAgent, Prisma } from "@prisma/client";
import { prisma } from "./client";
import { now } from "./auth";

export type BidAgentStatus = "ACTIVE" | "PAUSED" | "STOPPED" | "DONE" | "ERROR";
export type AgentEventKind =
  | "REFRESH" | "BID_SEEN" | "EVALUATED" | "DECISION" | "RISK_PASSED" | "RISK_BLOCKED"
  | "TX_SUBMITTED" | "TX_CONFIRMED" | "TX_FAILED" | "PAUSED" | "STOPPED" | "DONE" | "RIVAL_BID" | "INFO";

export type BidAgentApi = PBidAgent;
export interface AgentEventApi {
  id: number; agentId: string; ts: number; kind: string; text: string; reason: string | null; data: Record<string, unknown> | null;
}
const toEventApi = (e: PAgentEvent): AgentEventApi => ({
  id: e.id, agentId: e.agentId, ts: e.ts, kind: e.kind, text: e.text, reason: e.reason,
  data: e.data && typeof e.data === "object" && !Array.isArray(e.data) ? (e.data as Record<string, unknown>) : null,
});

export interface NewBidAgent {
  userWallet: string; circleId: number; member: string; goal: string; desiredPayout: bigint | null; maxDiscount: bigint; maxDiscountPct: number;
  urgency: string; riskTolerance: string; durationSec: number | null; autonomous: boolean; demoMode: boolean;
}
export async function createBidAgent(a: NewBidAgent): Promise<BidAgentApi> {
  const ts = now();
  return prisma.bidAgent.create({
    data: {
      userWallet: a.userWallet.toLowerCase(), circleId: a.circleId, member: a.member.toLowerCase(), goal: a.goal,
      desiredPayout: a.desiredPayout === null ? null : a.desiredPayout.toString(), maxDiscount: a.maxDiscount.toString(), maxDiscountPct: a.maxDiscountPct,
      urgency: a.urgency, riskTolerance: a.riskTolerance, durationSec: a.durationSec, autonomous: a.autonomous, demoMode: a.demoMode,
      status: "ACTIVE", startedAt: ts, expiresAt: a.durationSec === null ? null : ts + a.durationSec, updatedAt: ts,
    },
  });
}
export async function getBidAgent(id: string): Promise<BidAgentApi | null> {
  return prisma.bidAgent.findUnique({ where: { id } });
}
export type BidAgentPatch = Partial<Pick<PBidAgent, "status" | "statusReason" | "lastDecision" | "lastReason" | "lastBid" | "lastTxHash" | "failures" | "autonomous" | "expiresAt">>;
export async function updateBidAgent(id: string, patch: BidAgentPatch): Promise<BidAgentApi> {
  return prisma.bidAgent.update({ where: { id }, data: { ...patch, updatedAt: now() } });
}
/** Agents the loop must drive (status ACTIVE), oldest first. */
export async function activeBidAgents(): Promise<BidAgentApi[]> {
  return prisma.bidAgent.findMany({ where: { status: "ACTIVE" }, orderBy: { startedAt: "asc" } });
}
/** An ACTIVE or PAUSED agent for this circle + member (at most one is allowed). */
export async function liveBidAgent(circleId: number, member: string): Promise<BidAgentApi | null> {
  return prisma.bidAgent.findFirst({ where: { circleId, member: member.toLowerCase(), status: { in: ["ACTIVE", "PAUSED"] } }, orderBy: { startedAt: "desc" } });
}
export async function bidAgentsOf(userWallet: string, circleId?: number): Promise<BidAgentApi[]> {
  return prisma.bidAgent.findMany({
    where: { userWallet: userWallet.toLowerCase(), ...(circleId !== undefined ? { circleId } : {}) },
    orderBy: { startedAt: "desc" }, take: 100,
  });
}

export async function insertAgentEvent(agentId: string, kind: AgentEventKind, text: string, reason: string | null = null, data: Record<string, unknown> | null = null): Promise<AgentEventApi> {
  const row = await prisma.agentEvent.create({
    data: { agentId, ts: now(), kind, text, reason, data: data === null ? undefined : (data as Prisma.InputJsonObject) },
  });
  return toEventApi(row);
}
export async function listAgentEvents(agentId: string, opts: { since?: number; limit?: number } = {}): Promise<AgentEventApi[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await prisma.agentEvent.findMany({
    where: { agentId, ...(opts.since !== undefined ? { id: { gt: opts.since } } : {}) },
    orderBy: { id: "asc" }, take: limit,
  });
  return rows.map(toEventApi);
}
/** Newest event of one kind for an agent (e.g. the INFO activation line, or the last RIVAL_BID). */
export async function lastAgentEvent(agentId: string, kind: AgentEventKind): Promise<AgentEventApi | null> {
  const row = await prisma.agentEvent.findFirst({ where: { agentId, kind }, orderBy: { id: "desc" } });
  return row ? toEventApi(row) : null;
}

// ───────────── auction reads over the indexed Event table ─────────────
export interface BidEventRow { round: number | null; member: string; discount: string; txHash: string; block: number; ts: number }
/** Indexed BidPlaced rows for a circle, newest first. */
export async function bidEventsForCircle(circleId: number, limit = 50): Promise<BidEventRow[]> {
  const rows = await prisma.event.findMany({ where: { circleId, name: "BidPlaced" }, orderBy: { id: "desc" }, take: Math.min(Math.max(limit, 1), 500) });
  return rows.map((r) => {
    const a = JSON.parse(r.argsJson) as Record<string, string | number | boolean>;
    return { round: r.round, member: String(a.member ?? ""), discount: String(a.discount ?? "0"), txHash: r.txHash, block: r.block, ts: r.ts };
  });
}
export async function countBids(circleId: number, round: number): Promise<number> {
  return prisma.event.count({ where: { circleId, round, name: "BidPlaced" } });
}
