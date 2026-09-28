import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreReputation, tierOf } from "./score";
import { SYNTHETIC_SEED } from "./seed";

// Risk score: lower is safer. Low ≤ 39, Medium 40–69, High ≥ 70.

test("cold start → 40 Medium, no division by zero", () => {
  const s = scoreReputation({ paidOnTime: 0, missed: 0, circlesCompleted: 0, circlesRemoved: 0 });
  assert.equal(s.score, 40);
  assert.equal(s.tier, 2);
  assert.ok(s.factors.some((f) => f.effect.includes("cold start")));
});

test("good history → Low (60 − 40 − 6.7)", () => {
  const s = scoreReputation({ paidOnTime: 12, missed: 0, circlesCompleted: 2, circlesRemoved: 0 });
  assert.equal(s.score, 13.3);
  assert.equal(s.tier, 1);
  assert.equal(s.factors.find((f) => f.name === "On-time rate")?.effect, "−40");
  assert.equal(s.factors.find((f) => f.name === "Removed from a circle")?.effect, "0");
});

test("bad history (missed 6 of 10, removed once) → High", () => {
  const s = scoreReputation({ paidOnTime: 4, missed: 6, circlesCompleted: 0, circlesRemoved: 1 });
  assert.equal(s.score, 74);
  assert.equal(s.tier, 3);
  assert.equal(s.factors.find((f) => f.name === "Removed from a circle")?.effect, "+30");
});

test("removed once but otherwise decent → Medium (60 − 28 + 30 = 62)", () => {
  assert.equal(scoreReputation({ paidOnTime: 7, missed: 3, circlesCompleted: 0, circlesRemoved: 1 }).tier, 2);
});

test("patchy history → Medium; completed circles capped at 3", () => {
  assert.equal(scoreReputation({ paidOnTime: 5, missed: 5, circlesCompleted: 0, circlesRemoved: 0 }).score, 40);
  assert.equal(scoreReputation({ paidOnTime: 5, missed: 5, circlesCompleted: 0, circlesRemoved: 0 }).tier, 2);
  const capped = scoreReputation({ paidOnTime: 10, missed: 0, circlesCompleted: 9, circlesRemoved: 0 });
  assert.equal(capped.score, 10);
});

test("clamped to 0–100 and thresholds", () => {
  const worst = scoreReputation({ paidOnTime: 0, missed: 10, circlesCompleted: 0, circlesRemoved: 5 });
  assert.equal(worst.score, 90);
  assert.equal(worst.tier, 3);
  assert.equal(tierOf(39), 1);
  assert.equal(tierOf(39.9), 1);
  assert.equal(tierOf(40), 2);
  assert.equal(tierOf(69.9), 2);
  assert.equal(tierOf(70), 3);
  assert.equal(tierOf(0), 1);
});

test("synthetic seed yields A Low, B Medium, C Low, D High, E Medium", () => {
  const tiers = Object.fromEntries(Object.entries(SYNTHETIC_SEED).map(([k, v]) => [k, scoreReputation(v).tier]));
  assert.deepEqual(tiers, { A: 1, B: 2, C: 1, D: 3, E: 2 });
});
