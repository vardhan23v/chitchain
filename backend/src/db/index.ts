import type { AgentLog as PAgentLog, Event as PEvent, Mandate as PMandate } from "@prisma/client";
import { prisma } from "./client";
import { now } from "./auth";

export { prisma } from "./client";
export * from "./auth";
export * from "./meta";
export * from "./ai";


/** Connects and runs a trivial query so a bad DATABASE_URL fails fast at boot. Schema is applied by `prisma db push` (npm start). */
export async function initDb(): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
}
export async function closeDb(): Promise<void> { await prisma.$disconnect(); }

const ci = (s: string) => ({ equals: s, mode: "insensitive" as const });

// ───────────── meta ─────────────
export async function getMeta(key: string): Promise<string | null> {
  return (await prisma.meta.findUnique({ where: { key } }))?.value ?? null;
}
export async function setMeta(key: string, value: string): Promise<void> {
  await prisma.meta.upsert({ where: { key }, create: { key, value }, update: { value } });
}
export async function getLastBlock(): Promise<number | null> { const v = await getMeta("last_block"); return v === null ? null : Number(v); }
export async function setLastBlock(n: number): Promise<void> { await setMeta("last_block", String(n)); }

// ───────────── events ─────────────
export interface EventRow {
  id: number; circle_id: number | null; round: number | null; name: string; args_json: string;
  tx_hash: string; log_index: number; block: number; ts: number;
}
export interface NewEvent { circleId: number | null; round: number | null; name: string; args: Record<string, string | number | boolean>; txHash: string; logIndex: number; block: number; ts: number }
const toEventRow = (e: PEvent): EventRow => ({
  id: e.id, circle_id: e.circleId, round: e.round, name: e.name, args_json: e.argsJson,
  tx_hash: e.txHash, log_index: e.logIndex, block: e.block, ts: e.ts,
});

/** Inserts in one transaction; rows already present (same tx_hash + log_index) are skipped. Returns the number inserted. */
export async function insertEvents(rows: NewEvent[]): Promise<number> {
  if (rows.length === 0) return 0;
  const data = rows.map((r) => ({
    circleId: r.circleId, round: r.round, name: r.name, argsJson: JSON.stringify(r.args),
    txHash: r.txHash, logIndex: r.logIndex, block: r.block, ts: r.ts,
  }));
  const res = await prisma.$transaction((tx) => tx.event.createMany({ data, skipDuplicates: true }));
  return res.count;
}

export async function listEvents(opts: { circleId?: number; since?: number; limit?: number }): Promise<EventRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await prisma.event.findMany({
    where: {
      ...(opts.circleId !== undefined ? { circleId: opts.circleId } : {}),
      ...(opts.since !== undefined ? { id: { gt: opts.since } } : {}),
    },
    orderBy: { id: "asc" },
    take: limit,
  });
  return rows.map(toEventRow);
}
/** Events whose args mention `addr` (as a JSON string value), oldest → newest. */
export async function eventsForAddress(addr: string, limit = 50): Promise<EventRow[]> {
  const rows = await prisma.event.findMany({
    where: { argsJson: { contains: `"${addr.toLowerCase()}"`, mode: "insensitive" } },
    orderBy: { id: "desc" },
    take: limit,
  });
  return rows.map(toEventRow).reverse();
}
/** Newest-first indexed events whose args name `addr` as member / winner / bestBidder / creator (case-insensitive match on args_json). */
export async function eventsInvolving(addr: string, limit = 50): Promise<EventRow[]> {
  const rows = await prisma.event.findMany({
    where: { argsJson: { contains: `"${addr.toLowerCase()}"`, mode: "insensitive" } },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(limit, 1), 500) * 2, // over-fetch: other args (e.g. txHash-like strings) could match too
  });
  const a = addr.toLowerCase();
  const KEYS = ["member", "winner", "bestBidder", "bidder", "creator"];
  return rows
    .filter((r) => { const args = JSON.parse(r.argsJson) as Record<string, unknown>; return KEYS.some((k) => typeof args[k] === "string" && (args[k] as string).toLowerCase() === a); })
    .slice(0, limit)
    .map(toEventRow);
}
/** All indexed events of the given names for one circle, oldest → newest. */
export async function eventsForCircleByName(circleId: number, names: string[]): Promise<EventRow[]> {
  const rows = await prisma.event.findMany({ where: { circleId, name: { in: names } }, orderBy: { id: "asc" } });
  return rows.map(toEventRow);
}
export async function countEventsForCircle(circleId: number): Promise<number> {
  return prisma.event.count({ where: { circleId } });
}
export async function countDistinctTx(): Promise<number> {
  const r = await prisma.$queryRaw<{ c: number }[]>`SELECT COUNT(DISTINCT tx_hash)::int AS c FROM events`;
  return r[0]?.c ?? 0;
}
export async function findEvent(name: string, txHash: string): Promise<EventRow | null> {
  const e = await prisma.event.findFirst({ where: { name, txHash }, orderBy: { id: "asc" } });
  return e ? toEventRow(e) : null;
}

// ───────────── agent logs ─────────────
export interface AgentLogRow {
  id: number; circle_id: number; round: number; member: string; agent_wallet: string; bid_this_round: number;
  discount: string; reason: string; source: string; tx_hash: string | null; error: string | null; ts: number;
}
export interface NewAgentLog {
  circleId: number; round: number; member: string; agentWallet: string; bidThisRound: boolean; discount: bigint;
  reason: string; source: "llm" | "fallback"; txHash: string | null; error: string | null;
}
const toAgentLogRow = (l: PAgentLog): AgentLogRow => ({
  id: l.id, circle_id: l.circleId, round: l.round, member: l.member, agent_wallet: l.agentWallet, bid_this_round: l.bidThisRound ? 1 : 0,
  discount: l.discount, reason: l.reason, source: l.source, tx_hash: l.txHash, error: l.error, ts: l.ts,
});
export async function insertAgentLog(l: NewAgentLog): Promise<AgentLogRow> {
  const row = await prisma.agentLog.create({
    data: {
      circleId: l.circleId, round: l.round, member: l.member, agentWallet: l.agentWallet, bidThisRound: l.bidThisRound,
      discount: l.discount.toString(), reason: l.reason, source: l.source, txHash: l.txHash, error: l.error, ts: now(),
    },
  });
  return toAgentLogRow(row);
}
export async function listAgentLogs(opts: { circleId?: number; limit?: number }): Promise<AgentLogRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const rows = await prisma.agentLog.findMany({
    where: opts.circleId !== undefined ? { circleId: opts.circleId } : {},
    orderBy: { id: "desc" },
    take: limit,
  });
  return rows.map(toAgentLogRow);
}
export async function agentLogByTx(txHash: string): Promise<AgentLogRow | null> {
  const row = await prisma.agentLog.findFirst({ where: { txHash }, orderBy: { id: "asc" } });
  return row ? toAgentLogRow(row) : null;
}
export async function agentLogForRound(circleId: number, round: number, member: string): Promise<AgentLogRow | null> {
  const row = await prisma.agentLog.findFirst({ where: { circleId, round, member: ci(member) }, orderBy: { id: "desc" } });
  return row ? toAgentLogRow(row) : null;
}

// ───────────── mandates ─────────────
export type Level = "low" | "medium" | "high";
export interface MandateRow {
  circle_id: number; member: string; goal: string; max_discount_pct: number | null;
  desired_payout: string | null; urgency: Level | null; risk_tolerance: Level | null; active: number; created_at: number;
}
export interface MandateInput { goal: string; maxDiscountPct: number | null; desiredPayout: bigint | null; urgency: Level | null; riskTolerance: Level | null }
const asLevel = (v: string | null): Level | null => (v === "low" || v === "medium" || v === "high" ? v : null);
const toMandateRow = (m: PMandate): MandateRow => ({
  circle_id: m.circleId, member: m.member, goal: m.goal, max_discount_pct: m.maxDiscountPct,
  desired_payout: m.desiredPayout, urgency: asLevel(m.urgency), risk_tolerance: asLevel(m.riskTolerance),
  active: m.active ? 1 : 0, created_at: m.createdAt,
});
/** Member is stored as given (checksummed by the API layer); lookups are case-insensitive. */
export async function upsertMandate(circleId: number, member: string, input: MandateInput): Promise<MandateRow> {
  const ts = now();
  const data = {
    goal: input.goal, maxDiscountPct: input.maxDiscountPct, desiredPayout: input.desiredPayout === null ? null : input.desiredPayout.toString(),
    urgency: input.urgency, riskTolerance: input.riskTolerance, active: true, createdAt: ts,
  };
  const row = await prisma.mandate.upsert({
    where: { circleId_member: { circleId, member } },
    create: { circleId, member, ...data },
    update: data,
  });
  return toMandateRow(row);
}
export async function getMandate(circleId: number, member: string): Promise<MandateRow | null> {
  const row = await prisma.mandate.findFirst({ where: { circleId, member: ci(member) } });
  return row ? toMandateRow(row) : null;
}
export async function deactivateMandate(circleId: number, member: string): Promise<boolean> {
  const res = await prisma.mandate.updateMany({ where: { circleId, member: ci(member) }, data: { active: false } });
  return res.count > 0;
}
export async function activeMandates(circleId: number): Promise<MandateRow[]> {
  const rows = await prisma.mandate.findMany({ where: { circleId, active: true }, orderBy: [{ createdAt: "asc" }, { member: "asc" }] });
  return rows.map(toMandateRow);
}

// ───────────── risk cache (address stored lowercase) ─────────────
export async function getRiskCache(addr: string, maxAgeSec: number): Promise<string | null> {
  const row = await prisma.riskCache.findUnique({ where: { addr: addr.toLowerCase() } });
  if (!row || now() - row.ts > maxAgeSec) return null;
  return row.json;
}
export async function setRiskCache(addr: string, json: string): Promise<void> {
  const a = addr.toLowerCase();
  const ts = now();
  await prisma.riskCache.upsert({ where: { addr: a }, create: { addr: a, json, ts }, update: { json, ts } });
}

// ───────────── demo (address stored lowercase) ─────────────
export async function getSkip(addr: string): Promise<boolean> {
  return (await prisma.demoSkip.findUnique({ where: { addr: addr.toLowerCase() } }))?.skip ?? false;
}
export async function setSkip(addr: string, skip: boolean): Promise<void> {
  const a = addr.toLowerCase();
  await prisma.demoSkip.upsert({ where: { addr: a }, create: { addr: a, skip }, update: { skip } });
}
export async function addDemoCircle(circleId: number): Promise<void> {
  await prisma.demoCircle.createMany({ data: [{ circleId, createdAt: now() }], skipDuplicates: true });
}
export async function isDemoCircle(circleId: number): Promise<boolean> {
  return (await prisma.demoCircle.findUnique({ where: { circleId }, select: { circleId: true } })) !== null;
}
export async function demoCircleIds(): Promise<number[]> {
  const rows = await prisma.demoCircle.findMany({ select: { circleId: true }, orderBy: { circleId: "asc" } });
  return rows.map((r) => r.circleId);
}
export async function latestDemoCircle(): Promise<number | null> {
  return (await prisma.demoCircle.findFirst({ select: { circleId: true }, orderBy: { circleId: "desc" } }))?.circleId ?? null;
}
