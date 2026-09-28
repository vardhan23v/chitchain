import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ChitChain } from "../typechain-types";

export const ONE = ethers.parseEther("1");
export const ROUND = 30;      // seconds
export const JOIN_WINDOW = 600;
export const FEE_BPS = 100;   // 1%

export const Tier = { Unassessed: 0, Low: 1, Medium: 2, High: 3 } as const;
export const Status = { Open: 0, Active: 1, Completed: 2, Cancelled: 3 } as const;

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
  opts: Partial<{ contribution: bigint; base: bigint; feeBps: number; members: HardhatEthersSigner[] }> = {},
): Promise<bigint> {
  const members = opts.members ?? env.members.slice(0, tiers.length);
  const contribution = opts.contribution ?? ONE;
  const base = opts.base ?? ONE;
  for (let i = 0; i < members.length; i++) {
    if (tiers[i] !== Tier.Unassessed) await env.chit.connect(env.oracle).setRiskTier(members[i].address, tiers[i]);
  }
  await env.chit.createCircle(contribution, members.length, ROUND, JOIN_WINDOW, opts.feeBps ?? FEE_BPS, base);
  const id = await env.chit.circleCount();
  for (const m of members) {
    const need = await env.chit.requiredCollateral(m.address, id);
    await env.chit.connect(m).join(id, { value: need });
  }
  await checkBalanceInvariant(env, id);
  return id;
}

/** Everyone in `payers` contributes, `bids` are placed in order, time passes, keeper settles. */
export async function runRound(
  env: Env,
  id: bigint,
  payers: HardhatEthersSigner[],
  bids: { who: HardhatEthersSigner; discount: bigint }[] = [],
) {
  const c = await env.chit.getCircle(id);
  for (const p of payers) await env.chit.connect(p).contribute(id, { value: c.contribution });
  for (const b of bids) await env.chit.connect(b.who).placeBid(id, b.discount);
  await checkBalanceInvariant(env, id);
  await time.increase(ROUND + 1);
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

export async function claimable(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).claimable;
}
export async function collateral(env: Env, id: bigint, who: HardhatEthersSigner) {
  return (await env.chit.getMember(id, who.address)).collateral;
}
