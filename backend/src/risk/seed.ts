/**
 * Synthetic history for the custodial demo wallets A–E. Labelled SYNTHETIC everywhere it is shown.
 * A good · B patchy (paid 5 of 11) · C good · D bad (missed 6 of 10, removed once) · E thin (cold start).
 * Numbers are chosen so the risk heuristic in score.ts (lower is safer) yields A Low, B Medium, C Low, D High, E Medium.
 */
export interface Reputation { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number }

export const SYNTHETIC_SEED: Record<string, Reputation> = {
  A: { paidOnTime: 12, missed: 0, circlesCompleted: 2, circlesRemoved: 0 }, // risk ≈ 13.3 → Low
  B: { paidOnTime: 5, missed: 6, circlesCompleted: 0, circlesRemoved: 0 },  // risk ≈ 41.8 → Medium
  C: { paidOnTime: 10, missed: 0, circlesCompleted: 1, circlesRemoved: 0 }, // risk ≈ 16.7 → Low
  D: { paidOnTime: 4, missed: 6, circlesCompleted: 0, circlesRemoved: 1 },  // risk = 74 → High
  E: { paidOnTime: 0, missed: 0, circlesCompleted: 0, circlesRemoved: 0 },  // cold start → 40 Medium
};

export function seedFor(label: string | null): Reputation | null {
  if (!label) return null;
  return SYNTHETIC_SEED[label] ?? null;
}
