import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the platform-admin fallback login (API.md v3).
 * Format: `scrypt$<saltHex>$<hashHex>` — scrypt N=16384 r=8 p=1, keylen 64, 16-byte salt.
 * Wallet users never have passwords; this exists only so an admin can reach the admin dashboard when their wallet is unavailable.
 */
const SCRYPT = { N: 16384, r: 8, p: 1 } as const;
const KEYLEN = 64;
const HASH_RE = /^scrypt\$([0-9a-f]{16,64})\$([0-9a-f]{128})$/;

export function hashPassword(password: string, salt: Buffer = randomBytes(16)): string {
  const hash = scryptSync(password, salt, KEYLEN, SCRYPT);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** True when `stored` is a well-formed scrypt hash string. */
export function isPasswordHash(stored: string): boolean {
  return HASH_RE.test(stored);
}

/** Constant-time verification; a malformed `stored` value never matches (and never throws). */
export function verifyPassword(password: string, stored: string): boolean {
  const m = HASH_RE.exec(stored);
  if (!m) return false;
  try {
    const salt = Buffer.from(m[1], "hex");
    const expected = Buffer.from(m[2], "hex");
    const actual = scryptSync(password, salt, KEYLEN, SCRYPT);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Constant-time string equality (usernames); lengths differing still cost one compare. */
export function safeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) { timingSafeEqual(ab, ab); return false; }
  return timingSafeEqual(ab, bb);
}
