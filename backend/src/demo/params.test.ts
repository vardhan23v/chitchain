import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEther } from "ethers";
import { deployerCanCover, fundingPlan, GAS_RESERVE, unassessedJoinCollateral, validateTierBps } from "./params";

test("tier bps: any 0 is rejected even though the contract only checks ordering", () => {
  assert.equal(validateTierBps({ lowBps: 5000, mediumBps: 10_000, highBps: 20_000 }), null);
  assert.match(validateTierBps({ lowBps: 0, mediumBps: 10_000, highBps: 20_000 }) ?? "", /lowBps/);
  assert.match(validateTierBps({ lowBps: 5000, mediumBps: 0, highBps: 20_000 }) ?? "", /mediumBps/);
  assert.match(validateTierBps({ lowBps: 5000, mediumBps: 10_000, highBps: 0 }) ?? "", /highBps/);
  assert.match(validateTierBps({ lowBps: 5000, mediumBps: 10_000, highBps: 70_000 }) ?? "", /uint16/);
});
test("tier bps: ordering low <= medium <= high", () => {
  assert.match(validateTierBps({ lowBps: 10_001, mediumBps: 10_000, highBps: 20_000 }) ?? "", /ordering|<=/);
  assert.match(validateTierBps({ lowBps: 5000, mediumBps: 30_000, highBps: 20_000 }) ?? "", /ordering|<=/);
  assert.equal(validateTierBps({ lowBps: 1, mediumBps: 1, highBps: 1 }), null);
});
test("unassessed join collateral = base × highBps / 10000", () => {
  assert.equal(unassessedJoinCollateral(parseEther("0.1"), 20_000), parseEther("0.2"));
  assert.equal(unassessedJoinCollateral(parseEther("1"), 5000), parseEther("0.5"));
});
test("funding plan lists each short wallet with balance / required / shortfall", () => {
  const collateral = parseEther("0.2");
  const plan = fundingPlan([
    { label: "A", address: "0xa", balance: parseEther("1") },
    { label: "B", address: "0xb", balance: parseEther("0.21") },
    { label: "C", address: "0xc", balance: 0n },
  ], collateral);
  assert.equal(plan.required, collateral + GAS_RESERVE);
  assert.deepEqual(plan.short.map((s) => s.label), ["B", "C"]);
  assert.equal(plan.short[0].shortfall, (parseEther("0.01")).toString());
  assert.equal(plan.short[1].shortfall, plan.required.toString());
  assert.equal(plan.totalShortfall, parseEther("0.01") + plan.required);
});
test("deployer must keep its own gas reserve after covering the shortfall", () => {
  assert.equal(deployerCanCover(parseEther("1"), parseEther("0.5")), true);
  assert.equal(deployerCanCover(parseEther("0.51"), parseEther("0.5")), false);
  assert.equal(deployerCanCover(parseEther("0.52"), parseEther("0.5")), true);
});
