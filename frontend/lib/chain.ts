import type { CircleSummary, Tier } from "@/lib/types";

/** Chain constants. Values verified by the lead: chain id 91562037, Blockscout explorer. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "91562037");
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16); // 0x5752035
export const CHAIN_NAME = "MST Testnet";
/** All amounts are MST testnet coins (18 decimals) with no monetary value. */
export const CURRENCY = { name: "MST", symbol: "MST", decimals: 18 } as const;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://testnetrpc.mstblockchain.com";
export const EXPLORER_URL = (process.env.NEXT_PUBLIC_EXPLORER || "https://testnet.mstscan.com").replace(/\/$/, "");
export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CHITCHAIN_ADDRESS || "").trim();
export const HAS_CONTRACT = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);
export const FAUCET_URL = "https://faucet.masterstroke.academy";
export const BRIDGEKEY_URL = "https://chromewebstore.google.com/detail/bridgekey/bfjojdcfenehemjgjlepdjomkpginlkg"; // Chrome Web Store listing

/** Polling intervals (ms). Backend is primary; contract views are the fallback. */
export const POLL_API_MS = 2500;
export const POLL_CHAIN_MS = 3000;
export const RPC_SLOW_MS = 10_000;
export const KEEPER_LATE_MS = 15_000;

export const BPS = 10_000;

/** Default collateral multipliers (bps of baseCollateral) indexed by Tier — used when a circle's own values are unknown. */
export const DEFAULT_TIER_BPS: Record<Tier, number> = { 0: 20000, 1: 5000, 2: 10000, 3: 20000 };
/** Legacy view of the defaults as plain multipliers (0.5×/1×/2×). */
export const TIER_MULTIPLIER: Record<number, number> = { 0: 2, 1: 0.5, 2: 1, 3: 2 };

/** Collateral multiplier (bps) for a tier in a given circle; Unassessed uses highBps. */
export function tierBps(c: Pick<CircleSummary, "lowBps" | "mediumBps" | "highBps"> | null | undefined, tier: Tier): number {
  if (!c) return DEFAULT_TIER_BPS[tier];
  return tier === 1 ? c.lowBps : tier === 2 ? c.mediumBps : c.highBps;
}

/** Human "0.5×" from bps. */
export function bpsToMultiplier(bps: number): string {
  const x = bps / BPS;
  return `${Number.isInteger(x) ? x : x.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}×`;
}

export function pctFromBps(bps: number): string {
  const p = bps / 100;
  return `${Number.isInteger(p) ? p : p.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

/** Pre-win collateral requirement = baseCollateral × tier multiplier. */
export function preWinRequired(baseCollateral: string, tier: Tier, c?: Pick<CircleSummary, "lowBps" | "mediumBps" | "highBps"> | null): bigint {
  const base = BigInt(baseCollateral || "0");
  return (base * BigInt(tierBps(c, tier))) / BigInt(BPS);
}
