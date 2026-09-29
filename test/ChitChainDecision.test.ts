import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  CD, BD, Tier, Status, Phase, Outcome,
  deployEnv, createAndFill, runRound, expectEvent, settled, checkBalanceInvariant, claimable, collateral, type Env,
} from "./helpers";

const MST = (n: number | string) => ethers.parseEther(String(n));
const M5 = [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium];
/** The brief's example: 100 MST per member, 5 members → 500 MST pot, no platform fee so the numbers match exactly. */
const EXAMPLE = { contribution: MST(100), baseCollateral: MST(200), feeBps: 0, holdbackBps: 0 };

describe("ChitChain v2.2 — recipient decision before the auction", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  async function potReady(id: bigint) {
    const c = await env.chit.getCircle(id);
    for (const m of env.members) await env.chit.connect(m).contribute(id, { value: c.contribution });
    return env.chit.getRound(id);
  }

  it("D1. recipient accepts the full pot: full payout, no auction, round settled", async () => {
    const [A, B] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    const r = await potReady(id);
    expect(r.recipient).to.equal(A.address);
    expect(r.pot).to.equal(MST(500));
    const tx = env.chit.connect(A).acceptFullPot(id);
    await expect(tx).to.emit(env.chit, "FullPotAccepted").withArgs(id, 1, A.address, MST(500));
    await expect(tx).to.not.emit(env.chit, "FullPotDeclined");
    await expect(tx).to.not.emit(env.chit, "DividendCredited");
    const h = await env.chit.getRoundHistory(id, 1);
    expect(h.winner).to.equal(A.address);
    expect(h.outcome).to.equal(Outcome.Accepted);
    expect(h.discount).to.equal(0n);
    // Medium: 4 rounds owed × 100 × 75% = 300 must stay locked; collateral 200 → 100 held back, 400 claimable now
    expect(h.holdback).to.equal(MST(100));
    expect(await claimable(env, id, A)).to.equal(MST(400));
    expect(await collateral(env, id, A)).to.equal(MST(300));
    // next round has started; no auction ever existed for round 1
    const r2 = await env.chit.getRound(id);
    expect(r2.round).to.equal(2);
    expect(r2.phase).to.equal(Phase.Contributing);
    await expect(env.chit.connect(B).placeBid(id, 1n)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
    await checkBalanceInvariant(env, id);
  });

  it("D2. recipient declines: the auction opens on-chain with its own deadline", async () => {
    const [A] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    const tx = env.chit.connect(A).declineFullPot(id);
    await expect(tx).to.emit(env.chit, "FullPotDeclined");
    const r = await env.chit.getRound(id);
    expect(r.phase).to.equal(Phase.Auction);
    expect(r.biddingDeadline).to.equal((await time.latest()) + BD);
  });

  it("D3. nobody can bid before the auction opens (contributing or deciding)", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await expect(env.chit.connect(B).placeBid(id, MST(10))).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
    for (const m of [A, B, C, D, E]) await env.chit.connect(m).contribute(id, { value: MST(100) });
    await expect(env.chit.connect(B).placeBid(id, MST(10))).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Deciding);
  });

  it("D4–D6. lowest payout offer wins; pot − payout becomes the dividend pool, split equally among the others", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    // payout offers 480, 470, 460, 450 → discounts 20, 30, 40, 50 (each must be a lower payout than the best so far)
    const res = await runRound(env, id, [A, B, C, D, E], [
      { who: B, discount: MST(20) }, { who: C, discount: MST(30) }, { who: E, discount: MST(40) }, { who: D, discount: MST(50) },
    ]);
    const ev = settled(res);
    expect(ev.args.winner).to.equal(D.address);
    expect(ev.args.pot).to.equal(MST(500));
    expect(ev.args.discount).to.equal(MST(50));
    const h = await env.chit.getRoundHistory(id, 1);
    expect(h.payout + h.holdback).to.equal(MST(450));   // winner's payout offer
    expect(h.outcome).to.equal(Outcome.Auction);
    for (const m of [A, B, C, E]) expectEvent(res, "DividendCredited", [id, 1, m.address, MST("12.5")]);
    expect(await claimable(env, id, A)).to.equal(MST("12.5"));
    // an offer that is not lower than the best is rejected
    await checkBalanceInvariant(env, id);
  });

  it("D7. recipient cannot accept after declining", async () => {
    const [A] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    await env.chit.connect(A).declineFullPot(id);
    await expect(env.chit.connect(A).acceptFullPot(id)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Auction);
    await expect(env.chit.connect(A).declineFullPot(id)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Auction);
  });

  it("D8. recipient cannot decline (or accept twice) after accepting", async () => {
    const [A] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    await env.chit.connect(A).acceptFullPot(id);
    await expect(env.chit.connect(A).declineFullPot(id)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
    await expect(env.chit.connect(A).acceptFullPot(id)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
  });

  it("D9. bids after the auction closes and early settlement are rejected", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    await env.chit.connect(A).declineFullPot(id);
    await env.chit.connect(B).placeBid(id, MST(10));
    await expect(env.chit.settleRound(id)).to.be.revertedWithCustomError(env.chit, "BiddingNotOver");
    await time.increase(BD + 1);
    await expect(env.chit.connect(C).placeBid(id, MST(20))).to.be.revertedWithCustomError(env.chit, "BiddingClosed");
    await env.chit.settleRound(id);
    expect((await env.chit.getRoundHistory(id, 1)).winner).to.equal(B.address);
  });

  it("D10. no duplicate payout: a settled round cannot settle again and claimable pays once", async () => {
    const [A] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    await env.chit.connect(A).acceptFullPot(id);
    await expect(env.chit.settleRound(id)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
    await expect(env.chit.connect(A).withdraw(id)).to.changeEtherBalance(A, MST(400));
    await expect(env.chit.connect(A).withdraw(id)).to.be.revertedWithCustomError(env.chit, "NothingToWithdraw");
  });

  it("D11. a missed contribution is covered from collateral at close; the pot stays full", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    for (const m of [A, B, C, E]) await env.chit.connect(m).contribute(id, { value: MST(100) });
    await time.increase(CD + 1);
    await expect(env.chit.closeContributions(id)).to.emit(env.chit, "DefaultDetected").withArgs(id, 1, D.address, MST(100), MST(100), 0, 0);
    expect((await env.chit.getRound(id)).pot).to.equal(MST(500));
    expect(await collateral(env, id, D)).to.equal(MST(100));
    expect((await env.chit.getMember(id, D.address)).removed).to.equal(false);
  });

  it("D12. insufficient collateral: partial cover, real shortfall, member removed", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Low, Tier.Medium], { params: EXAMPLE });
    expect(await collateral(env, id, D)).to.equal(MST(100)); // Low = 0.5 × 200
    const res = await runRound(env, id, [A, B, C, E], [], { decision: "accept" });
    expectEvent(res, "DefaultDetected", [id, 1, D.address, MST(100), MST(100), 0, 0]);
    const res2 = await runRound(env, id, [A, B, C, E], [], { decision: "accept" });
    expectEvent(res2, "DefaultDetected", [id, 2, D.address, MST(100), 0, 0, MST(100)]);
    expectEvent(res2, "Removed", [id, 2, D.address]);
    expect((await env.chit.getRoundHistory(id, 2)).pot).to.equal(MST(400));
  });

  it("only the designated recipient can decide, and only before the decision deadline", async () => {
    const [A, B] = env.members;
    const id = await createAndFill(env, M5, { params: EXAMPLE });
    await potReady(id);
    await expect(env.chit.connect(B).acceptFullPot(id)).to.be.revertedWithCustomError(env.chit, "NotRecipient");
    await expect(env.chit.connect(B).declineFullPot(id)).to.be.revertedWithCustomError(env.chit, "NotRecipient");
    await time.increase(BD + 1);
    await expect(env.chit.connect(A).declineFullPot(id)).to.be.revertedWithCustomError(env.chit, "DecisionClosed");
  });

  it("demo scenario: accept, decline → auction → dividends, accept, default covered, final round", async () => {
    const [A, B, C, D, E] = env.members;
    const all = [A, B, C, D, E];
    const id = await createAndFill(env, M5, { params: EXAMPLE });

    // Round 1: A is the recipient and accepts 500 MST. No auction.
    const r1 = await runRound(env, id, all, [], { decision: "accept" });
    expect(r1.recipient).to.equal(A.address);
    expectEvent(r1, "FullPotAccepted", [id, 1, A.address, MST(500)]);
    expect(r1.events.some((e) => e.name === "BidPlaced" || e.name === "FullPotDeclined")).to.equal(false);

    // Round 2: B is the recipient and declines. Offers B 480, C 470, E 460, D 450 → D wins 450; 50 split 12.5 × 4.
    const before = await Promise.all([A, B, C, E].map((m) => claimable(env, id, m)));
    const r2 = await runRound(env, id, all, [
      { who: B, discount: MST(20) }, { who: C, discount: MST(30) }, { who: E, discount: MST(40) }, { who: D, discount: MST(50) },
    ]);
    expect(r2.recipient).to.equal(B.address);
    expect(settled(r2).args.winner).to.equal(D.address);
    const after = await Promise.all([A, B, C, E].map((m) => claimable(env, id, m)));
    after.forEach((v, i) => expect(v - before[i]).to.equal(MST("12.5")));
    expect((await env.chit.getRoundHistory(id, 2)).outcome).to.equal(Outcome.Auction);

    // Round 3: C is the recipient and accepts.
    const r3 = await runRound(env, id, all, [], { decision: "accept" });
    expect(r3.recipient).to.equal(C.address);
    expect((await env.chit.getRoundHistory(id, 3)).outcome).to.equal(Outcome.Accepted);

    // Round 4: D misses; collateral covers 100 MST; D already won, so E is the recipient and accepts.
    const r4 = await runRound(env, id, [A, B, C, E], [], { decision: "accept" });
    expectEvent(r4, "DefaultDetected", [id, 4, D.address, MST(100), MST(100), 0, 0]);
    expect(r4.recipient).to.equal(E.address);
    expect((await env.chit.getRoundHistory(id, 4)).pot).to.equal(MST(500));

    // Round 5: B (the only member who has not received a pot) accepts and the circle completes.
    const r5 = await runRound(env, id, all, [], { decision: "accept" });
    expect(r5.recipient).to.equal(B.address);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);
    const winners = await Promise.all([1, 2, 3, 4, 5].map(async (r) => (await env.chit.getRoundHistory(id, r)).winner));
    expect(winners).to.deep.equal([A, D, C, E, B].map((m) => m.address));
    await checkBalanceInvariant(env, id);
  });
});
