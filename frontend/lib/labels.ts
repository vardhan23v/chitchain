import type { Status, Tier } from "@/lib/types";
import { shortAddr } from "@/lib/format";

export const TIER_LABEL: Record<Tier, string> = { 0: "Unassessed · 2×", 1: "Low risk · 0.5×", 2: "Medium · 1×", 3: "High risk · 2×" };
export const TIER_NAME: Record<Tier, string> = { 0: "Unassessed", 1: "Low", 2: "Medium", 3: "High" };
export const STATUS_LABEL: Record<Status, string> = { 0: "Open", 1: "Active", 2: "Completed", 3: "Cancelled" };

/** Backend attaches `label` (A–E) to demo wallets; otherwise show the short address. */
export function memberLabel(label: string | null | undefined, address: string): string {
  return label ? `Member ${label}` : shortAddr(address);
}

export function memberShort(label: string | null | undefined, address: string): string {
  return label ?? shortAddr(address);
}

export const TOOLTIPS = {
  collateral: "MSTC locked when you join. It automatically covers any round you miss.",
  holdback: "Held back to secure future contributions",
  reserve: "Fees and forfeits kept by the contract to cover shortfalls. Leftover goes to the treasury at the end.",
  discount: "The part of the pot you give up to win this round. It is shared as dividends with the other members.",
  dividend: "Your share of the winner's discount, credited to your claimable balance.",
  pot: "Sum of this round's contributions. It sits in the contract until settlement.",
} as const;
