import { z } from "zod";
import { big, formatMst } from "@/lib/format";
import type { Level } from "@/lib/types";

export type DurationChoice = "auction" | "1h" | "24h";
export const DURATION_OPTIONS: { value: DurationChoice; label: string; sec: number | null }[] = [
  { value: "auction", label: "Until the auction ends", sec: null },
  { value: "1h", label: "1 hour", sec: 3600 },
  { value: "24h", label: "24 hours", sec: 86_400 },
];
export const LEVELS: Level[] = ["low", "medium", "high"];
export const LEVEL_LABEL: Record<Level, string> = { low: "Low", medium: "Medium", high: "High" };

/** What the form collects; MST amounts stay decimal strings until the backend converts them. */
export interface StrategyValues {
  goal: string;
  desiredPayout: string;
  maxDiscount: string;
  maxDiscountPct: number;
  urgency: Level;
  riskTolerance: Level;
  duration: DurationChoice;
  autonomous: boolean;
  demoMode: boolean;
}

export const EMPTY_STRATEGY: StrategyValues = {
  goal: "",
  desiredPayout: "",
  maxDiscount: "",
  maxDiscountPct: 20,
  urgency: "medium",
  riskTolerance: "medium",
  duration: "auction",
  autonomous: false,
  demoMode: true,
};

/** MST number from a wei string, NaN when unknown. */
export function mstOf(wei: string | null | undefined): number {
  if (!wei) return NaN;
  return Number(formatMst(wei, 6).replace(/,/g, ""));
}

const decimal = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d*\.?\d*$/.test(v), `${label} must be a number.`);

/**
 * Validation, relative to the current pot (MST). When the pot is unknown the pot-based checks are skipped
 * so the form still works while the auction snapshot loads.
 */
export function strategySchema(potMst: number) {
  const hasPot = Number.isFinite(potMst) && potMst > 0;
  return z
    .object({
      goal: z.string().trim().min(3, "Describe your goal in at least 3 characters.").max(200, "Keep the goal under 200 characters."),
      desiredPayout: decimal("Desired payout"),
      maxDiscount: decimal("Maximum discount"),
      maxDiscountPct: z.number({ invalid_type_error: "Enter a percentage." }).min(1, "Maximum discount must be at least 1%.").max(50, "Maximum discount cannot exceed 50%."),
      urgency: z.enum(["low", "medium", "high"]),
      riskTolerance: z.enum(["low", "medium", "high"]),
      duration: z.enum(["auction", "1h", "24h"]),
      autonomous: z.boolean(),
      demoMode: z.boolean(),
    })
    .superRefine((v, ctx) => {
      const payout = v.desiredPayout === "" ? null : Number(v.desiredPayout);
      const maxD = Number(v.maxDiscount);
      if (v.maxDiscount === "" || !Number.isFinite(maxD) || maxD <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxDiscount"], message: "Maximum discount must be more than 0 MST." });
      } else if (hasPot && maxD > (potMst * v.maxDiscountPct) / 100 + 1e-9) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxDiscount"], message: `Maximum discount cannot exceed ${v.maxDiscountPct}% of the pot (${fmtMst((potMst * v.maxDiscountPct) / 100)} MST).` });
      }
      if (payout !== null) {
        if (!Number.isFinite(payout) || payout <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["desiredPayout"], message: "Desired payout must be more than 0 MST." });
        } else if (hasPot && payout >= potMst) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["desiredPayout"], message: `Desired payout must be below the pot (${fmtMst(potMst)} MST).` });
        }
      }
    });
}

export type StrategyErrors = Partial<Record<keyof StrategyValues, string>>;

export function validateStrategy(values: StrategyValues, potMst: number): { ok: true } | { ok: false; errors: StrategyErrors } {
  const r = strategySchema(potMst).safeParse(values);
  if (r.success) return { ok: true };
  const errors: StrategyErrors = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof StrategyValues | undefined;
    if (k && !errors[k]) errors[k] = issue.message;
  }
  return { ok: false, errors };
}

export function fmtMst(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function durationSec(d: DurationChoice): number | null {
  return DURATION_OPTIONS.find((o) => o.value === d)?.sec ?? null;
}

export function durationLabel(sec: number | null | undefined): string {
  return DURATION_OPTIONS.find((o) => o.sec === (sec ?? null))?.label ?? (sec ? `${Math.round(sec / 3600)} hours` : "Until the auction ends");
}

/** Payout implied by a discount against the pot (wei strings). */
export function payoutFor(pot: string | null | undefined, discount: string | null | undefined): bigint | null {
  const p = big(pot);
  const d = big(discount);
  if (p === 0n) return null;
  return p > d ? p - d : 0n;
}
