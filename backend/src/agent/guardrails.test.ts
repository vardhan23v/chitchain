import { test } from "node:test";
import assert from "node:assert/strict";
import { decideBid, isUrgent, pctOfPot, type RoundFacts } from "./guardrails";

const pot = 500_000_000_000_000_000n; // 0.5 MST
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

test("v2 fallback: desiredPayout → discount = pot − desired, phrased as lowest accepted payout in MST", () => {
  const d = decideBid({ ...base, desiredPayout: 450_000_000_000_000_000n }, null, "need it now");
  assert.equal(d.bid, 50_000_000_000_000_000n); // 0.05 MST discount
  assert.equal(d.source, "fallback");
  assert.match(d.reason, /lowest accepted payout becomes 0\.45 MST/);
  assert.match(d.reason, /0\.05 MST discount/);
});

test("v2 fallback: desiredPayout is clamped to the cap and must beat the best bid", () => {
  const capped = decideBid({ ...base, desiredPayout: 100_000_000_000_000_000n }, null, "x"); // wants 0.1 of 0.5 → 80% > 40% cap
  assert.equal(capped.bid, pctOfPot(pot, 40));
  const beaten = decideBid({ ...base, desiredPayout: 450_000_000_000_000_000n, bestDiscount: pctOfPot(pot, 20) }, null, "x");
  assert.equal(beaten.bid, null);
  assert.match(beaten.reason, /lowest accepted payout is already 0\.4 MST/);
  const noDiscount = decideBid({ ...base, desiredPayout: pot }, null, "x"); // wants the whole pot → 0 discount cannot beat best 0
  assert.equal(noDiscount.bid, null);
});

test("v2 fallback: urgency high bids best + 5% even without urgent words; riskTolerance low caps at 10% of pot", () => {
  const d = decideBid({ ...base, urgency: "high" }, null, "car repairs");
  assert.equal(d.bid, pctOfPot(pot, 5));
  assert.match(d.reason, /lowest accepted payout/);
  const lowRisk = decideBid({ ...base, riskTolerance: "low", desiredPayout: 100_000_000_000_000_000n }, null, "x");
  assert.equal(lowRisk.bid, pctOfPot(pot, 10));
  const lowRiskPlan = decideBid({ ...base, riskTolerance: "low" }, { bidThisRound: true, discountPct: 30, reason: "r" }, "x");
  assert.equal(lowRiskPlan.bid, pctOfPot(pot, 10));
  const lowRiskAtCap = decideBid({ ...base, riskTolerance: "low", bestDiscount: pctOfPot(pot, 10) }, null, "need now");
  assert.equal(lowRiskAtCap.bid, null);
});
