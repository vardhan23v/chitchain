import type { Reputation } from "./seed";

export type Tier = 0 | 1 | 2 | 3; // Unassessed, Low, Medium, High
export interface Factor { name: string; value: string; effect: string }
export interface Score { score: number; tier: Tier; factors: Factor[] }

const fmt = (x: number): string => (Number.isInteger(x) ? String(x) : x.toFixed(1));
const signed = (x: number): string => (x > 0 ? `+${fmt(x)}` : x < 0 ? `−${fmt(Math.abs(x))}` : "0");

/**
 * Deterministic heuristic — a RISK score, so LOWER IS SAFER (weights are judgement calls, not a credit score).
 *   cold start (paidOnTime + missed == 0) → 40 (Medium)
 *   riskScore = 60 − 40·onTimeRate − 10·min(completed,3)/3 + 30·(removed > 0), clamped 0–100
 *   Low ≤ 39 (Tier 1) · Medium 40–69 (Tier 2) · High ≥ 70 (Tier 3)
 */
export const COLD_START_SCORE = 40;
export function scoreReputation(r: Reputation): Score {
  const total = r.paidOnTime + r.missed;
  if (total === 0) {
    return {
      score: COLD_START_SCORE,
      tier: tierOf(COLD_START_SCORE),
      factors: [{ name: "Payment history", value: "none yet", effect: `cold start → ${COLD_START_SCORE}` }],
    };
  }
  const onTimeRate = r.paidOnTime / total;
  const onTime = -40 * onTimeRate;
  const completed = -(10 * Math.min(r.circlesCompleted, 3)) / 3;
  const removedPenalty = r.circlesRemoved > 0 ? 30 : 0;
  const raw = 60 + onTime + completed + removedPenalty;
  const score = Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10;
  return {
    score,
    tier: tierOf(score),
    factors: [
      { name: "Base", value: "everyone starts here", effect: "+60" },
      { name: "On-time rate", value: `${Math.round(onTimeRate * 100)}% (${r.paidOnTime}/${total})`, effect: signed(onTime) },
      { name: "Circles completed", value: `${r.circlesCompleted}${r.circlesCompleted > 3 ? " (capped at 3)" : ""}`, effect: signed(completed) },
      { name: "Removed from a circle", value: r.circlesRemoved > 0 ? `${r.circlesRemoved} time(s)` : "never", effect: signed(removedPenalty) },
    ],
  };
}

/** Risk tier from a risk score: lower is safer. */
export function tierOf(score: number): Tier {
  if (score >= 70) return 3;
  if (score >= 40) return 2;
  return 1;
}

export const TIER_LABEL: Record<Tier, string> = { 0: "Unassessed", 1: "Low", 2: "Medium", 3: "High" };
