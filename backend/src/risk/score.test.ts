import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreReputation, tierOf } from "./score";
import { SYNTHETIC_SEED } from "./seed";

test("cold start → 60 Medium, no division by zero", () => {
  const s = scoreReputation({ paidOnTime: 0, missed: 0, circlesCompleted: 0, circlesRemoved: 0 });
  assert.equal(s.score, 60);
  assert.equal(s.tier, 2);
  assert.ok(s.factors.some((f) => f.effect.includes("cold start")));
});

test("good history → Low", () => {
  const s = scoreReputation({ paidOnTime: 12, missed: 0, circlesCompleted: 2, circlesRemoved: 0 });
  assert.equal(s.score, 86.7);
  assert.equal(s.tier, 1);
});

test("bad history (missed 3 of 10, removed once) → High", () => {
  const s = scoreReputation({ paidOnTime: 7, missed: 3, circlesCompleted: 0, circlesRemoved: 1 });
  assert.equal(s.score, 38);
  assert.equal(s.tier, 3);
});

test("okay history → Medium; completed circles capped at 3", () => {
  assert.equal(scoreReputation({ paidOnTime: 7, missed: 3, circlesCompleted: 1, circlesRemoved: 0 }).tier, 2);
  const capped = scoreReputation({ paidOnTime: 10, missed: 0, circlesCompleted: 9, circlesRemoved: 0 });
  assert.equal(capped.score, 90);
});

test("clamped to 0–100 and thresholds", () => {
  const worst = scoreReputation({ paidOnTime: 0, missed: 10, circlesCompleted: 0, circlesRemoved: 5 });
  assert.equal(worst.score, 10);
  assert.equal(tierOf(75), 1);
  assert.equal(tierOf(74.9), 2);
  assert.equal(tierOf(50), 2);
  assert.equal(tierOf(49.9), 3);
});

test("synthetic seed yields A Low, B Medium, C Low, D High, E Medium", () => {
  const tiers = Object.fromEntries(Object.entries(SYNTHETIC_SEED).map(([k, v]) => [k, scoreReputation(v).tier]));
  assert.deepEqual(tiers, { A: 1, B: 2, C: 1, D: 3, E: 2 });
});
