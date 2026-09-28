import { z } from "zod";

const decimal = (label: string) =>
  z.string().trim().refine((v) => /^\d*\.?\d+$/.test(v) && Number(v) > 0, `${label} must be a positive number`);

export const createSchema = z
  .object({
    contribution: decimal("Contribution"),
    maxMembers: z.number().int().min(3).max(20),
    roundDuration: z.number().int().positive(),
    joinWindow: z.number().int().min(60, "Join window must be at least 1 minute"),
    feePct: z.number().min(0).max(3),
    baseCollateral: decimal("Base collateral"),
  })
  .refine((v) => Number(v.baseCollateral) >= Number(v.contribution), {
    message: "Base collateral must be at least the contribution",
    path: ["baseCollateral"],
  });

export type CreateInput = z.infer<typeof createSchema>;

export const ROUND_OPTIONS = [
  { value: 30, label: "30 s (demo)" },
  { value: 60, label: "1 min" },
  { value: 86400, label: "1 day" },
  { value: 2592000, label: "30 days" },
] as const;

export const JOIN_WINDOW_OPTIONS = [
  { value: 600, label: "10 min" },
  { value: 3600, label: "1 hour" },
  { value: 86400, label: "1 day" },
  { value: 604800, label: "7 days" },
] as const;

export const DEFAULTS: CreateInput = { contribution: "1", maxMembers: 5, roundDuration: 30, joinWindow: 600, feePct: 1, baseCollateral: "1" };
