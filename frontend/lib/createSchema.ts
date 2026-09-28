import { z } from "zod";
import { BPS } from "@/lib/chain";
import { toWei } from "@/lib/format";

const decimal = (label: string) =>
  z.string().trim().refine((v) => /^\d*\.?\d+$/.test(v) && Number(v) > 0, `${label} must be a positive number`);

const multiplier = (label: string) => z.number().min(0.01, `${label} multiplier must be > 0`).max(10, `${label} multiplier must be ≤ 10×`);

export const createSchema = z
  .object({
    /** v3: off-chain circle name (stored by the backend on claim). */
    name: z.string().trim().min(2, "Name must be 2–60 characters").max(60, "Name must be 2–60 characters"),
    description: z.string().trim().max(500, "Keep the description under 500 characters").optional().or(z.literal("")),
    contribution: decimal("Contribution"),
    maxMembers: z.number().int().min(2).max(20),
    contributionDuration: z.number().int().positive(),
    biddingDuration: z.number().int().positive(),
    joinWindow: z.number().int().min(60, "Join window must be at least 1 minute"),
    feePct: z.number().min(0).max(3),
    baseCollateral: decimal("Base collateral"),
    holdbackPct: z.number().min(0).max(100, "Holdback is at most 100%"),
    maxDiscountPct: z.number().min(0).max(50, "Max discount is at most 50% of the pot"),
    lowMult: multiplier("Low"),
    mediumMult: multiplier("Medium"),
    highMult: multiplier("High"),
  })
  .refine((v) => Number(v.baseCollateral) >= Number(v.contribution), {
    message: "Base collateral must be at least the contribution",
    path: ["baseCollateral"],
  })
  .refine((v) => v.lowMult <= v.mediumMult, { message: "Low multiplier must be ≤ Medium", path: ["lowMult"] })
  .refine((v) => v.mediumMult <= v.highMult, { message: "Medium multiplier must be ≤ High", path: ["highMult"] });

export type CreateInput = z.infer<typeof createSchema>;

/** Contract v2 `CircleParams` struct (bps = basis points). */
export interface CircleParams {
  contribution: bigint;
  baseCollateral: bigint;
  maxMembers: number;
  contributionDuration: number;
  biddingDuration: number;
  joinWindow: number;
  feeBps: number;
  holdbackBps: number;
  maxDiscountBps: number;
  lowBps: number;
  mediumBps: number;
  highBps: number;
}

export const pctToBps = (pct: number) => Math.round(pct * 100);
export const multToBps = (m: number) => Math.round(m * BPS);

export function toCircleParams(d: CreateInput): CircleParams {
  return {
    contribution: toWei(d.contribution),
    baseCollateral: toWei(d.baseCollateral),
    maxMembers: d.maxMembers,
    contributionDuration: d.contributionDuration,
    biddingDuration: d.biddingDuration,
    joinWindow: d.joinWindow,
    feeBps: pctToBps(d.feePct),
    holdbackBps: pctToBps(d.holdbackPct),
    maxDiscountBps: pctToBps(d.maxDiscountPct),
    lowBps: multToBps(d.lowMult),
    mediumBps: multToBps(d.mediumMult),
    highBps: multToBps(d.highMult),
  };
}

export const WINDOW_OPTIONS = [
  { value: 30, label: "30 s (demo)" },
  { value: 60, label: "1 min" },
  { value: 300, label: "5 min" },
  { value: 86400, label: "1 day" },
  { value: 2592000, label: "30 days" },
] as const;

export const JOIN_WINDOW_OPTIONS = [
  { value: 600, label: "10 min" },
  { value: 3600, label: "1 hour" },
  { value: 86400, label: "1 day" },
  { value: 604800, label: "7 days" },
] as const;

export const DEFAULTS: CreateInput = {
  name: "",
  description: "",
  contribution: "1",
  maxMembers: 5,
  contributionDuration: 30,
  biddingDuration: 30,
  joinWindow: 600,
  feePct: 1,
  baseCollateral: "1",
  holdbackPct: 10,
  maxDiscountPct: 40,
  lowMult: 0.5,
  mediumMult: 1,
  highMult: 2,
};
