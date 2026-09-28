import { test } from "node:test";
import assert from "node:assert/strict";
import { signJwt, verifyJwt, type Claims } from "./jwt";

const secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const claims: Claims = { sub: "0xabc", role: "MEMBER", jti: "j1", iat: 1000, exp: 2000 };

test("sign → verify round-trips the claims", () => {
  const t = signJwt(claims, secret);
  assert.equal(t.split(".").length, 3);
  const v = verifyJwt(t, secret, 1500);
  assert.ok(v.ok);
  if (v.ok) assert.deepEqual(v.claims, claims);
});

test("wrong secret / tampered payload / tampered signature fail", () => {
  const t = signJwt(claims, secret);
  assert.deepEqual(verifyJwt(t, "x".repeat(64), 1500), { ok: false, reason: "signature" });
  const [h, p, s] = t.split(".");
  const evil = Buffer.from(JSON.stringify({ ...claims, role: "ADMIN" })).toString("base64url");
  assert.deepEqual(verifyJwt(`${h}.${evil}.${s}`, secret, 1500), { ok: false, reason: "signature" });
  assert.deepEqual(verifyJwt(`${h}.${p}.${s.slice(0, -2)}AA`, secret, 1500), { ok: false, reason: "signature" });
});

test("expired token and alg=none are rejected; malformed input never throws", () => {
  const t = signJwt(claims, secret);
  assert.deepEqual(verifyJwt(t, secret, 2000), { ok: false, reason: "expired" });
  const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const [, p, s] = t.split(".");
  assert.deepEqual(verifyJwt(`${noneHeader}.${p}.${s}`, secret, 1500), { ok: false, reason: "alg" });
  assert.equal(verifyJwt("", secret).ok, false);
  assert.equal(verifyJwt("a.b", secret).ok, false);
  assert.equal(verifyJwt("!!.!!.!!", secret).ok, false);
});

test("claims must have the pinned shape", () => {
  const h = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url");
  const { createHmac } = require("node:crypto") as typeof import("node:crypto");
  const s = createHmac("sha256", secret).update(`${h}.${p}`).digest().toString("base64url");
  assert.deepEqual(verifyJwt(`${h}.${p}.${s}`, secret, 1), { ok: false, reason: "claims" });
});
