import { Contract, Interface, JsonRpcProvider, type ContractRunner } from "ethers";
import abi from "@/lib/abi/ChitChain.json";
import { CONTRACT_ADDRESS, HAS_CONTRACT, RPC_URL } from "@/lib/chain";
import { getBrowserProvider } from "@/lib/wallet";
import type { CircleSummary, ContributionStatus, MemberInfo, MyCircle, RoundHistoryRow, RoundInfo, RoundPhase, Status, Tier } from "@/lib/types";

export const chitInterface = new Interface(abi);
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

const s = (v: unknown) => (typeof v === "bigint" ? v.toString() : String(v ?? "0"));
const n = (v: unknown) => Number(v);

/** Normalises a v2 CircleView tuple to the API.md CircleSummary shape. */
export function toCircleSummary(id: number, c: Record<string, unknown>): CircleSummary {
  return {
    id,
    creator: String(c.creator),
    contribution: s(c.contribution),
    baseCollateral: s(c.baseCollateral),
    maxMembers: n(c.maxMembers),
    contributionDuration: n(c.contributionDuration),
    biddingDuration: n(c.biddingDuration),
    joinDeadline: n(c.joinDeadline),
    feeBps: n(c.feeBps),
    holdbackBps: n(c.holdbackBps),
    maxDiscountBps: n(c.maxDiscountBps),
    lowBps: n(c.lowBps),
    mediumBps: n(c.mediumBps),
    highBps: n(c.highBps),
    status: n(c.status) as Status,
    round: n(c.round),
    contributionDeadline: n(c.contributionDeadline),
    roundDeadline: n(c.roundDeadline),
    reserve: s(c.reserve),
    memberCount: n(c.memberCount),
    isDemo: false,
  };
}

/** Phase from the two deadlines (mirrors the backend rule). */
export function phaseFor(contributionDeadline: number, biddingDeadline: number, nowSec = Math.floor(Date.now() / 1000)): RoundPhase {
  if (nowSec < contributionDeadline) return "contribution";
  if (nowSec < biddingDeadline) return "bidding";
  return "settling";
}

export function toRoundInfo(r: Record<string, unknown>): RoundInfo {
  const expectedPot = BigInt(s(r.expectedPot));
  const bestDiscount = BigInt(s(r.bestDiscount));
  const contributionDeadline = n(r.contributionDeadline);
  const deadline = n(r.biddingDeadline);
  return {
    round: n(r.round),
    contributionDeadline,
    deadline,
    expectedPot: expectedPot.toString(),
    collected: s(r.collected),
    bestBidder: String(r.bestBidder),
    bestDiscount: bestDiscount.toString(),
    maxDiscount: s(r.maxDiscount),
    lowestAcceptedPayout: (expectedPot > bestDiscount ? expectedPot - bestDiscount : 0n).toString(),
    phase: phaseFor(contributionDeadline, deadline),
  };
}

export function toMemberInfo(address: string, m: Record<string, unknown>, requiredCollateral: bigint, _circleActive = false): MemberInfo {
  const paid = Boolean(m.paidThisRound);
  const contributionStatus: ContributionStatus = paid ? "PAID" : "PENDING";
  return {
    address,
    label: null,
    custodial: false,
    joined: Boolean(m.joined),
    tier: n(m.tier) as Tier,
    hasWon: Boolean(m.hasWon),
    removed: Boolean(m.removed),
    collateral: s(m.collateral),
    collateralUsed: s(m.collateralUsed),
    defaults: n(m.defaults),
    claimable: s(m.claimable),
    paidThisRound: paid,
    bidThisRound: s(m.bidThisRound),
    requiredCollateral: requiredCollateral.toString(),
    contributionStatus,
    lastDefault: null,
  };
}

export function toRoundHistoryRow(round: number, r: Record<string, unknown>, activeMembers: number): RoundHistoryRow {
  const winner = String(r.winner);
  const discount = BigInt(s(r.discount));
  const others = Math.max(1, activeMembers - 1);
  return {
    round,
    winner: winner === ZERO_ADDRESS ? null : winner,
    winnerLabel: null,
    pot: s(r.pot),
    payout: s(r.payout),
    discount: discount.toString(),
    fee: s(r.fee),
    holdback: s(r.holdback),
    dividendsTotal: discount.toString(),
    dividendPerMember: (discount / BigInt(others)).toString(),
    settledAt: n(r.settledAt),
    txHash: null,
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
      return toMemberInfo(a, m, req, circle.status === 1);
    })
  );
  let viewerRequired: string | null = null;
  if (viewer && /^0x[0-9a-fA-F]{40}$/.test(viewer)) {
    viewerRequired = ((await c.requiredCollateral(viewer, id)) as bigint).toString();
  }
  return { circle, round: toRoundInfo(rv), members, viewerRequired };
}

/** Settled rounds 1..(round-1) straight from the contract (no tx hashes). */
export async function readRoundHistory(id: number): Promise<RoundHistoryRow[]> {
  const c = getReadContract();
  if (!c) return [];
  const cv = toCircleSummary(id, await c.getCircle(id));
  const last = cv.status === 2 ? cv.maxMembers : Math.max(0, cv.round - 1);
  const rounds = Array.from({ length: last }, (_, i) => i + 1);
  const recs = await Promise.all(rounds.map((r) => c.getRoundHistory(id, r)));
  return recs.map((r, i) => toRoundHistoryRow(rounds[i], r, cv.memberCount)).filter((r) => r.settledAt > 0);
}

/** Circles the address has joined, read directly from the contract (backend-down fallback). */
export async function readMyCircles(addr: string): Promise<MyCircle[]> {
  const c = getReadContract();
  if (!c || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return [];
  const circles = await readCircleList();
  const out: MyCircle[] = [];
  await Promise.all(
    circles.map(async (circle) => {
      const m = await c.getMember(circle.id, addr);
      if (!m.joined) return;
      const req = (await c.requiredCollateral(addr, circle.id)) as bigint;
      out.push({ ...circle, me: toMemberInfo(addr, m, req, circle.status === 1) });
    })
  );
  return out.sort((a, b) => b.id - a.id);
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
