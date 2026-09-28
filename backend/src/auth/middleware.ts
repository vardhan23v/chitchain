import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { config } from "../config";
import { getSession, getUser, type SessionRow, type UserRow } from "../db/auth";
import { getCircleMeta, type CircleMetaRow } from "../db/meta";
import { getCircle } from "../chain";
import { ApiError } from "../routes/util";
import { audit } from "./audit";
import { verifyJwt } from "./jwt";

/** DB / chain lookups behind an injectable object so unit tests need neither Postgres nor an RPC. */
export interface AuthDeps {
  getSession: (id: string) => Promise<SessionRow | null>;
  getUser: (addr: string) => Promise<UserRow | null>;
  getCircleMeta: (id: number) => Promise<CircleMetaRow | null>;
  circleCreator: (id: number) => Promise<string | null>;
  secret: () => string;
  audit: typeof audit;
}
export const deps: AuthDeps = {
  getSession, getUser, getCircleMeta,
  circleCreator: async (id) => { try { return (await getCircle(id)).creator; } catch { return null; } },
  secret: () => config.SESSION_SECRET,
  audit,
};

type Auth = NonNullable<Request["auth"]>;

/** Resolves the bearer token to { address, role, jti, exp } (role from the User row) or throws the matching ApiError. */
export async function resolveAuth(req: Request, d: AuthDeps = deps): Promise<Auth | null> {
  const header = req.headers.authorization;
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) throw new ApiError(401, "malformed Authorization header", "BAD_TOKEN");
  const v = verifyJwt(m[1].trim(), d.secret());
  if (!v.ok) throw new ApiError(401, v.reason === "expired" ? "session expired" : "invalid token", "BAD_TOKEN");
  const session = await d.getSession(v.claims.jti);
  if (!session || session.walletAddress !== v.claims.sub.toLowerCase()) throw new ApiError(401, "unknown session", "SESSION_REVOKED");
  if (session.revokedAt !== null) throw new ApiError(401, "session revoked", "SESSION_REVOKED");
  if (session.expiresAt <= Math.floor(Date.now() / 1000)) throw new ApiError(401, "session expired", "BAD_TOKEN");
  const user = await d.getUser(session.walletAddress);
  if (!user) throw new ApiError(401, "unknown user", "SESSION_REVOKED");
  if (user.status === "SUSPENDED") throw new ApiError(403, "account suspended", "SUSPENDED");
  return { address: user.walletAddress, role: user.role, jti: session.id, exp: session.expiresAt };
}

type Mw = (req: Request, res: Response, next: NextFunction) => void;

export function requireAuth(d: AuthDeps = deps): Mw {
  return (req, _res, next) => {
    resolveAuth(req, d).then((a) => {
      if (!a) { next(new ApiError(401, "sign in required", "NO_AUTH")); return; }
      req.auth = a; next();
    }).catch(next);
  };
}
/** Sets req.auth when a valid bearer token is present; anonymous otherwise (a bad token is still an error). */
export function optionalAuth(d: AuthDeps = deps): Mw {
  return (req, _res, next) => { resolveAuth(req, d).then((a) => { if (a) req.auth = a; next(); }).catch(next); };
}
export function requireRole(...roles: Role[]): Mw {
  return (req, _res, next) => {
    if (!req.auth) { next(new ApiError(401, "sign in required", "NO_AUTH")); return; }
    if (!roles.includes(req.auth.role)) {
      deps.audit(req, "auth.denied", `${req.method} ${req.path}`, "denied", { meta: { need: roles } });
      next(new ApiError(403, `requires role ${roles.join(" or ")}`, "FORBIDDEN"));
      return;
    }
    next();
  };
}
/** ADMIN, or CircleMeta.organizerWallet, or the on-chain creator. Throws 403 NOT_ORGANIZER. */
export async function assertOrganizer(req: Request, circleId: number, d: AuthDeps = deps): Promise<void> {
  if (!req.auth) throw new ApiError(401, "sign in required", "NO_AUTH");
  if (req.auth.role === "ADMIN") return;
  const me = req.auth.address;
  const meta = await d.getCircleMeta(circleId);
  if (meta && meta.organizerWallet === me) return;
  const creator = await d.circleCreator(circleId);
  if (creator && creator.toLowerCase() === me) return;
  d.audit(req, "auth.denied", `circle:${circleId}`, "denied", { meta: { need: "organizer" } });
  throw new ApiError(403, "not the organizer of this circle", "NOT_ORGANIZER");
}
export function requireCircleOrganizer(param = "id", d: AuthDeps = deps): Mw {
  return (req, _res, next) => {
    const id = Number(req.params[param]);
    if (!Number.isInteger(id) || id < 1) { next(new ApiError(400, "invalid circle id", "BAD_ID")); return; }
    assertOrganizer(req, id, d).then(() => next()).catch(next);
  };
}
/** The :param address must be the caller (case-insensitive) or the caller must be ADMIN. */
export function requireSelfOrAdmin(param = "addr"): Mw {
  return (req, _res, next) => {
    if (!req.auth) { next(new ApiError(401, "sign in required", "NO_AUTH")); return; }
    const target = String(req.params[param] ?? "").toLowerCase();
    if (req.auth.role === "ADMIN" || target === req.auth.address) { next(); return; }
    deps.audit(req, "auth.denied", `${req.method} ${req.path}`, "denied", { meta: { need: "self" } });
    next(new ApiError(403, "not your address", "FORBIDDEN"));
  };
}
