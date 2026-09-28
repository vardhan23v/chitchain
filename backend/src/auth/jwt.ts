import { createHmac, timingSafeEqual } from "node:crypto";

/** Minimal HS256 JWT (no dependency). Claims are pinned: sub / role / jti / iat / exp. */
export interface Claims { sub: string; role: string; jti: string; iat: number; exp: number }

const b64u = (buf: Buffer | string): string => Buffer.from(buf).toString("base64url");
const HEADER = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));

function hmac(secret: string, data: string): Buffer { return createHmac("sha256", secret).update(data).digest(); }

export function signJwt(claims: Claims, secret: string): string {
  const body = `${HEADER}.${b64u(JSON.stringify(claims))}`;
  return `${body}.${b64u(hmac(secret, body))}`;
}

export type VerifyResult = { ok: true; claims: Claims } | { ok: false; reason: "malformed" | "alg" | "signature" | "expired" | "claims" };

/** Verifies signature (constant-time), pins alg=HS256, checks exp > now and claim shapes. */
export function verifyJwt(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) return { ok: false, reason: "malformed" };
  const [h, p, s] = parts;
  let header: { alg?: unknown; typ?: unknown };
  try { header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { alg?: unknown }; } catch { return { ok: false, reason: "malformed" }; }
  if (header.alg !== "HS256") return { ok: false, reason: "alg" };
  const expected = hmac(secret, `${h}.${p}`);
  const given = Buffer.from(s, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "signature" };
  let claims: Partial<Claims>;
  try { claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Partial<Claims>; } catch { return { ok: false, reason: "malformed" }; }
  if (typeof claims.sub !== "string" || typeof claims.role !== "string" || typeof claims.jti !== "string" || typeof claims.iat !== "number" || typeof claims.exp !== "number") {
    return { ok: false, reason: "claims" };
  }
  if (claims.exp <= nowSec) return { ok: false, reason: "expired" };
  return { ok: true, claims: claims as Claims };
}
