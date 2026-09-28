import type { AuditLog as PAudit, CircleInvite as PInvite, CircleMeta as PMeta, SupportTicket as PTicket, TicketStatus } from "@prisma/client";
import { prisma } from "./client";

export type { TicketStatus };
const now = (): number => Math.floor(Date.now() / 1000);

// ───────────── circle meta (organizer stored lowercase) ─────────────
export interface CircleMetaRow { circleId: number; name: string; description: string | null; organizerWallet: string; demo: boolean; createdAt: number }
const toMetaRow = (m: PMeta): CircleMetaRow => ({ circleId: m.circleId, name: m.name, description: m.description, organizerWallet: m.organizerWallet, demo: m.demo, createdAt: m.createdAt });

export async function getCircleMeta(circleId: number): Promise<CircleMetaRow | null> {
  const m = await prisma.circleMeta.findUnique({ where: { circleId } });
  return m ? toMetaRow(m) : null;
}
export async function upsertCircleMeta(circleId: number, data: { name: string; description?: string | null; organizerWallet: string; demo?: boolean }): Promise<CircleMetaRow> {
  const organizerWallet = data.organizerWallet.toLowerCase();
  const m = await prisma.circleMeta.upsert({
    where: { circleId },
    create: { circleId, name: data.name, description: data.description ?? null, organizerWallet, demo: data.demo ?? false, createdAt: now() },
    update: { name: data.name, description: data.description ?? null, organizerWallet, ...(data.demo !== undefined ? { demo: data.demo } : {}) },
  });
  return toMetaRow(m);
}
export async function updateCircleMeta(circleId: number, data: { name?: string; description?: string | null }): Promise<CircleMetaRow> {
  return toMetaRow(await prisma.circleMeta.update({ where: { circleId }, data }));
}
/** Batch lookup for CircleSummary decoration: circleId → { name, organizerWallet }. */
export async function circleNames(ids: number[]): Promise<Map<number, CircleMetaRow>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.circleMeta.findMany({ where: { circleId: { in: ids } } });
  return new Map(rows.map((r) => [r.circleId, toMetaRow(r)]));
}
export async function circleMetaByOrganizer(addr: string): Promise<CircleMetaRow[]> {
  return (await prisma.circleMeta.findMany({ where: { organizerWallet: addr.toLowerCase() }, orderBy: { circleId: "desc" } })).map(toMetaRow);
}
export async function countDemoMeta(): Promise<number> { return prisma.circleMeta.count({ where: { demo: true } }); }

// ───────────── invites (addresses stored lowercase) ─────────────
export interface InviteRow { circleId: number; walletAddress: string; invitedBy: string; createdAt: number }
const toInviteRow = (i: PInvite): InviteRow => ({ circleId: i.circleId, walletAddress: i.walletAddress, invitedBy: i.invitedBy, createdAt: i.createdAt });
export async function addInvites(circleId: number, addresses: string[], invitedBy: string): Promise<InviteRow[]> {
  const ts = now();
  await prisma.circleInvite.createMany({
    data: addresses.map((a) => ({ circleId, walletAddress: a.toLowerCase(), invitedBy: invitedBy.toLowerCase(), createdAt: ts })),
    skipDuplicates: true,
  });
  return invitesForCircle(circleId);
}
export async function removeInvite(circleId: number, addr: string): Promise<boolean> {
  return (await prisma.circleInvite.deleteMany({ where: { circleId, walletAddress: addr.toLowerCase() } })).count > 0;
}
export async function invitesForCircle(circleId: number): Promise<InviteRow[]> {
  return (await prisma.circleInvite.findMany({ where: { circleId }, orderBy: { createdAt: "asc" } })).map(toInviteRow);
}
export async function invitesForAddress(addr: string): Promise<InviteRow[]> {
  return (await prisma.circleInvite.findMany({ where: { walletAddress: addr.toLowerCase() }, orderBy: { createdAt: "desc" } })).map(toInviteRow);
}

// ───────────── audit log ─────────────
export interface AuditRow { id: number; ts: number; actorWallet: string | null; role: string; action: string; target: string | null; result: string; txHash: string | null; meta: Record<string, unknown> | null }
const toAuditRow = (a: PAudit): AuditRow => {
  let meta: Record<string, unknown> | null = null;
  if (a.metaJson) { try { meta = JSON.parse(a.metaJson) as Record<string, unknown>; } catch { meta = null; } }
  return { id: a.id, ts: a.ts, actorWallet: a.actorWallet, role: a.role, action: a.action, target: a.target, result: a.result, txHash: a.txHash, meta };
};
export interface NewAudit { actorWallet: string | null; role: string; action: string; target: string | null; result: string; txHash?: string | null; meta?: Record<string, unknown> | null }
export async function insertAudit(a: NewAudit): Promise<void> {
  await prisma.auditLog.create({
    data: {
      ts: now(), actorWallet: a.actorWallet ? a.actorWallet.toLowerCase() : null, role: a.role, action: a.action, target: a.target, result: a.result,
      txHash: a.txHash ?? null, metaJson: a.meta ? JSON.stringify(a.meta) : null,
    },
  });
}
export async function listAudit(opts: { limit?: number; actor?: string; action?: string; since?: number }): Promise<AuditRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await prisma.auditLog.findMany({
    where: {
      ...(opts.actor ? { actorWallet: opts.actor.toLowerCase() } : {}),
      ...(opts.action ? { action: { startsWith: opts.action } } : {}),
      ...(opts.since !== undefined ? { ts: { gte: opts.since } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit,
  });
  return rows.map(toAuditRow);
}
export async function countAuditSince(ts: number): Promise<number> { return prisma.auditLog.count({ where: { ts: { gte: ts } } }); }

// ───────────── support tickets ─────────────
export interface TicketRow { id: number; userWallet: string; subject: string; message: string; status: TicketStatus; adminNote: string | null; createdAt: number; updatedAt: number }
const toTicketRow = (t: PTicket): TicketRow => ({ id: t.id, userWallet: t.userWallet, subject: t.subject, message: t.message, status: t.status, adminNote: t.adminNote, createdAt: t.createdAt, updatedAt: t.updatedAt });
export async function createTicket(userWallet: string, subject: string, message: string): Promise<TicketRow> {
  const ts = now();
  return toTicketRow(await prisma.supportTicket.create({ data: { userWallet: userWallet.toLowerCase(), subject, message, createdAt: ts, updatedAt: ts } }));
}
export async function ticketsFor(userWallet: string): Promise<TicketRow[]> {
  return (await prisma.supportTicket.findMany({ where: { userWallet: userWallet.toLowerCase() }, orderBy: { id: "desc" } })).map(toTicketRow);
}
export async function listTickets(status?: TicketStatus, limit = 200): Promise<TicketRow[]> {
  return (await prisma.supportTicket.findMany({ where: status ? { status } : {}, orderBy: { id: "desc" }, take: limit })).map(toTicketRow);
}
export async function getTicket(id: number): Promise<TicketRow | null> {
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  return t ? toTicketRow(t) : null;
}
export async function updateTicket(id: number, data: { status?: TicketStatus; adminNote?: string | null }): Promise<TicketRow> {
  return toTicketRow(await prisma.supportTicket.update({ where: { id }, data: { ...data, updatedAt: now() } }));
}
export async function countOpenTickets(): Promise<number> { return prisma.supportTicket.count({ where: { status: "OPEN" } }); }
