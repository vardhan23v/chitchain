import { test } from "node:test";
import assert from "node:assert/strict";
import { decideBid, isUrgent, pctOfPot, type RoundFacts } from "./guardrails";

const pot = 500_000_000_000_000_000n; // 0.5 MSTC
const base: RoundFacts = { expectedPot: pot, maxDiscount: pctOfPot(pot, 40), bestDiscount: 0n, eligible: true, isBestBidder: false, roundOpen: true, mandateMaxPct: null };

test("urgency detection", () => {
  assert.ok(isUrgent("I need money this month"));
  assert.ok(isUrgent("ASAP please"));
  assert.ok(!isUrgent("no hurry, maximise dividends"));
});

test("fallback: urgent → best + 5% of pot; relaxed → skip", () => {
  const d = decideBid(base, null, "I need money this month");
  assert.equal(d.bid, pctOfPot(pot, 5));
  assert.equal(d.source, "fallback");
  const s = decideBid(base, null, "no hurry, maximise dividends");
  assert.equal(s.bid, null);
});

test("not eligible / already best bidder / closed → skip", () => {
  assert.equal(decideBid({ ...base, eligible: false }, null, "need").bid, null);
  assert.equal(decideBid({ ...base, isBestBidder: true }, null, "need").bid, null);
  assert.equal(decideBid({ ...base, roundOpen: false }, null, "need").bid, null);
});

test("llm plan: clamps to contract max and bumps above best", () => {
  const plan = { bidThisRound: true, discountPct: 90, reason: "r" };
  assert.equal(decideBid(base, plan, "x").bid, pctOfPot(pot, 40));
  const low = { bidThisRound: true, discountPct: 2, reason: "r" };
  const d = decideBid({ ...base, bestDiscount: pctOfPot(pot, 10) }, low, "x");
  assert.equal(d.bid, pctOfPot(pot, 11));
});

test("never exceeds mandate max; skips when best already at cap", () => {
  const f = { ...base, mandateMaxPct: 10, bestDiscount: pctOfPot(pot, 10) };
  assert.equal(decideBid(f, { bidThisRound: true, discountPct: 30, reason: "r" }, "x").bid, null);
  assert.equal(decideBid(f, null, "need now").bid, null);
  const ok = decideBid({ ...base, mandateMaxPct: 10 }, { bidThisRound: true, discountPct: 30, reason: "r" }, "x");
  assert.equal(ok.bid, pctOfPot(pot, 10));
});
