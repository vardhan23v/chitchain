import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { verifyMessage } from "ethers";
import { z } from "zod";
import { config } from "../config";
import { consumeNonce, createNonce, createSession, getNonce, getUser, revokeSession, sweepNonces, upsertUserOnLogin, type UserRow } from "../db";
import { audit } from "../auth/audit";
import { signJwt } from "../auth/jwt";
import { buildLoginMessage } from "../auth/message";
import { requireAuth } from "../auth/middleware";
import { ipOf, rateLimit } from "../auth/ratelimit";
import { safeEqualString, verifyPassword } from "../auth/password";
import { ADMIN_LOGIN_PREFIX, ApiError, parseAddress, wrap } from "./util";

export const auth = Router();
const nowSec = (): number => Math.floor(Date.now() / 1000);

/** API.md v3: /auth/nonce is limited 10/min per IP and per address; the whole /auth prefix shares the per-IP limiter in index.ts. */
const nonceLimiter = rateLimit({
  perMinute: 10,
  keys: (req) => {
    const addr = typeof (req.body as { address?: unknown })?.address === "string" ? (req.body as { address: string }).address.toLowerCase() : "";
    return [`nonce:ip:${ipOf(req)}`, ...(addr ? [`nonce:addr:${addr}`] : [])];
  },
});

const nonceBody = z.object({ address: z.string() });
/** POST /auth/nonce { address } → { nonce, message, expiresAt } (one-time nonce, valid NONCE_TTL_SEC). */
auth.post("/auth/nonce", nonceLimiter, wrap(async (req, res) => {
  const parsed = nonceBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address }", "BAD_BODY");
  const address = parseAddress(parsed.data.address);
  const issuedAt = nowSec();
  const expiresAt = issuedAt + config.NONCE_TTL_SEC;
  const nonce = randomBytes(16).toString("hex");
  await createNonce(nonce, address, issuedAt, expiresAt);
  if (Math.random() < 0.05) sweepNonces().catch(() => undefined);
  res.json({ nonce, message: buildLoginMessage(config.AUTH_DOMAIN, { address, nonce, issuedAt, expiresAt }), expiresAt });
}));

const verifyBody = z.object({ address: z.string(), nonce: z.string().regex(/^[0-9a-f]{32}$/), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) });
/** POST /auth/verify { address, nonce, signature } → { token, expiresAt, user }. The message is rebuilt from the stored nonce. */
auth.post("/auth/verify", wrap(async (req, res) => {
  const parsed = verifyBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address, nonce, signature }", "BAD_BODY");
  const address = parseAddress(parsed.data.address);
  const lower = address.toLowerCase();
  const deny = (code: string, msg: string, status = 401): never => {
    audit(req, "auth.login", lower, "denied", { meta: { code } });
    throw new ApiError(status, msg, code);
  };
  const row = await getNonce(parsed.data.nonce);
  if (!row || row.walletAddress !== lower || row.usedAt !== null || row.expiresAt <= nowSec()) deny("NONCE_INVALID", "nonce unknown, used or expired");
  const message = buildLoginMessage(config.AUTH_DOMAIN, { address, nonce: row!.nonce, issuedAt: row!.issuedAt, expiresAt: row!.expiresAt });
  let recovered = "";
  try { recovered = verifyMessage(message, parsed.data.signature).toLowerCase(); } catch { /* malformed signature */ }
  if (recovered !== lower) deny("BAD_SIGNATURE", "signature does not match the address");
  if (!(await consumeNonce(row!.nonce))) deny("NONCE_INVALID", "nonce already used"); // atomic one-time use
  const existing = await getUser(lower);
  if (existing?.status === "SUSPENDED") deny("SUSPENDED", "account suspended", 403);
  const user: UserRow = await upsertUserOnLogin(lower, config.PLATFORM_ADMIN_ADDRESSES.includes(lower));
  const iat = nowSec();
  const exp = iat + config.SESSION_TTL_SEC;
  const jti = randomUUID();
  await createSession(jti, lower, user.role, iat, exp);
  const token = signJwt({ sub: lower, role: user.role, jti, iat, exp }, config.SESSION_SECRET);
  req.auth = { address: lower, role: user.role, jti, exp };
  audit(req, "auth.login", lower, "ok", { meta: { role: user.role, ip: ipOf(req) } });
  res.json({ token, expiresAt: exp, user });
}));

/** API.md v3: /auth/admin-login is limited 5/min per IP (on top of the shared /auth limiter). */
const adminLoginLimiter = rateLimit({ perMinute: 5, keys: (req) => [`admin-login:ip:${ipOf(req)}`] });
const adminLoginBody = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(512) });
/**
 * POST /auth/admin-login { username, password } → { token, expiresAt, user }.
 * Platform-admin fallback when the admin's wallet is unavailable. Enabled only when ADMIN_LOGIN_USER + ADMIN_LOGIN_PASSWORD_HASH are set.
 * The resulting User has walletAddress `admin:<username>` (not an on-chain address), role ADMIN. Grants website admin rights only — never wallet/fund control.
 */
auth.post("/auth/admin-login", adminLoginLimiter, wrap(async (req, res) => {
  if (!config.adminPasswordLogin) throw new ApiError(404, "admin password login is not enabled", "NOT_ENABLED");
  const parsed = adminLoginBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { username, password }", "BAD_BODY");
  const username = parsed.data.username.toLowerCase();
  const id = `${ADMIN_LOGIN_PREFIX}${username}`;
  // Always run both compares so timing does not reveal whether the username matched.
  const userOk = safeEqualString(username, config.ADMIN_LOGIN_USER!);
  const passOk = verifyPassword(parsed.data.password, config.ADMIN_LOGIN_PASSWORD_HASH!);
  if (!(userOk && passOk)) {
    audit(req, "auth.admin_login", id, "denied", { meta: { code: "BAD_CREDENTIALS", ip: ipOf(req) } });
    throw new ApiError(401, "invalid username or password", "BAD_CREDENTIALS");
  }
  const existing = await getUser(id);
  if (existing?.status === "SUSPENDED") {
    audit(req, "auth.admin_login", id, "denied", { meta: { code: "SUSPENDED" } });
    throw new ApiError(403, "account suspended", "SUSPENDED");
  }
  const user: UserRow = await upsertUserOnLogin(id, true);
  const iat = nowSec();
  const exp = iat + config.SESSION_TTL_SEC;
  const jti = randomUUID();
  await createSession(jti, id, user.role, iat, exp);
  const token = signJwt({ sub: id, role: user.role, jti, iat, exp }, config.SESSION_SECRET);
  req.auth = { address: id, role: user.role, jti, exp };
  audit(req, "auth.admin_login", id, "ok", { meta: { role: user.role, ip: ipOf(req) } });
  res.json({ token, expiresAt: exp, user });
}));

/** GET /auth/me → { user, session: { id, expiresAt } } */
auth.get("/auth/me", requireAuth(), wrap(async (req, res) => {
  const user = await getUser(req.auth!.address);
  res.json({ user, session: { id: req.auth!.jti, expiresAt: req.auth!.exp } });
}));

/** POST /auth/logout → { ok } (revokes this session). */
auth.post("/auth/logout", requireAuth(), wrap(async (req, res) => {
  const ok = await revokeSession(req.auth!.jti);
  audit(req, "auth.logout", req.auth!.address, ok ? "ok" : "noop");
  res.json({ ok });
}));
