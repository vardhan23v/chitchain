import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { TokenBucket, rateLimit } = require("./ratelimit") as typeof import("./ratelimit");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApiError } = require("../routes/util") as typeof import("../routes/util");

test("TokenBucket: capacity, refill and per-key isolation", () => {
  let t = 0;
  const b = new TokenBucket(3, 3 / 60_000, () => t);
  assert.ok(b.take("a").ok); assert.ok(b.take("a").ok); assert.ok(b.take("a").ok);
  const r = b.take("a");
  assert.equal(r.ok, false);
  assert.ok(r.retryAfterMs > 0 && r.retryAfterMs <= 20_000);
  assert.ok(b.take("b").ok); // other key unaffected
  t += 20_000; // one token refilled
  assert.ok(b.take("a").ok);
  assert.equal(b.take("a").ok, false);
});

test("TokenBucket: idle entries are swept after a minute", () => {
  let t = 0;
  const b = new TokenBucket(2, 2 / 60_000, () => t);
  b.take("a"); b.take("b");
  assert.equal(b.size, 2);
  t += 61_000;
  b.take("c"); // triggers sweep; a and b are full again → dropped
  assert.equal(b.size, 1);
});

test("rateLimit middleware: 429 RATE_LIMITED with Retry-After after perMinute hits", () => {
  let t = 0;
  const mw = rateLimit({ perMinute: 2, keys: (req) => [`ip:${req.ip}`], clock: () => t });
  const headers: Record<string, string> = {};
  const res = { setHeader: (k: string, v: string) => { headers[k] = v; } } as unknown as Response;
  const req = { ip: "1.2.3.4" } as Request;
  const errs: unknown[] = [];
  const next = (e?: unknown) => { if (e) errs.push(e); };
  mw(req, res, next); mw(req, res, next); mw(req, res, next);
  assert.equal(errs.length, 1);
  const e = errs[0] as InstanceType<typeof ApiError>;
  assert.ok(e instanceof ApiError);
  assert.equal(e.status, 429); assert.equal(e.code, "RATE_LIMITED");
  assert.ok(Number(headers["Retry-After"]) >= 1);
  t += 60_000;
  mw(req, res, next);
  assert.equal(errs.length, 1);
});
