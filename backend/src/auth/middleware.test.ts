import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
/* eslint-disable @typescript-eslint/no-var-requires */
const { signJwt } = require("./jwt") as typeof import("./jwt");
const mwMod = require("./middleware") as typeof import("./middleware");
const { ApiError } = require("../routes/util") as typeof import("../routes/util");
type Deps = import("./middleware").AuthDeps;

const secret = "s".repeat(64);
const now = Math.floor(Date.now() / 1000);
const alice = "0x" + "a".repeat(40);
const bob = "0x" + "b".repeat(40);
const users: Record<string, import("../db/auth").UserRow> = {
  [alice]: { walletAddress: alice, role: "ADMIN", status: "ACTIVE", displayName: null, createdAt: now, lastLogin: now },
  [bob]: { walletAddress: bob, role: "MEMBER", status: "ACTIVE", displayName: null, createdAt: now, lastLogin: now },
};
const sessions: Record<string, import("../db/auth").SessionRow> = {
  s1: { id: "s1", walletAddress: alice, role: "MEMBER", createdAt: now, expiresAt: now + 100, revokedAt: null }, // role in session is stale on purpose
  s2: { id: "s2", walletAddress: bob, role: "MEMBER", createdAt: now, expiresAt: now + 100, revokedAt: now },
  s3: { id: "s3", walletAddress: bob, role: "MEMBER", createdAt: now, expiresAt: now + 100, revokedAt: null },
};
const denied: string[] = [];
const deps: Deps = {
  getSession: async (id) => sessions[id] ?? null,
  getUser: async (a) => users[a] ?? null,
  getCircleMeta: async (id) => (id === 7 ? { circleId: 7, name: "x", description: null, organizerWallet: bob, demo: false, createdAt: now } : null),
  circleCreator: async (id) => (id === 8 ? bob.toUpperCase().replace("0X", "0x") : null),
  secret: () => secret,
  audit: (_req, action) => { denied.push(action); },
};
const token = (sub: string, jti: string, exp = now + 100) => signJwt({ sub, role: "MEMBER", jti, iat: now, exp }, secret);
const reqWith = (auth?: string, params: Record<string, string> = {}): Request => ({ headers: auth ? { authorization: auth } : {}, params, method: "GET", path: "/x" } as unknown as Request);
const run = (mw: ReturnType<typeof mwMod.requireAuth>, req: Request): Promise<unknown> =>
  new Promise((resolve) => { mw(req, {} as Response, (e?: unknown) => resolve(e)); });
const code = (e: unknown) => (e instanceof ApiError ? `${e.status} ${e.code}` : String(e));

test("requireAuth: NO_AUTH / BAD_TOKEN / SESSION_REVOKED and role from the User row", async () => {
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith())), "401 NO_AUTH");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith("Bearer nope"))), "401 BAD_TOKEN");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith("Token x"))), "401 BAD_TOKEN");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith(`Bearer ${token(alice, "s1", now - 1)}`))), "401 BAD_TOKEN");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith(`Bearer ${token(bob, "s2")}`))), "401 SESSION_REVOKED");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith(`Bearer ${token(bob, "missing")}`))), "401 SESSION_REVOKED");
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith(`Bearer ${token(alice, "s3")}`))), "401 SESSION_REVOKED"); // sub ≠ session wallet
  const req = reqWith(`Bearer ${token(alice, "s1")}`);
  assert.equal(await run(mwMod.requireAuth(deps), req), undefined);
  assert.equal(req.auth?.role, "ADMIN"); // from users table, not the session/JWT
  assert.equal(req.auth?.address, alice);
});

test("requireAuth: suspended user → 403 SUSPENDED; optionalAuth is anonymous without a header", async () => {
  users[bob].status = "SUSPENDED";
  assert.equal(code(await run(mwMod.requireAuth(deps), reqWith(`Bearer ${token(bob, "s3")}`))), "403 SUSPENDED");
  users[bob].status = "ACTIVE";
  const req = reqWith();
  assert.equal(await run(mwMod.optionalAuth(deps), req), undefined);
  assert.equal(req.auth, undefined);
  assert.equal(code(await run(mwMod.optionalAuth(deps), reqWith("Bearer bad"))), "401 BAD_TOKEN");
});

test("requireRole / requireSelfOrAdmin / assertOrganizer", async () => {
  const asBob = reqWith(); asBob.auth = { address: bob, role: "MEMBER", jti: "s3", exp: now + 100 };
  const asAlice = reqWith(); asAlice.auth = { address: alice, role: "ADMIN", jti: "s1", exp: now + 100 };
  assert.equal(code(await run(mwMod.requireRole("ADMIN"), asBob)), "403 FORBIDDEN");
  assert.equal(await run(mwMod.requireRole("ADMIN"), asAlice), undefined);
  assert.equal(code(await run(mwMod.requireRole("ADMIN"), reqWith())), "401 NO_AUTH");

  const self = reqWith(undefined, { addr: bob.toUpperCase().replace("0X", "0x") }); self.auth = asBob.auth;
  assert.equal(await run(mwMod.requireSelfOrAdmin("addr"), self), undefined);
  const other = reqWith(undefined, { addr: alice }); other.auth = asBob.auth;
  assert.equal(code(await run(mwMod.requireSelfOrAdmin("addr"), other)), "403 FORBIDDEN");
  const adminOther = reqWith(undefined, { addr: bob }); adminOther.auth = asAlice.auth;
  assert.equal(await run(mwMod.requireSelfOrAdmin("addr"), adminOther), undefined);

  await mwMod.assertOrganizer(asAlice, 1, deps); // ADMIN passes any circle
  await mwMod.assertOrganizer(asBob, 7, deps); // CircleMeta organizer
  await mwMod.assertOrganizer(asBob, 8, deps); // on-chain creator (checksum-insensitive)
  await assert.rejects(mwMod.assertOrganizer(asBob, 9, deps), (e: unknown) => code(e) === "403 NOT_ORGANIZER");
  const p = reqWith(undefined, { id: "9" }); p.auth = asBob.auth;
  assert.equal(code(await run(mwMod.requireCircleOrganizer("id", deps), p)), "403 NOT_ORGANIZER");
  const bad = reqWith(undefined, { id: "x" }); bad.auth = asBob.auth;
  assert.equal(code(await run(mwMod.requireCircleOrganizer("id", deps), bad)), "400 BAD_ID");
  assert.ok(denied.includes("auth.denied"));
});
