import { Contract, Interface, JsonRpcProvider, type ContractRunner } from "ethers";
import abi from "@/lib/abi/ChitChain.json";
import { CONTRACT_ADDRESS, HAS_CONTRACT, RPC_URL } from "@/lib/chain";
import { getBrowserProvider } from "@/lib/wallet";
import type { CircleSummary, ContributionStatus, MemberInfo, MyCircle, PhaseCode, RoundHistoryRow, RoundInfo, RoundOutcome, RoundPhase, Status, Tier } from "@/lib/types";

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
  if (!HAS_CONTRACT) throw new Error("Contract not deployed yet. Set NEXT_PUBLIC_CHITCHAIN_ADDRESS");
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
    phase: n(c.phase) as PhaseCode,
    decisionDeadline: n(c.decisionDeadline),
    recipient: String(c.recipient ?? ZERO_ADDRESS),
    isDemo: false,
    name: null,
    organizerWallet: null,
  };
}

/** Stage from the on-chain phase plus its deadline (mirrors the backend `roundPhase`). */
export function phaseFor(
  r: { phase?: PhaseCode; contributionDeadline: number; decisionDeadline?: number; deadline: number },
  nowSec = Math.floor(Date.now() / 1000)
): RoundPhase {
  const code = r.phase ?? 0;
  if (code === 0) return nowSec <= r.contributionDeadline ? "contribution" : "closing";
  if (code === 1) return nowSec <= (r.decisionDeadline ?? 0) ? "decision" : "settling";
  return nowSec <= r.deadline ? "bidding" : "settling";
}

const OUTCOMES: RoundOutcome[] = ["NONE", "ACCEPTED", "AUCTION", "DECISION_TIMEOUT", "NO_BIDS", "NO_RECIPIENT"];

export function toRoundInfo(r: Record<string, unknown>): RoundInfo {
  const expectedPot = BigInt(s(r.expectedPot));
  const bestDiscount = BigInt(s(r.bestDiscount));
  const phaseCode = n(r.phase) as PhaseCode;
  const pot = BigInt(s(r.pot));
  const potForOffers = phaseCode === 0 ? expectedPot : pot;
  const contributionDeadline = n(r.contributionDeadline);
  const decisionDeadline = n(r.decisionDeadline);
  const deadline = n(r.biddingDeadline);
  const bestBidder = String(r.bestBidder);
  const recipient = String(r.recipient ?? ZERO_ADDRESS);
  return {
    round: n(r.round),
    contributionDeadline,
    decisionDeadline,
    deadline,
    expectedPot: expectedPot.toString(),
    collected: s(r.collected),
    pot: pot.toString(),
    potForOffers: potForOffers.toString(),
    bestBidder,
    bestDiscount: bestDiscount.toString(),
    maxDiscount: s(r.maxDiscount),
    lowestAcceptedPayout: bestBidder === ZERO_ADDRESS ? null : (potForOffers > bestDiscount ? potForOffers - bestDiscount : 0n).toString(),
    phase: phaseFor({ phase: phaseCode, contributionDeadline, decisionDeadline, deadline }),
    phaseCode,
    recipient: recipient === ZERO_ADDRESS ? null : recipient,
    recipientLabel: null,
    recipientName: null,
  };
}

/** Extra context for the chain-only status derivation (audit 7). */
export interface MemberStatusContext {
  /** circle.status === 1 */
  active?: boolean;
  /** Current round phase; PENDING only makes sense inside the contribution window. */
  phase?: RoundPhase;
  /** Per-round contribution (wei), used to tell fully from partially covered. */
  contribution?: bigint;
}

/**
 * Derives `contributionStatus` from on-chain fields alone so DEFAULTED / COVERED_BY_COLLATERAL are not lost when the
 * backend is down. The backend's event-based status is still authoritative when it is reachable.
 */
export function deriveContributionStatus(m: { paidThisRound: boolean; removed: boolean; defaults: number; collateral: bigint; collateralUsed: bigint }, ctx: MemberStatusContext = {}): ContributionStatus {
  if (m.paidThisRound) return "PAID";
  if (m.removed) return "DEFAULTED";
  const remaining = m.collateral > m.collateralUsed ? m.collateral - m.collateralUsed : 0n;
  if (!ctx.active || ctx.phase === "contribution" || ctx.phase === undefined) {
    // Inside the contribution window nothing has been missed yet. A member with exhausted collateral who still is not
    // removed has defaulted before and cannot be covered again.
    return ctx.active && m.defaults > 0 && remaining === 0n ? "DEFAULTED" : "PENDING";
  }
  // Past the contribution window and unpaid: settlement covers the miss from collateral.
  if (remaining === 0n) return "DEFAULTED";
  if (ctx.contribution !== undefined && remaining < ctx.contribution) return "PARTIALLY_COVERED";
  return "COVERED_BY_COLLATERAL";
}

export function toMemberInfo(address: string, m: Record<string, unknown>, requiredCollateral: bigint, ctx: MemberStatusContext | boolean = {}): MemberInfo {
  const c: MemberStatusContext = typeof ctx === "boolean" ? { active: ctx } : ctx;
  const paid = Boolean(m.paidThisRound);
  const removed = Boolean(m.removed);
  const collateral = BigInt(s(m.collateral));
  const collateralUsed = BigInt(s(m.collateralUsed));
  const defaults = n(m.defaults);
  const contributionStatus = deriveContributionStatus({ paidThisRound: paid, removed, defaults, collateral, collateralUsed }, c);
  return {
    address,
    label: null,
    custodial: false,
    joined: Boolean(m.joined),
    tier: n(m.tier) as Tier,
    hasWon: Boolean(m.hasWon),
    removed,
    collateral: collateral.toString(),
    collateralUsed: collateralUsed.toString(),
    defaults,
    claimable: s(m.claimable),
    paidThisRound: paid,
    bidThisRound: s(m.bidThisRound),
    requiredCollateral: requiredCollateral.toString(),
    contributionStatus,
    // Transaction links need the ChitChain backend; chain-only mode has no event index.
    lastDefault: null,
  };
}

export function toRoundHistoryRow(round: number, r: Record<string, unknown>, activeMembers: number): RoundHistoryRow {
  const winner = String(r.winner);
  const recipient = String(r.recipient ?? ZERO_ADDRESS);
  const discount = BigInt(s(r.discount));
  const others = Math.max(1, activeMembers - 1);
  return {
    round,
    winner: winner === ZERO_ADDRESS ? null : winner,
    winnerLabel: null,
    outcome: OUTCOMES[n(r.outcome)] ?? "NONE",
    recipient: recipient === ZERO_ADDRESS ? null : recipient,
    recipientLabel: null,
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
  const round = toRoundInfo(rv);
  const ctx: MemberStatusContext = { active: circle.status === 1, phase: round.phase, contribution: BigInt(circle.contribution) };
  const members = await Promise.all(
    addrs.map(async (a) => {
      const [m, req] = await Promise.all([c.getMember(id, a), c.requiredCollateral(a, id) as Promise<bigint>]);
      return toMemberInfo(a, m, req, ctx);
    })
  );
  let viewerRequired: string | null = null;
  if (viewer && /^0x[0-9a-fA-F]{40}$/.test(viewer)) {
    viewerRequired = ((await c.requiredCollateral(viewer, id)) as bigint).toString();
  }
  return { circle, round, members, viewerRequired };
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
      const phase = circle.status === 1 ? phaseFor({ phase: circle.phase, contributionDeadline: circle.contributionDeadline, decisionDeadline: circle.decisionDeadline, deadline: circle.roundDeadline }) : undefined;
      out.push({ ...circle, me: toMemberInfo(addr, m, req, { active: circle.status === 1, phase, contribution: BigInt(circle.contribution) }) });
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
