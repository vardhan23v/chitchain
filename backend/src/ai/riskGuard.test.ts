import { test } from "node:test";
import assert from "node:assert/strict";
import { GAS_RESERVE_WEI, pctOfPot, riskGuard, type RiskInput, type RiskReason } from "./riskGuard";

const pot = 500_000_000_000_000_000n; // 0.5 MST
const ok: RiskInput = {
  discount: pctOfPot(pot, 8),
  maxDiscount: pctOfPot(pot, 20), maxDiscountPct: 20, agentCircleId: 7, agentStatus: "ACTIVE", autonomous: true, expiresAt: 2_000,
  circleId: 7, round: 2, auctionStatus: "BIDDING", expectedPot: pot, contractMaxDiscount: pctOfPot(pot, 40), bestDiscount: pctOfPot(pot, 5),
  decisionRound: 2, isDemoWallet: true, balance: GAS_RESERVE_WEI * 10n,
  member: { joined: true, hasWon: false, removed: false, paidThisRound: true }, nowSec: 1_000,
};
const blocked = (i: Partial<RiskInput>): RiskReason | "ALLOWED" => { const r = riskGuard({ ...ok, ...i }); return r.allowed ? "ALLOWED" : r.reason; };

test("a sane bid passes", () => { assert.deepEqual(riskGuard(ok), { allowed: true }); });
test("MAX_BID_EXCEEDED: discount above the agent's wei cap", () => { assert.equal(blocked({ discount: pctOfPot(pot, 21) }), "MAX_BID_EXCEEDED"); });
test("MAX_DISCOUNT_PCT_EXCEEDED: discount above the agent's % of pot", () => {
  assert.equal(blocked({ maxDiscount: pot, maxDiscountPct: 6 }), "MAX_DISCOUNT_PCT_EXCEEDED");
});
test("ABOVE_CONTRACT_MAX: discount above the circle's max", () => {
  assert.equal(blocked({ maxDiscount: pot, maxDiscountPct: 50, discount: pctOfPot(pot, 45) }), "ABOVE_CONTRACT_MAX");
});
test("NOT_HIGHER_THAN_BEST: equal to or below the best bid", () => {
  assert.equal(blocked({ discount: ok.bestDiscount }), "NOT_HIGHER_THAN_BEST");
  assert.equal(blocked({ discount: ok.bestDiscount - 1n }), "NOT_HIGHER_THAN_BEST");
});
test("AUCTION_NOT_ACTIVE: every non-BIDDING phase", () => {
  for (const s of ["CONTRIBUTION", "SETTLING", "INACTIVE"] as const) assert.equal(blocked({ auctionStatus: s }), "AUCTION_NOT_ACTIVE");
});
test("WRONG_CIRCLE", () => { assert.equal(blocked({ circleId: 8 }), "WRONG_CIRCLE"); });
test("WRONG_ROUND: decision computed for an older round", () => { assert.equal(blocked({ decisionRound: 1 }), "WRONG_ROUND"); });
test("STRATEGY_EXPIRED (null expiry never expires)", () => {
  assert.equal(blocked({ nowSec: 2_001 }), "STRATEGY_EXPIRED");
  assert.equal(blocked({ nowSec: 2_001, expiresAt: null }), "ALLOWED");
});
test("AGENT_NOT_ENABLED: paused agent or autonomous off", () => {
  assert.equal(blocked({ agentStatus: "PAUSED" }), "AGENT_NOT_ENABLED");
  assert.equal(blocked({ autonomous: false }), "AGENT_NOT_ENABLED");
});
test("WALLET_UNAUTHORIZED: not a custodial demo wallet", () => { assert.equal(blocked({ isDemoWallet: false }), "WALLET_UNAUTHORIZED"); });
test("INSUFFICIENT_BALANCE: below the 0.02 MST gas reserve", () => {
  assert.equal(blocked({ balance: GAS_RESERVE_WEI - 1n }), "INSUFFICIENT_BALANCE");
  assert.equal(blocked({ balance: GAS_RESERVE_WEI }), "ALLOWED");
});
test("NOT_ELIGIBLE: won, removed, unpaid or not joined", () => {
  assert.equal(blocked({ member: { ...ok.member, hasWon: true } }), "NOT_ELIGIBLE");
  assert.equal(blocked({ member: { ...ok.member, removed: true } }), "NOT_ELIGIBLE");
  assert.equal(blocked({ member: { ...ok.member, paidThisRound: false } }), "NOT_ELIGIBLE");
  assert.equal(blocked({ member: { ...ok.member, joined: false } }), "NOT_ELIGIBLE");
});
test("order: the first failing check wins", () => {
  assert.equal(blocked({ discount: pot, auctionStatus: "INACTIVE", isDemoWallet: false }), "MAX_BID_EXCEEDED");
});
