/** Chain constants. Values verified by the lead: chain id 91562037, Blockscout explorer. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "91562037");
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16); // 0x5752035
export const CHAIN_NAME = "MST Testnet";
export const CURRENCY = { name: "MSTC", symbol: "MSTC", decimals: 18 } as const;
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

/** DESIGN §3 / ARCHITECTURE §3.2 collateral multipliers, indexed by Tier. */
export const TIER_MULTIPLIER: Record<number, number> = { 0: 2, 1: 0.5, 2: 1, 3: 2 };
export const TIER_COVERAGE: Record<number, number> = { 0: 1, 1: 0.5, 2: 0.75, 3: 1 };
