import type { Request } from "express";
import { insertAudit } from "../db";

const swallow = (e: unknown): void => console.error(`[audit] write failed: ${e instanceof Error ? e.message : String(e)}`);

/** Audit a request-driven action (actor = req.auth if signed in). Fire-and-forget; never throws. */
export function audit(req: Request, action: string, target?: string | number | null, result = "ok", extra: { txHash?: string | null; meta?: Record<string, unknown> | null } = {}): void {
  insertAudit({
    actorWallet: req.auth?.address ?? null, role: req.auth?.role ?? "ANON", action,
    target: target === undefined || target === null ? null : String(target), result, txHash: extra.txHash ?? null, meta: extra.meta ?? null,
  }).catch(swallow);
}

/** Audit a background action (role = SYSTEM | KEEPER | AGENT | AUTOPILOT | ORACLE). Fire-and-forget; never throws. */
export function auditSystem(role: string, action: string, target: string | number | null, result = "ok", txHash: string | null = null, meta: Record<string, unknown> | null = null): void {
  insertAudit({ actorWallet: null, role, action, target: target === null ? null : String(target), result, txHash, meta }).catch(swallow);
}
