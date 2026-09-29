/**
 * Pure helpers for the demo circle flow (no chain / db access → unit-tested).
 *  - tier-bps validation: the contract only enforces ordering (lowBps <= mediumBps <= highBps, highBps > 0);
 *    a 0 multiplier would let a member join with zero collateral, so the backend rejects any 0 here.
 *  - join funding plan: every demo wallet needs its join collateral at the Unassessed/High multiplier
 *    (contract `_preWin`: Unassessed pays highBps) plus a gas reserve.
 */
import { parseEther } from "ethers";

export const BPS = 10_000n;
/** Gas the wallet must keep after joining (same reserve the Risk Guard uses). */
export const GAS_RESERVE = parseEther("0.02");
export const FAUCET_URL = "https://faucet.masterstroke.academy";

export interface TierBps { lowBps: number; mediumBps: number; highBps: number }
/** Returns null when valid, otherwise a human message. */
export function validateTierBps(t: TierBps): string | null {
  for (const k of ["lowBps", "mediumBps", "highBps"] as const) {
    const v = t[k];
    if (!Number.isInteger(v) || v <= 0) return `${k} must be a positive integer (0 would allow a zero-collateral join; the contract only enforces ordering)`;
    if (v > 65_535) return `${k} must fit uint16`;
  }
  if (t.lowBps > t.mediumBps || t.mediumBps > t.highBps) return "tier bps must satisfy lowBps <= mediumBps <= highBps";
  return null;
}

/** Join collateral for a not-yet-assessed wallet = baseCollateral × highBps / 10000 (contract `_preWin`). */
export function unassessedJoinCollateral(baseCollateral: bigint, highBps: number): bigint {
  return (baseCollateral * BigInt(highBps)) / BPS;
}

export interface WalletBalance { label: string; address: string; balance: bigint }
export interface WalletShortfall { label: string; address: string; balance: string; required: string; shortfall: string }
export interface FundingPlan {
  /** Per-wallet requirement (collateral + gas reserve). */
  required: bigint;
  /** Wallets whose balance is below `required`. */
  short: WalletShortfall[];
  /** Total wei the deployer would have to send to cover every short wallet. */
  totalShortfall: bigint;
}
/** Computes who is short for a join costing `collateral` wei, keeping `gasReserve` after the join. */
export function fundingPlan(wallets: WalletBalance[], collateral: bigint, gasReserve = GAS_RESERVE): FundingPlan {
  const required = collateral + gasReserve;
  const short: WalletShortfall[] = [];
  let totalShortfall = 0n;
  for (const w of wallets) {
    if (w.balance >= required) continue;
    const shortfall = required - w.balance;
    totalShortfall += shortfall;
    short.push({ label: w.label, address: w.address, balance: w.balance.toString(), required: required.toString(), shortfall: shortfall.toString() });
  }
  return { required, short, totalShortfall };
}
/** True when the deployer can send `totalShortfall` and still keep its own gas reserve. */
export function deployerCanCover(deployerBalance: bigint, totalShortfall: bigint, gasReserve = GAS_RESERVE): boolean {
  return deployerBalance >= totalShortfall + gasReserve;
}
