import { Contract, Interface, JsonRpcProvider, type ContractRunner } from "ethers";
import abi from "@/lib/abi/ChitChain.json";
import { CONTRACT_ADDRESS, HAS_CONTRACT, RPC_URL } from "@/lib/chain";
import { getBrowserProvider } from "@/lib/wallet";
import type { CircleSummary, MemberInfo, RoundInfo, Status, Tier } from "@/lib/types";

export const chitInterface = new Interface(abi);

let readProvider: JsonRpcProvider | null = null;
export function getReadProvider(): JsonRpcProvider {
  if (!readProvider) readProvider = new JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true, polling: true });
  return readProvider;
}

/** Read-only contract; null when NEXT_PUBLIC_CHITCHAIN_ADDRESS is unset (UI shows a banner). */
export function getReadContract(): Contract | null {
  if (!HAS_CONTRACT) return null;
  return new Contract(CONTRACT_ADDRESS, abi, getReadProvider());
}

/** Signer-bound contract via the injected wallet. */
export async function getSignerContract(): Promise<Contract> {
  if (!HAS_CONTRACT) throw new Error("Contract not deployed yet — set NEXT_PUBLIC_CHITCHAIN_ADDRESS");
  const provider = getBrowserProvider();
  if (!provider) throw new Error("No wallet found");
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, abi, signer as ContractRunner);
}

const s = (v: unknown) => (typeof v === "bigint" ? v.toString() : String(v));
const n = (v: unknown) => Number(v);

/** Normalises a CircleView tuple to the API.md CircleSummary shape. */
export function toCircleSummary(id: number, c: Record<string, unknown>): CircleSummary {
  return {
    id,
    creator: String(c.creator),
    contribution: s(c.contribution),
    maxMembers: n(c.maxMembers),
    roundDuration: n(c.roundDuration),
    joinDeadline: n(c.joinDeadline),
    feeBps: n(c.feeBps),
    baseCollateral: s(c.baseCollateral),
    status: n(c.status) as Status,
    round: n(c.round),
    roundDeadline: n(c.roundDeadline),
    reserve: s(c.reserve),
    memberCount: n(c.memberCount),
  };
}

export function toRoundInfo(r: Record<string, unknown>): RoundInfo {
  return {
    round: n(r.round),
    deadline: n(r.deadline),
    expectedPot: s(r.expectedPot),
    collected: s(r.collected),
    bestBidder: String(r.bestBidder),
    bestDiscount: s(r.bestDiscount),
    maxDiscount: s(r.maxDiscount),
  };
}

export function toMemberInfo(address: string, m: Record<string, unknown>, requiredCollateral: bigint): MemberInfo {
  return {
    address,
    label: null,
    joined: Boolean(m.joined),
    tier: n(m.tier) as Tier,
    hasWon: Boolean(m.hasWon),
    removed: Boolean(m.removed),
    collateral: s(m.collateral),
    claimable: s(m.claimable),
    paidThisRound: Boolean(m.paidThisRound),
    bidThisRound: s(m.bidThisRound),
    requiredCollateral: requiredCollateral.toString(),
  };
}

/** Fallback reads used when the backend is down. */
export async function readCircleList(): Promise<CircleSummary[]> {
  const c = getReadContract();
  if (!c) return [];
  const count = Number(await c.circleCount());
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const views = await Promise.all(ids.map((id) => c.getCircle(id)));
  return views.map((v, i) => toCircleSummary(ids[i], v)).reverse();
}

export async function readCircleRoom(id: number, viewer?: string | null) {
  const c = getReadContract();
  if (!c) return null;
  const [cv, rv, addrs] = await Promise.all([c.getCircle(id), c.getRound(id), c.getMembers(id) as Promise<string[]>]);
  const circle = toCircleSummary(id, cv);
  const members = await Promise.all(
    addrs.map(async (a) => {
      const [m, req] = await Promise.all([c.getMember(id, a), c.requiredCollateral(a, id) as Promise<bigint>]);
      return toMemberInfo(a, m, req);
    })
  );
  let viewerRequired: string | null = null;
  if (viewer && /^0x[0-9a-fA-F]{40}$/.test(viewer)) {
    viewerRequired = ((await c.requiredCollateral(viewer, id)) as bigint).toString();
  }
  return { circle, round: toRoundInfo(rv), members, viewerRequired };
}

export async function readRequiredCollateral(viewer: string, id: number): Promise<bigint | null> {
  const c = getReadContract();
  if (!c) return null;
  return (await c.requiredCollateral(viewer, id)) as bigint;
}

export async function readRiskTier(addr: string): Promise<Tier | null> {
  const c = getReadContract();
  if (!c) return null;
  return Number(await c.riskTier(addr)) as Tier;
}
