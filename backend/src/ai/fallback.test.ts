import { test } from "node:test";
import assert from "node:assert/strict";
import { capFor, clampDecision, fallbackDecide, minWinning, type FallbackAuction, type FallbackStrategy } from "./fallback";
import { pctOfPot } from "./riskGuard";
import type { Decision } from "./types";

const pot = 500_000_000_000_000_000n; // 0.5 MST
const strategy: FallbackStrategy = { desiredPayout: null, maxDiscount: pctOfPot(pot, 20), maxDiscountPct: 20, urgency: "medium", riskTolerance: "medium" };
const auction: FallbackAuction = { status: "BIDDING", expectedPot: pot, bestDiscount: pctOfPot(pot, 5), contractMaxDiscount: pctOfPot(pot, 40), secondsRemaining: 60, biddingWindowSec: 100 };

test("not in bidding phase → WAIT without a bid", () => {
  const d = fallbackDecide(strategy, { ...auction, status: "CONTRIBUTION" });
  assert.equal(d.decision, "WAIT"); assert.equal(d.discount, null); assert.equal(d.source, "fallback");
});
test("cap = min(agent wei, agent %, contract max, 10 % when low risk)", () => {
  assert.equal(capFor(strategy, auction), pctOfPot(pot, 20));
  assert.equal(capFor({ ...strategy, maxDiscountPct: 15 }, auction), pctOfPot(pot, 15));
  assert.equal(capFor({ ...strategy, maxDiscount: pot, maxDiscountPct: 50 }, auction), pctOfPot(pot, 40));
  assert.equal(capFor({ ...strategy, riskTolerance: "low" }, auction), pctOfPot(pot, 10));
});
test("desired payout → discount = pot − desired, beats the best", () => {
  const d = fallbackDecide({ ...strategy, desiredPayout: pctOfPot(pot, 90) }, auction);
  assert.equal(d.decision, "BID"); assert.equal(d.discount, pctOfPot(pot, 10)); assert.equal(d.reasonCode, "DESIRED_PAYOUT");
});
test("desired payout unreachable within the cap → STOP", () => {
  const d = fallbackDecide({ ...strategy, desiredPayout: pctOfPot(pot, 70) }, auction);
  assert.equal(d.decision, "STOP"); assert.equal(d.reasonCode, "PAYOUT_UNREACHABLE"); assert.equal(d.discount, null);
});
test("desired payout already met by the current best → WAIT (medium urgency, time remains)", () => {
  const d = fallbackDecide({ ...strategy, desiredPayout: pctOfPot(pot, 96) }, auction);
  assert.equal(d.decision, "WAIT"); assert.equal(d.reasonCode, "PAYOUT_ACCEPTABLE");
});
test("high urgency → best + 5 % of pot, capped", () => {
  const d = fallbackDecide({ ...strategy, urgency: "high" }, auction);
  assert.equal(d.decision, "BID"); assert.equal(d.discount, pctOfPot(pot, 10));
  const capped = fallbackDecide({ ...strategy, urgency: "high" }, { ...auction, bestDiscount: pctOfPot(pot, 18) });
  assert.equal(capped.discount, pctOfPot(pot, 20));
});
test("low urgency → WAIT while more than 25 % of the window remains, then smallest winning bid", () => {
  assert.equal(fallbackDecide({ ...strategy, urgency: "low" }, auction).decision, "WAIT");
  const late = fallbackDecide({ ...strategy, urgency: "low" }, { ...auction, secondsRemaining: 20 });
  assert.equal(late.decision, "BID"); assert.equal(late.discount, minWinning(auction)); assert.equal(late.reasonCode, "NEAR_EXPIRY");
});
test("best already at the cap → STOP MAX_REACHED (never bids above the max)", () => {
  const d = fallbackDecide({ ...strategy, urgency: "high" }, { ...auction, bestDiscount: pctOfPot(pot, 20) });
  assert.equal(d.decision, "STOP"); assert.equal(d.reasonCode, "MAX_REACHED"); assert.equal(d.discount, null);
});
test("clampDecision: crew proposals are clamped into the caps, bumped above the best, or turned into STOP", () => {
  const base: Decision = { decision: "BID", discount: pctOfPot(pot, 30), reasonCode: "X", reason: "r", confidence: 0.9, source: "crew", analyst: null };
  assert.equal(clampDecision(base, strategy, auction).discount, pctOfPot(pot, 20));
  assert.equal(clampDecision({ ...base, discount: pctOfPot(pot, 2) }, strategy, auction).discount, minWinning(auction));
  assert.equal(clampDecision({ ...base, discount: null }, strategy, auction).decision, "WAIT");
  assert.equal(clampDecision(base, strategy, { ...auction, bestDiscount: pctOfPot(pot, 20) }).decision, "STOP");
  assert.equal(clampDecision({ ...base, decision: "WAIT", discount: pctOfPot(pot, 8) }, strategy, auction).discount, null);
});
