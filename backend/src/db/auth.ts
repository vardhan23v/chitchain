import type { Role, Session as PSession, User as PUser, UserStatus } from "@prisma/client";
import { prisma } from "./client";

export type { Role, UserStatus };
export const now = (): number => Math.floor(Date.now() / 1000);

// ───────────── users (address stored lowercase) ─────────────
export interface UserRow { walletAddress: string; role: Role; status: UserStatus; displayName: string | null; username: string | null; createdAt: number; lastLogin: number | null }
export const toUserRow = (u: PUser): UserRow => ({
  walletAddress: u.walletAddress, role: u.role, status: u.status, displayName: u.displayName, username: u.username, createdAt: u.createdAt, lastLogin: u.lastLogin,
});

export async function getUser(addr: string): Promise<UserRow | null> {
  const u = await prisma.user.findUnique({ where: { walletAddress: addr.toLowerCase() } });
  return u ? toUserRow(u) : null;
}
/** Creates the user on first login (MEMBER, or ADMIN when `admin`); later logins refresh lastLogin and promote to ADMIN when `admin`. */
export async function upsertUserOnLogin(addr: string, admin: boolean): Promise<UserRow> {
  const a = addr.toLowerCase();
  const ts = now();
  const u = await prisma.user.upsert({
    where: { walletAddress: a },
    create: { walletAddress: a, role: admin ? "ADMIN" : "MEMBER", status: "ACTIVE", createdAt: ts, lastLogin: ts },
    update: { lastLogin: ts, ...(admin ? { role: "ADMIN" as Role } : {}) },
  });
  return toUserRow(u);
}
export async function updateUser(addr: string, data: { role?: Role; status?: UserStatus; displayName?: string | null }): Promise<UserRow> {
  return toUserRow(await prisma.user.update({ where: { walletAddress: addr.toLowerCase() }, data }));
}
export async function listUsers(opts: { role?: Role; status?: UserStatus; q?: string; limit?: number }): Promise<UserRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const rows = await prisma.user.findMany({
    where: {
      ...(opts.role ? { role: opts.role } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q ? { OR: [{ walletAddress: { contains: opts.q.toLowerCase() } }, { displayName: { contains: opts.q, mode: "insensitive" } }, { username: { contains: opts.q.toLowerCase() } }] } : {}),
    },
    orderBy: [{ lastLogin: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toUserRow);
}
export async function countUsers(): Promise<{ total: number; active: number; suspended: number; byRole: Record<Role, number> }> {
  const groups = await prisma.user.groupBy({ by: ["role", "status"], _count: { _all: true } });
  const out = { total: 0, active: 0, suspended: 0, byRole: { MEMBER: 0, ORGANIZER: 0, ADMIN: 0 } as Record<Role, number> };
  for (const g of groups) {
    const n = g._count._all;
    out.total += n;
    if (g.status === "ACTIVE") out.active += n; else out.suspended += n;
    out.byRole[g.role] += n;
  }
  return out;
}
export async function countAdmins(): Promise<number> { return prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }); }

// ───────────── nonces ─────────────
export interface NonceRow { nonce: string; walletAddress: string; issuedAt: number; expiresAt: number; usedAt: number | null }
export async function createNonce(nonce: string, addr: string, issuedAt: number, expiresAt: number): Promise<NonceRow> {
  return prisma.authNonce.create({ data: { nonce, walletAddress: addr.toLowerCase(), issuedAt, expiresAt } });
}
export async function getNonce(nonce: string): Promise<NonceRow | null> { return prisma.authNonce.findUnique({ where: { nonce } }); }
/** Marks the nonce used; returns false if it was already consumed (atomic one-time use). */
export async function consumeNonce(nonce: string): Promise<boolean> {
  const r = await prisma.authNonce.updateMany({ where: { nonce, usedAt: null }, data: { usedAt: now() } });
  return r.count === 1;
}
export async function sweepNonces(): Promise<number> {
  return (await prisma.authNonce.deleteMany({ where: { expiresAt: { lt: now() - 3600 } } })).count;
}

// ───────────── sessions ─────────────
export interface SessionRow { id: string; walletAddress: string; role: Role; createdAt: number; expiresAt: number; revokedAt: number | null }
const toSessionRow = (s: PSession): SessionRow => ({ id: s.id, walletAddress: s.walletAddress, role: s.role, createdAt: s.createdAt, expiresAt: s.expiresAt, revokedAt: s.revokedAt });
export async function createSession(id: string, addr: string, role: Role, createdAt: number, expiresAt: number): Promise<SessionRow> {
  return toSessionRow(await prisma.session.create({ data: { id, walletAddress: addr.toLowerCase(), role, createdAt, expiresAt } }));
}
export async function getSession(id: string): Promise<SessionRow | null> {
  const s = await prisma.session.findUnique({ where: { id } });
  return s ? toSessionRow(s) : null;
}
export async function revokeSession(id: string): Promise<boolean> {
  return (await prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: now() } })).count > 0;
}
export async function revokeSessionsFor(addr: string): Promise<number> {
  return (await prisma.session.updateMany({ where: { walletAddress: addr.toLowerCase(), revokedAt: null }, data: { revokedAt: now() } })).count;
}
