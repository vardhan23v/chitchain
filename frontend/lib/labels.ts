import type { CircleSummary, ContributionStatus, DefaultStatus, RoundOutcome, RoundPhase, Status, Tier } from "@/lib/types";
import { bpsToMultiplier, tierBps } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

export const TIER_LABEL: Record<Tier, string> = { 0: "Unassessed · 2×", 1: "Low risk · 0.5×", 2: "Medium · 1×", 3: "High risk · 2×" };
export const TIER_NAME: Record<Tier, string> = { 0: "Unassessed", 1: "Low", 2: "Medium", 3: "High" };
export const STATUS_LABEL: Record<Status, string> = { 0: "Open", 1: "Active", 2: "Completed", 3: "Cancelled" };

/** Tier label using the circle's own multipliers when known ("Low risk · 0.5×"). */
export function tierLabelFor(tier: Tier, c?: Pick<CircleSummary, "lowBps" | "mediumBps" | "highBps"> | null): string {
  const base = TIER_LABEL[tier] ?? TIER_LABEL[0];
  if (!c) return base;
  return `${base.split(" · ")[0]} · ${bpsToMultiplier(tierBps(c, tier))}`;
}

export const PHASE_LABEL: Record<RoundPhase, string> = {
  contribution: "Contributions open",
  closing: "Closing contributions…",
  decision: "Recipient deciding",
  bidding: "Auction open",
  settling: "Settling…",
};

/** How a settled round ended, in plain words. */
export const OUTCOME_LABEL: Record<RoundOutcome, string> = {
  NONE: "Settled",
  ACCEPTED: "Full pot accepted",
  AUCTION: "Won at auction",
  DECISION_TIMEOUT: "Full pot, no decision in time",
  NO_BIDS: "Declined, no offers, full pot",
  NO_RECIPIENT: "Shared as dividends",
};

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  COVERED_BY_COLLATERAL: "Covered by collateral",
  PARTIALLY_COVERED: "Partially covered",
  DEFAULTED: "Defaulted",
};

export const DEFAULT_STATUS_LABEL: Record<DefaultStatus, string> = {
  COVERED_BY_COLLATERAL: "Covered by collateral",
  PARTIALLY_COVERED: "Partially covered",
};

/** Backend attaches `label` (A–E) to demo wallets; otherwise show the short address. */
export function memberLabel(label: string | null | undefined, address: string): string {
  return label ? `Member ${label}` : shortAddr(address);
}

/**
 * Display name for a wallet: its username when it has one, else "Demo A" for custodial demo wallets, else the short
 * address. Always render the short address next to it (see `MemberName`) so the name can be verified.
 */
export function nameOf(m: { username?: string | null; label?: string | null; address: string }): string {
  if (m.username) return m.username;
  if (m.label) return `Demo ${m.label}`;
  return shortAddr(m.address);
}

export function memberShort(label: string | null | undefined, address: string): string {
  return label ?? shortAddr(address);
}

export const TOOLTIPS = {
  collateral: "MST locked when you join. It automatically covers any round you miss.",
  holdback: "Held back from a winner's payout to secure their future contributions. Released at completion.",
  reserve: "Fees and forfeits kept by the contract to cover shortfalls. Leftover goes to the treasury at the end.",
  discount: "The part of the pot you give up to win this round. Discount = pot − the payout you accept. It is shared as dividends with the other members.",
  dividend: "Your share of the winner's discount, credited to your claimable balance.",
  pot: "Sum of this round's contributions. It sits in the contract until settlement.",
  acceptedPayout: "The lowest payout you'd take to win this round. The member accepting the lowest payout wins; the rest is shared as dividends.",
} as const;

export const HONEST_LIMITS = "Testnet prototype · heuristic risk model · experimental AI bidding · unaudited contract";
export const TESTNET_DISCLAIMER = "All amounts are MST testnet coins with no monetary value. Not a registered chit fund.";
