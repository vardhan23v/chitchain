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

export interface CircleView {
  creator: string; contribution: bigint; maxMembers: number; roundDuration: number; joinDeadline: number;
  feeBps: number; baseCollateral: bigint; status: Status; round: number; roundDeadline: number; reserve: bigint; memberCount: number;
}
export interface MemberView {
  joined: boolean; tier: Tier; hasWon: boolean; removed: boolean; collateral: bigint; claimable: bigint; paidThisRound: boolean; bidThisRound: bigint;
}
export interface RoundView {
  round: number; deadline: number; expectedPot: bigint; collected: bigint; bestBidder: string; bestDiscount: bigint; maxDiscount: bigint;
}
export interface ReputationView { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number }

const n = (v: unknown): number => Number(v);
const b = (v: unknown): bigint => BigInt(v as bigint | string | number);

export async function getCircleCount(c = readContract()): Promise<number> { return n(await c.circleCount()); }
export async function getCircle(id: number, c = readContract()): Promise<CircleView> {
  const r = (await c.getCircle(id)) as Result;
  return {
    creator: String(r.creator), contribution: b(r.contribution), maxMembers: n(r.maxMembers), roundDuration: n(r.roundDuration),
    joinDeadline: n(r.joinDeadline), feeBps: n(r.feeBps), baseCollateral: b(r.baseCollateral), status: n(r.status) as Status,
    round: n(r.round), roundDeadline: n(r.roundDeadline), reserve: b(r.reserve), memberCount: n(r.memberCount),
  };
}
export async function getMembers(id: number, c = readContract()): Promise<string[]> {
  return Array.from((await c.getMembers(id)) as Result).map(String);
}
export async function getMember(id: number, addr: string, c = readContract()): Promise<MemberView> {
  const r = (await c.getMember(id, addr)) as Result;
  return {
    joined: Boolean(r.joined), tier: n(r.tier) as Tier, hasWon: Boolean(r.hasWon), removed: Boolean(r.removed),
    collateral: b(r.collateral), claimable: b(r.claimable), paidThisRound: Boolean(r.paidThisRound), bidThisRound: b(r.bidThisRound),
  };
}
export async function getRound(id: number, c = readContract()): Promise<RoundView> {
  const r = (await c.getRound(id)) as Result;
  return {
    round: n(r.round), deadline: n(r.deadline), expectedPot: b(r.expectedPot), collected: b(r.collected),
    bestBidder: String(r.bestBidder), bestDiscount: b(r.bestDiscount), maxDiscount: b(r.maxDiscount),
  };
}
export async function getRequiredCollateral(addr: string, id: number, c = readContract()): Promise<bigint> {
  return b(await c.requiredCollateral(addr, id));
}
export async function getRiskTier(addr: string, c = readContract()): Promise<Tier> { return n(await c.riskTier(addr)) as Tier; }
export async function getReputation(addr: string, c = readContract()): Promise<ReputationView> {
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
/**
 * Dry-runs a state-changing call so we never send a tx that would revert.
 * Uses the `pending` block (correct timestamp on Hardhat/automine chains); falls back to `latest` if the RPC rejects the tag.
 * Throws the decoded contract error (e.g. RoundNotOver) when the call would revert.
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
  let tx: ContractTransactionResponse;
  try {
    tx = await send();
  } catch (e) {
    if (!/nonce/i.test(errorMessage(e))) throw e;
    console.warn(`[${ctx}] nonce error, resetting and retrying once`);
    signer.reset();
    tx = await send();
  }
  console.log(`[${ctx}] sent ${tx.hash}`);
  const rc = await tx.wait(1);
  if (!rc || rc.status !== 1) throw new Error(`[${ctx}] tx ${tx.hash} reverted`);
  console.log(`[${ctx}] mined block ${rc.blockNumber} txHash ${tx.hash}`);
  return rc;
}

/** Decodes a contract revert into a readable error name (e.g. "RoundNotOver"), or null. */
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
