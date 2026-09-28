import type { NextFunction, Request, Response } from "express";
import { getAddress, isAddress } from "ethers";
import { errorMessage, revertName } from "../chain";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

type Handler = (req: Request, res: Response) => Promise<void>;
/** Wraps an async handler so rejections reach the error middleware. */
export const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction): void => { fn(req, res).catch(next); };

export function parseId(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new ApiError(400, "invalid circle id", "BAD_ID");
  return n;
}
export function parseAddress(raw: string): string {
  if (!isAddress(raw)) throw new ApiError(400, "invalid address", "BAD_ADDRESS");
  return getAddress(raw);
}
/** True for a 20-byte hex address. Password-admin sessions use `admin:<username>` as their walletAddress, which is NOT an on-chain address. */
export const isEvmAddress = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);
export const ADMIN_LOGIN_PREFIX = "admin:";
/** A User id: a checksummed EVM address, or a password-admin id `admin:<username>` (returned lowercase). */
export function parseUserId(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (/^admin:[a-z0-9._-]{3,40}$/.test(v)) return v;
  return parseAddress(raw);
}
export function optionalInt(raw: unknown): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new ApiError(400, `invalid number: ${String(raw)}`, "BAD_NUMBER");
  return Math.floor(n);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) { res.status(err.status).json({ error: err.message, code: err.code }); return; }
  const name = revertName(err);
  const message = errorMessage(err);
  console.error(`[api] ${message}`);
  res.status(name ? 400 : 500).json({ error: message, code: name ?? "INTERNAL" });
}
