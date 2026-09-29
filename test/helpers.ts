import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ContractTransactionResponse, LogDescription } from "ethers";
import type { ChitChain, IChitChain } from "../typechain-types";

export const ONE = ethers.parseEther("1");
export const CD = 30;          // contribution phase seconds
export const BD = 30;          // recipient decision window, and the auction window after a decline
export const JOIN_WINDOW = 600;
export const FEE_BPS = 100;    // 1%

export const Tier = { Unassessed: 0, Low: 1, Medium: 2, High: 3 } as const;
export const Status = { Open: 0, Active: 1, Completed: 2, Cancelled: 3 } as const;

export type Params = IChitChain.CircleParamsStruct;

/** Default circle params: 1 MST contribution, 5 members, 30 s + 30 s, 1% fee, no flat holdback, 40% max discount. */
export function params(overrides: Partial<Params> = {}): Params {
  return {
    contribution: ONE,
    baseCollateral: ONE,
    maxMembers: 5,
    contributionDuration: CD,
    biddingDuration: BD,
    joinWindow: JOIN_WINDOW,
    feeBps: FEE_BPS,
    holdbackBps: 0,
    maxDiscountBps: 4000,
    lowBps: 5000,
    mediumBps: 10000,
    highBps: 20000,
    ...overrides,
  };
}

export interface Env {
  chit: ChitChain;
  oracle: HardhatEthersSigner;
  treasury: HardhatEthersSigner;
  members: HardhatEthersSigner[]; // A..E
  tracked: string[];              // every address whose state counts in the balance invariant
}

export async function deployEnv(): Promise<Env> {
  const [deployer, oracle, treasury, ...rest] = await ethers.getSigners();
  void deployer;
  const chit = await (await ethers.getContractFactory("ChitChain")).deploy(oracle.address, treasury.address);
  const members = rest.slice(0, 5);
  return { chit, oracle, treasury, members, tracked: members.map((m) => m.address) };
}

/** Sets tiers, creates a circle and lets every member join with the exact required collateral. */
export async function createAndFill(
  env: Env,
  tiers: number[],
  opts: Partial<{ params: Partial<Params>; members: HardhatEthersSigner[] }> = {},
): Promise<bigint> {
  const members = opts.members ?? env.members.slice(0, tiers.length);
  for (let i = 0; i < members.length; i++) {
    if (tiers[i] !== Tier.Unassessed) await env.chit.connect(env.oracle).setRiskTier(members[i].address, tiers[i]);
  }
  await env.chit.createCircle(params({ maxMembers: members.length, ...opts.params }));
  const id = await env.chit.circleCount();
  for (const m of members) {
    const need = await env.chit.requiredCollateral(m.address, id);
    await env.chit.connect(m).join(id, { value: need });
  }
  await checkBalanceInvariant(env, id);
  return id;
}

export const Phase = { Contributing: 0, Deciding: 1, Auction: 2 } as const;
export const Outcome = { None: 0, Accepted: 1, Auction: 2, DecisionTimeout: 3, NoBids: 4, NoRecipient: 5 } as const;

export type Decision = "accept" | "decline" | "timeout";
export interface RoundResult {
  /** the transaction that settled the round (accept, settleRound, or the close when nobody was eligible) */
  tx: ContractTransactionResponse;
  /** every event emitted by the round's transactions, in order */
  events: LogDescription[];
  recipient: string | null;
}

async function parsed(env: Env, tx: ContractTransactionResponse): Promise<LogDescription[]> {
  const rc = await tx.wait();
  return rc!.logs.map((l) => { try { return env.chit.interface.parseLog(l); } catch { return null; } }).filter((x): x is LogDescription => !!x);
}

/**
 * v2.2 round: everyone in `payers` contributes (the last payment closes contributions early); otherwise the deadline
 * passes and anyone closes them, covering misses. Then the recipient decides:
 *   "accept"  → acceptFullPot (no auction)
 *   "decline" → declineFullPot, `bids` are placed in order, the auction deadline passes, settleRound
 *   "timeout" → the decision window passes, settleRound gives the recipient the full pot
 * Default decision: "decline" when bids are given, else "timeout".
 */
export async function runRound(
  env: Env,
  id: bigint,
  payers: HardhatEthersSigner[],
  bids: { who: HardhatEthersSigner; discount: bigint }[] = [],
  opts: { decision?: Decision } = {},
): Promise<RoundResult> {
  const events: LogDescription[] = [];
  const startRound = (await env.chit.getCircle(id)).round;
  const c = await env.chit.getCircle(id);
  let last: ContractTransactionResponse | null = null;
  for (const p of payers) { last = await env.chit.connect(p).contribute(id, { value: c.contribution }); events.push(...(await parsed(env, last))); }
  if ((await env.chit.getRound(id)).phase === BigInt(Phase.Contributing) && (await env.chit.getCircle(id)).round === startRound) {
    await time.increase(CD + 1);
    last = await env.chit.closeContributions(id);
    events.push(...(await parsed(env, last)));
  }
  await checkBalanceInvariant(env, id);
  const after = await env.chit.getCircle(id);
  if (after.status !== BigInt(Status.Active) || after.round !== startRound) return { tx: last!, events, recipient: null }; // settled at close
  const r = await env.chit.getRound(id);
  const recipient = await ethers.getSigner(r.recipient);
  const decision = opts.decision ?? (bids.length ? "decline" : "timeout");
  let tx: ContractTransactionResponse;
  if (decision === "accept") {
    tx = await env.chit.connect(recipient).acceptFullPot(id);
  } else if (decision === "decline") {
    events.push(...(await parsed(env, await env.chit.connect(recipient).declineFullPot(id))));
    for (const b of bids) events.push(...(await parsed(env, await env.chit.connect(b.who).placeBid(id, b.discount))));
    await checkBalanceInvariant(env, id);
    await time.increase(BD + 1);
    tx = await env.chit.settleRound(id);
  } else {
    await time.increase(BD + 1);
    tx = await env.chit.settleRound(id);
  }
  events.push(...(await parsed(env, tx)));
  await checkBalanceInvariant(env, id);
  return { tx, events, recipient: r.recipient };
}

/** Events named `name` from a round, optionally checking each arg of the first match. */
export function eventsNamed(res: RoundResult, name: string): LogDescription[] {
  return res.events.filter((e) => e.name === name);
}
export function expectEvent(res: RoundResult, name: string, args: unknown[]): void {
  const found = eventsNamed(res, name);
  const norm = (v: unknown) => (typeof v === "number" ? BigInt(v) : v);
  const ok = found.some((e) => args.every((a, i) => {
    const got = e.args[i];
    return typeof got === "bigint" ? got === norm(a) : String(got).toLowerCase() === String(a).toLowerCase();
  }));
  expect(ok, `${name}(${args.map(String).join(", ")}) in [${found.map((e) => e.args.map(String).join(", ")).join(" | ")}]`).to.be.true;
}
export function settled(res: RoundResult): LogDescription {
  const e = eventsNamed(res, "RoundSettled")[0];
  expect(e, "RoundSettled").to.not.be.undefined;
  return e;
}

/** Invariant 1: contract balance == Σ collateral + Σ claimable + reserve + treasuryClaimable + collected. */
export async function checkBalanceInvariant(env: Env, id: bigint) {
  const addr = await env.chit.getAddress();
  const balance = await ethers.provider.getBalance(addr);
  let sum = 0n;
  const count = await env.chit.circleCount();
  for (let cid = 1n; cid <= count; cid++) {
    const c = await env.chit.getCircle(cid);
    const round = await env.chit.getRound(cid);
    sum += c.reserve + round.collected;
    for (const a of env.tracked) {
      const m = await env.chit.getMember(cid, a);
      sum += m.collateral + m.claimable;
    }
  }
  sum += await env.chit.treasuryClaimable();
  expect(balance, `balance invariant (circle ${id})`).to.equal(sum);
}

export async function claimable(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).claimable;
}
export async function collateral(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).collateral;
}
