/**
 * Synthetic history for the custodial demo wallets A–E. Labelled SYNTHETIC everywhere it is shown.
 * A good · B okay · C good · D bad (missed 3 of 10, removed once) · E thin (cold start).
 * Numbers are chosen so the heuristic in ARCHITECTURE.md §4.1 yields A Low, B Medium, C Low, D High, E Medium.
 */
export interface Reputation { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number }

export const SYNTHETIC_SEED: Record<string, Reputation> = {
  A: { paidOnTime: 12, missed: 0, circlesCompleted: 2, circlesRemoved: 0 }, // score ≈ 86.7 → Low
  B: { paidOnTime: 7, missed: 3, circlesCompleted: 1, circlesRemoved: 0 },  // score ≈ 71.3 → Medium
  C: { paidOnTime: 10, missed: 0, circlesCompleted: 1, circlesRemoved: 0 }, // score ≈ 83.3 → Low
  D: { paidOnTime: 7, missed: 3, circlesCompleted: 0, circlesRemoved: 1 },  // score = 38 → High
  E: { paidOnTime: 0, missed: 0, circlesCompleted: 0, circlesRemoved: 0 },  // cold start → 60 Medium
};

export function seedFor(label: string | null): Reputation | null {
  if (!label) return null;
  return SYNTHETIC_SEED[label] ?? null;
}
