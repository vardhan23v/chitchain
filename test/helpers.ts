import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ChitChain, IChitChain } from "../typechain-types";

export const ONE = ethers.parseEther("1");
export const CD = 30;          // contribution phase seconds
export const BD = 30;          // bidding phase seconds
export const ROUND = CD + BD;  // full round length
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

/**
 * Everyone in `payers` contributes, `bids` are placed in order, time passes, keeper settles.
 * With `bidInBiddingPhase` the bids are placed after the contribution deadline.
 */
export async function runRound(
  env: Env,
  id: bigint,
  payers: HardhatEthersSigner[],
  bids: { who: HardhatEthersSigner; discount: bigint }[] = [],
  opts: { bidInBiddingPhase?: boolean } = {},
) {
  const c = await env.chit.getCircle(id);
  for (const p of payers) await env.chit.connect(p).contribute(id, { value: c.contribution });
  if (opts.bidInBiddingPhase) await time.increase(CD + 1);
  for (const b of bids) await env.chit.connect(b.who).placeBid(id, b.discount);
  await checkBalanceInvariant(env, id);
  await time.increase(opts.bidInBiddingPhase ? BD + 1 : ROUND + 1);
  const tx = await env.chit.settleRound(id);
  await checkBalanceInvariant(env, id);
  return tx;
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

export async function settledEvent(env: Env, tx: Awaited<ReturnType<ChitChain["settleRound"]>>) {
  const rc = await tx.wait();
  return rc!.logs.map((l) => env.chit.interface.parseLog(l)).find((p) => p?.name === "RoundSettled")!;
}

export async function claimable(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).claimable;
}
export async function collateral(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).collateral;
}
