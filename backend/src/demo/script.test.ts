import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "ethers";
import { demoScript, discountForOffer } from "./script";

test("round 2 declines and offers descend so every bid is a lower payout than the last", () => {
  const s = demoScript(2);
  assert.equal(s.decision, "decline");
  const pcts = s.offers.map((o) => o.payoutPct);
  assert.deepEqual([...pcts].sort((a, b) => b - a), pcts);
  assert.equal(s.offers.at(-1)?.label, "D");
});

test("rounds 1, 3 and 4 accept; round 4 skips D's contribution", () => {
  assert.equal(demoScript(1).decision, "accept");
  assert.equal(demoScript(3).decision, "accept");
  assert.deepEqual(demoScript(4).skip, ["D"]);
});

test("discount for a payout offer is pot − payout (500 → 450 gives 50)", () => {
  assert.equal(discountForOffer(parseEther("500"), 90), parseEther("50"));
  assert.equal(discountForOffer(parseEther("0.5"), 96), parseEther("0.02"));
  assert.equal(discountForOffer(parseEther("1"), 100), 0n);
});
