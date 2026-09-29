import { Contract, JsonRpcProvider, NonceManager, Wallet, type ContractTransactionResponse, type ContractTransactionReceipt, Result } from "ethers";
import { config } from "./config";
import abi from "./abi/ChitChain.json";

export const provider = new JsonRpcProvider(config.MST_RPC_URL, config.MST_CHAIN_ID, { staticNetwork: true });
provider.pollingInterval = 1500;

// ───────────── wallets ─────────────
/** Wallet + local nonce tracking so back-to-back sends from one key never reuse a nonce. */
export class ManagedWallet extends NonceManager {
  readonly address: string;
  constructor(key: string) {
    const w = new Wallet(key, provider);
    super(w);
    this.address = w.address;
  }
}
export const deployer = config.DEPLOYER_PRIVATE_KEY ? new ManagedWallet(config.DEPLOYER_PRIVATE_KEY) : null;
export const keeper = config.KEEPER_PRIVATE_KEY ? new ManagedWallet(config.KEEPER_PRIVATE_KEY) : null;
export const oracle = config.RISK_ORACLE_PRIVATE_KEY ? new ManagedWallet(config.RISK_ORACLE_PRIVATE_KEY) : null;

export interface DemoWallet { label: string; address: string; wallet: ManagedWallet }
const LABELS = ["A", "B", "C", "D", "E"];
// custodial demo wallet — the backend holds these keys; demo only, disclosed in the UI
export const demoWallets: DemoWallet[] = config.AGENT_WALLET_KEYS.map((k, i) => {
  const wallet = new ManagedWallet(k); // custodial demo wallet
  return { label: LABELS[i] ?? `W${i + 1}`, address: wallet.address, wallet };
});
const byAddress = new Map(demoWallets.map((w) => [w.address.toLowerCase(), w]));
export function demoWallet(address: string): DemoWallet | null { return byAddress.get(address.toLowerCase()) ?? null; }
export function labelOf(address: string): string | null { return demoWallet(address)?.label ?? null; }

// ───────────── contract ─────────────
export const contractAddress: string | null = config.CHITCHAIN_ADDRESS ?? null;
export function isConfigured(): boolean { return contractAddress !== null; }
/** Read-only contract instance; throws a readable error when the address is not configured. */
export function readContract(): Contract {
  if (!contractAddress) throw new Error("CHITCHAIN_ADDRESS not configured");
  return new Contract(contractAddress, abi, provider);
}
export function contractAs(wallet: ManagedWallet): Contract { return readContract().connect(wallet) as Contract; }

// ───────────── typed views ─────────────
export type Tier = 0 | 1 | 2 | 3;
export type Status = 0 | 1 | 2 | 3;
export const TIER_NAME = ["Unassessed", "Low", "Medium", "High"] as const;

export interface CircleParams {
  contribution: bigint; baseCollateral: bigint; maxMembers: number; contributionDuration: number; biddingDuration: number; joinWindow: number;
  feeBps: number; holdbackBps: number; maxDiscountBps: number; lowBps: number; mediumBps: number; highBps: number;
}
/** Demo defaults for the bps knobs (ARCHITECTURE.md): 10% holdback, 40% max discount, 50/100/200% collateral by tier. */
export const DEFAULT_BPS = { feeBps: 100, holdbackBps: 1000, maxDiscountBps: 4000, lowBps: 5000, mediumBps: 10_000, highBps: 20_000 } as const;

export interface CircleView {
  creator: string; contribution: bigint; baseCollateral: bigint; maxMembers: number; contributionDuration: number; biddingDuration: number;
  joinDeadline: number; feeBps: number; holdbackBps: number; maxDiscountBps: number; lowBps: number; mediumBps: number; highBps: number;
  status: Status; round: number; contributionDeadline: number; roundDeadline: number /* = bidding deadline */; reserve: bigint; memberCount: number;
}
export interface MemberView {
  joined: boolean; tier: Tier; hasWon: boolean; removed: boolean; collateral: bigint; claimable: bigint; paidThisRound: boolean; bidThisRound: bigint;
  defaults: number; collateralUsed: bigint;
}
export interface RoundView {
  round: number; contributionDeadline: number; deadline: number /* bidding deadline */; expectedPot: bigint; collected: bigint;
  bestBidder: string; bestDiscount: bigint; maxDiscount: bigint;
}
export interface RoundRecord { winner: string; settledAt: number; pot: bigint; payout: bigint; discount: bigint; fee: bigint; holdback: bigint }
export interface ReputationView { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number }

const n = (v: unknown): number => Number(v);
const b = (v: unknown): bigint => BigInt(v as bigint | string | number);

/**
 * Short-lived single-flight cache for RPC reads. The MST RPC costs ~0.5 s per call, several endpoints poll every few
 * seconds, and loops read the same views, so identical reads within `ttlMs` share one round trip. Cleared whenever a
 * transaction we sent mines or the indexer sees new events, so nothing stays stale after state changes.
 */
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
export const CHAIN_CACHE_MS = 2000;
export function cachedRead<T>(key: string, fn: () => Promise<T>, ttlMs = CHAIN_CACHE_MS): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn().catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { at: now, value });
  if (cache.size > 5000) for (const [k, v] of cache) if (now - v.at >= ttlMs) cache.delete(k);
  return value;
}
export function invalidateChainCache(): void { cache.clear(); }

export async function getCircleCount(c = readContract()): Promise<number> { return cachedRead("count", async () => n(await c.circleCount())); }
export function getCircle(id: number, c = readContract()): Promise<CircleView> { return cachedRead(`circle:${id}`, () => readCircle(id, c)); }
async function readCircle(id: number, c: Contract): Promise<CircleView> {
  const r = (await c.getCircle(id)) as Result;
  return {
    creator: String(r.creator), contribution: b(r.contribution), baseCollateral: b(r.baseCollateral), maxMembers: n(r.maxMembers),
    contributionDuration: n(r.contributionDuration), biddingDuration: n(r.biddingDuration), joinDeadline: n(r.joinDeadline),
    feeBps: n(r.feeBps), holdbackBps: n(r.holdbackBps), maxDiscountBps: n(r.maxDiscountBps), lowBps: n(r.lowBps), mediumBps: n(r.mediumBps), highBps: n(r.highBps),
    status: n(r.status) as Status, round: n(r.round), contributionDeadline: n(r.contributionDeadline), roundDeadline: n(r.roundDeadline),
    reserve: b(r.reserve), memberCount: n(r.memberCount),
  };
}
export function getMembers(id: number, c = readContract()): Promise<string[]> {
  return cachedRead(`members:${id}`, async () => Array.from((await c.getMembers(id)) as Result).map(String));
}
export function getMember(id: number, addr: string, c = readContract()): Promise<MemberView> { return cachedRead(`member:${id}:${addr.toLowerCase()}`, () => readMember(id, addr, c)); }
async function readMember(id: number, addr: string, c: Contract): Promise<MemberView> {
  const r = (await c.getMember(id, addr)) as Result;
  return {
    joined: Boolean(r.joined), tier: n(r.tier) as Tier, hasWon: Boolean(r.hasWon), removed: Boolean(r.removed),
    collateral: b(r.collateral), claimable: b(r.claimable), paidThisRound: Boolean(r.paidThisRound), bidThisRound: b(r.bidThisRound),
    defaults: n(r.defaults), collateralUsed: b(r.collateralUsed),
  };
}
export function getRound(id: number, c = readContract()): Promise<RoundView> { return cachedRead(`round:${id}`, () => readRound(id, c)); }
async function readRound(id: number, c: Contract): Promise<RoundView> {
  const r = (await c.getRound(id)) as Result;
  return {
    round: n(r.round), contributionDeadline: n(r.contributionDeadline), deadline: n(r.biddingDeadline), expectedPot: b(r.expectedPot), collected: b(r.collected),
    bestBidder: String(r.bestBidder), bestDiscount: b(r.bestDiscount), maxDiscount: b(r.maxDiscount),
  };
}
/** Settlement record for a past round (winner = zero address means the pot was shared as dividends). */
export function getRoundHistory(id: number, round: number, c = readContract()): Promise<RoundRecord> {
  // Settled rounds never change; unsettled ones return settledAt 0 and are re-read after the short TTL.
  return cachedRead(`history:${id}:${round}`, async () => {
    const rec = await readRoundHistory(id, round, c);
    if (rec.settledAt > 0) cache.set(`history:${id}:${round}`, { at: Date.now() + 60 * 60 * 1000, value: Promise.resolve(rec) });
    return rec;
  });
}
async function readRoundHistory(id: number, round: number, c: Contract): Promise<RoundRecord> {
  const r = (await c.getRoundHistory(id, round)) as Result;
  return { winner: String(r.winner), settledAt: n(r.settledAt), pot: b(r.pot), payout: b(r.payout), discount: b(r.discount), fee: b(r.fee), holdback: b(r.holdback) };
}
/** Phase of the current round at `nowSec` (contribution → bidding → settling once the bidding deadline passed). */
export function roundPhase(r: { contributionDeadline: number; deadline: number }, nowSec = Math.floor(Date.now() / 1000)): "contribution" | "bidding" | "settling" {
  if (nowSec <= r.contributionDeadline) return "contribution";
  if (nowSec <= r.deadline) return "bidding";
  return "settling";
}
/** Sends createCircle(CircleParams) from `wallet`. The struct is passed as a plain object (ethers encodes named tuples). */
export function createCircleCall(wallet: ManagedWallet, p: CircleParams): Promise<ContractTransactionResponse> {
  return contractAs(wallet).createCircle({
    contribution: p.contribution, baseCollateral: p.baseCollateral, maxMembers: p.maxMembers,
    contributionDuration: p.contributionDuration, biddingDuration: p.biddingDuration, joinWindow: p.joinWindow,
    feeBps: p.feeBps, holdbackBps: p.holdbackBps, maxDiscountBps: p.maxDiscountBps, lowBps: p.lowBps, mediumBps: p.mediumBps, highBps: p.highBps,
  }) as Promise<ContractTransactionResponse>;
}
export function getRequiredCollateral(addr: string, id: number, c = readContract()): Promise<bigint> {
  return cachedRead(`required:${id}:${addr.toLowerCase()}`, async () => b(await c.requiredCollateral(addr, id)));
}
export function getRiskTier(addr: string, c = readContract()): Promise<Tier> { return cachedRead(`tier:${addr.toLowerCase()}`, async () => n(await c.riskTier(addr)) as Tier); }
export function getReputation(addr: string, c = readContract()): Promise<ReputationView> { return cachedRead(`rep:${addr.toLowerCase()}`, () => readReputation(addr, c)); }
async function readReputation(addr: string, c: Contract): Promise<ReputationView> {
  const r = (await c.reputation(addr)) as Result;
  return { paidOnTime: n(r.paidOnTime), missed: n(r.missed), circlesCompleted: n(r.circlesCompleted), circlesRemoved: n(r.circlesRemoved) };
}

// ───────────── serialization (bigint → string at the JSON edge) ─────────────
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export function toJson(v: unknown): Json {
  if (typeof v === "bigint") return v.toString();
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(toJson);
  if (typeof v === "object") {
    const out: { [k: string]: Json } = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = toJson(val);
    return out;
  }
  return v as Json;
}

// ───────────── tx helper ─────────────
export interface TxStats { total: number; sent: number; mined: number; failed: number; lastFailure: string | null }
const tx = { total: 0, sent: 0, mined: 0, failed: 0, lastFailure: null as string | null };
/** Counters for every sendTx() in this process (total attempts, sent to the RPC, mined ok, failed). */
export function txStats(): TxStats { return { ...tx }; }

/**
 * Dry-runs a state-changing call so we never send a tx that would revert.
 * Uses the `pending` block (correct timestamp on Hardhat/automine chains); falls back to `latest` if the RPC rejects the tag.
 * Throws the decoded contract error (e.g. BiddingNotOver) when the call would revert.
 */
export async function preflight(contract: Contract, method: string, args: unknown[], overrides: Record<string, unknown> = {}): Promise<void> {
  const fn = contract.getFunction(method);
  try {
    await fn.staticCall(...args, { ...overrides, blockTag: "pending" });
  } catch (e) {
    if (revertName(e)) throw e;
    await fn.staticCall(...args, overrides); // RPC may not support pending eth_call
  }
}

/**
 * Sends a tx, waits for 1 confirmation, logs `[ctx] ... txHash`. Rethrows on failure.
 * On a nonce error the signer's local nonce is reset and the send retried once.
 */
export async function sendTx(ctx: string, signer: ManagedWallet, send: () => Promise<ContractTransactionResponse>): Promise<ContractTransactionReceipt> {
  tx.total += 1;
  const fail = (e: unknown): never => { tx.failed += 1; tx.lastFailure = `${ctx}: ${errorMessage(e)}`; throw e; };
  let res: ContractTransactionResponse;
  try {
    res = await send();
  } catch (e) {
    if (!/nonce/i.test(errorMessage(e))) return fail(e);
    console.warn(`[${ctx}] nonce error, resetting and retrying once`);
    signer.reset();
    try { res = await send(); } catch (e2) { return fail(e2); }
  }
  tx.sent += 1;
  console.log(`[${ctx}] sent ${res.hash}`);
  const rc = await res.wait(1).catch(fail);
  if (!rc || rc.status !== 1) return fail(new Error(`[${ctx}] tx ${res.hash} reverted`));
  tx.mined += 1;
  invalidateChainCache();
  console.log(`[${ctx}] mined block ${rc.blockNumber} txHash ${res.hash}`);
  return rc;
}

/** Decodes a contract revert into a readable error name (e.g. "BiddingNotOver"), or null. */
export function revertName(e: unknown): string | null {
  const err = e as { data?: unknown; error?: { data?: unknown }; info?: { error?: { data?: unknown } }; reason?: string; shortMessage?: string };
  const data = [err?.data, err?.error?.data, err?.info?.error?.data].find((d) => typeof d === "string" && d.startsWith("0x"));
  if (typeof data === "string" && contractAddress) {
    try {
      const parsed = readContract().interface.parseError(data);
      if (parsed) return parsed.name;
    } catch { /* not one of ours */ }
  }
  if (typeof err?.reason === "string") return err.reason;
  const m = /execution reverted(?::\s*)?["']?(\w+)?/.exec(err?.shortMessage ?? "");
  return m?.[1] ?? null;
}
export function errorMessage(e: unknown): string {
  const name = revertName(e);
  if (name) return name;
  if (e instanceof Error) return e.message.split("\n")[0].slice(0, 300);
  return String(e);
}
