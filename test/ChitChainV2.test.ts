import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ONE, CD, BD, FEE_BPS, Tier, Status, Phase, Outcome, params,
  deployEnv, createAndFill, runRound, expectEvent, settled, checkBalanceInvariant, claimable, collateral, type Env,
} from "./helpers";

const fee = (pot: bigint) => (pot * BigInt(FEE_BPS)) / 10_000n;
const M5 = [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium];

describe("ChitChain v2 — phases, per-circle params, defaults, history", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  it("13. contribute after the contribution deadline reverts; bids are rejected until the auction opens", async () => {
    const [A, B] = env.members;
    const id = await createAndFill(env, M5);
    await expect(env.chit.connect(B).placeBid(id, ONE / 10n)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Contributing);
    await time.increase(CD + 1);
    await expect(env.chit.connect(A).contribute(id, { value: ONE })).to.be.revertedWithCustomError(env.chit, "ContributionClosed");
    await env.chit.closeContributions(id);
    await expect(env.chit.connect(B).placeBid(id, ONE / 10n)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Deciding);
    await expect(env.chit.connect(A).contribute(id, { value: ONE })).to.be.revertedWithCustomError(env.chit, "ContributionClosed");
  });

  it("14. nobody paid: close covers every miss from collateral, then settle waits for the decision window", async () => {
    const [A, B] = env.members;
    const id = await createAndFill(env, M5);
    await time.increase(CD + 1);
    const close = env.chit.closeContributions(id);
    await expect(close).to.emit(env.chit, "DefaultDetected").withArgs(id, 1, A.address, ONE, ONE, 0, 0);
    await expect(close).to.emit(env.chit, "PotReady");
    await expect(env.chit.settleRound(id)).to.be.revertedWithCustomError(env.chit, "DecisionNotOver");
    await time.increase(BD + 1);
    await expect(env.chit.connect(A).acceptFullPot(id)).to.be.revertedWithCustomError(env.chit, "DecisionClosed");
    await expect(env.chit.connect(B).placeBid(id, ONE / 10n)).to.be.revertedWithCustomError(env.chit, "WrongPhase").withArgs(Phase.Deciding);
    // decision window passed → the recipient receives the full pot (still full: every miss was covered)
    await expect(env.chit.settleRound(id)).to.emit(env.chit, "RoundSettled").withArgs(id, 1, A.address, 5n * ONE, 5n * ONE - fee(5n * ONE) - 3n * ONE, 0, fee(5n * ONE));
    expect((await env.chit.getRoundHistory(id, 1)).outcome).to.equal(Outcome.DecisionTimeout);
    await checkBalanceInvariant(env, id);
  });

  it("15. the last contribution closes the phase early and names the recipient", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5);
    for (const m of [A, B, C, D]) await env.chit.connect(m).contribute(id, { value: ONE });
    expect((await env.chit.getRound(id)).phase).to.equal(Phase.Contributing);
    const t = env.chit.connect(E).contribute(id, { value: ONE });
    await expect(t).to.emit(env.chit, "PotReady");
    const r = await env.chit.getRound(id);
    expect(r.phase).to.equal(Phase.Deciding);
    expect(r.recipient).to.equal(A.address);
    expect(r.pot).to.equal(5n * ONE);
    expect(r.collected).to.equal(5n * ONE);
    await checkBalanceInvariant(env, id);
  });

  it("16. getRound / getCircle expose phase, recipient and each deadline as it is set", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5);
    const start = await time.latest();
    let r = await env.chit.getRound(id);
    expect(r.phase).to.equal(Phase.Contributing);
    expect(r.contributionDeadline).to.equal(start + CD);
    expect(r.decisionDeadline).to.equal(0);
    expect(r.biddingDeadline).to.equal(0);
    expect(r.recipient).to.equal(ethers.ZeroAddress);
    for (const m of [A, B, C, D, E]) await env.chit.connect(m).contribute(id, { value: ONE });
    const closedAt = await time.latest();
    r = await env.chit.getRound(id);
    expect(r.decisionDeadline).to.equal(closedAt + BD);
    const c = await env.chit.getCircle(id);
    expect(c.phase).to.equal(Phase.Deciding);
    expect(c.recipient).to.equal(A.address);
    expect(c.decisionDeadline).to.equal(r.decisionDeadline);
    await env.chit.connect(A).declineFullPot(id);
    const declinedAt = await time.latest();
    r = await env.chit.getRound(id);
    expect(r.phase).to.equal(Phase.Auction);
    expect(r.biddingDeadline).to.equal(declinedAt + BD);
    expect((await env.chit.getCircle(id)).roundDeadline).to.equal(r.biddingDeadline);
    await env.chit.connect(B).placeBid(id, ONE / 10n);
    await time.increase(BD + 1);
    await env.chit.settleRound(id);
    const settledAt = await time.latest();
    r = await env.chit.getRound(id);
    expect(r.round).to.equal(2);
    expect(r.phase).to.equal(Phase.Contributing);
    expect(r.contributionDeadline).to.equal(settledAt + CD);
    expect(r.recipient).to.equal(ethers.ZeroAddress);
  });

  it("17. createCircle validates every new parameter", async () => {
    const bad = [
      { holdbackBps: 10_001 }, { maxDiscountBps: 5001 }, { lowBps: 10_001, mediumBps: 10_000 },
      { mediumBps: 20_001 }, { highBps: 0, lowBps: 0, mediumBps: 0 }, { contributionDuration: 0 }, { biddingDuration: 0 },
    ];
    for (const o of bad) {
      await expect(env.chit.createCircle(params(o)), JSON.stringify(o)).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    }
    await expect(env.chit.createCircle(params({ holdbackBps: 10_000, maxDiscountBps: 5000, lowBps: 0 }))).to.emit(env.chit, "CircleCreated");
  });

  it("18. custom collateral multipliers apply per tier; Unassessed pays the High multiplier", async () => {
    const [A, B, C, D] = env.members;
    const p = { lowBps: 2500, mediumBps: 10_000, highBps: 30_000, maxMembers: 4 };
    const id = await createAndFill(env, [Tier.Low, Tier.Medium, Tier.High, Tier.Unassessed], { params: p });
    expect(await collateral(env, id, A)).to.equal(ONE / 4n);
    expect(await collateral(env, id, B)).to.equal(ONE);
    expect(await collateral(env, id, C)).to.equal(3n * ONE);
    expect(await collateral(env, id, D)).to.equal(3n * ONE);
    const c = await env.chit.getCircle(id);
    expect([c.lowBps, c.mediumBps, c.highBps]).to.deep.equal([2500n, 10_000n, 30_000n]);
  });

  it("19. holdbackBps 1000: tier coverage gap dominates for a Medium winner", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5, { params: { holdbackBps: 1000 } });
    const pot = 5n * ONE, payout0 = pot - fee(pot);
    // owed 4, required 75% = 3, collateral 1 → tier gap 2; flat 10% of 4.95 = 0.495 → holdback 2
    const res = await runRound(env, id, [A, B, C, D, E]);
    expectEvent(res, "HoldbackApplied", [id, A.address, 2n * ONE]);
    expectEvent(res, "RoundSettled", [id, 1, A.address, pot, payout0 - 2n * ONE, 0, fee(pot)]);
    expect(await collateral(env, id, A)).to.equal(3n * ONE);
  });

  it("20. holdbackBps 5000: the flat percentage dominates", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5, { params: { holdbackBps: 5000 } });
    const pot = 5n * ONE, payout0 = pot - fee(pot);
    const flat = payout0 / 2n; // 2.475 > tier gap 2
    const res = await runRound(env, id, [A, B, C, D, E]);
    expectEvent(res, "HoldbackApplied", [id, A.address, flat]);
    expectEvent(res, "RoundSettled", [id, 1, A.address, pot, payout0 - flat, 0, fee(pot)]);
    expect(await collateral(env, id, A)).to.equal(ONE + flat);
    expect((await env.chit.getRoundHistory(id, 1)).holdback).to.equal(flat);
  });

  it("21. holdbackBps 0 reproduces the v1 numbers", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5);
    expectEvent(await runRound(env, id, [A, B, C, D, E]), "HoldbackApplied", [id, A.address, 2n * ONE]);
  });

  it("22. flat holdback is released at completion; contract ends empty", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, [Tier.High, Tier.High, Tier.High], { params: { holdbackBps: 5000, maxMembers: 3 } });
    const all = [A, B, C];
    for (let r = 0; r < 3; r++) await runRound(env, id, all);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);
    let out = 0n;
    for (const m of all) { const amt = await claimable(env, id, m); await env.chit.connect(m).withdraw(id); out += amt; }
    const tre = await env.chit.treasuryClaimable();
    await env.chit.connect(env.treasury).withdrawTreasury();
    expect(out + tre).to.equal(3n * 3n * ONE + 3n * 2n * ONE); // contributions + collateral (2× each)
    expect(await ethers.provider.getBalance(await env.chit.getAddress())).to.equal(0n);
  });

  it("23. collateral-covered miss: DefaultDetected with zero shortfall, counters updated, not removed", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.High, Tier.Medium]);
    expectEvent(await runRound(env, id, [A, B, C, E]), "DefaultDetected", [id, 1, D.address, ONE, ONE, 0, 0]);
    const d = await env.chit.getMember(id, D.address);
    expect(d.removed).to.be.false;
    expect(d.defaults).to.equal(1);
    expect(d.collateralUsed).to.equal(ONE);
    expect(d.collateral).to.equal(ONE);
    expect((await env.chit.getRoundHistory(id, 1)).pot).to.equal(5n * ONE); // pot still full
  });

  it("24. partial cover: collateral + reserve, real shortfall reduces the pot, member removed", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Low, Tier.Medium]);
    await runRound(env, id, [A, B, C, D, E]);              // builds reserve = 0.05
    const reserve = (await env.chit.getCircle(id)).reserve;
    const shortfall = ONE - ONE / 2n - reserve;            // due 1 − collateral 0.5 − reserve 0.05
    const res = await runRound(env, id, [A, B, C, E]);
    expectEvent(res, "DefaultDetected", [id, 2, D.address, ONE, ONE / 2n, reserve, shortfall]);
    expectEvent(res, "Removed", [id, 2, D.address]);
    expect((await env.chit.getRoundHistory(id, 2)).pot).to.equal(5n * ONE - shortfall);
    expect((await env.chit.getMember(id, D.address)).defaults).to.equal(1);
    // a removed member is never charged again (double-default prevention)
    await runRound(env, id, [A, B, C, E]);
    expect((await env.chit.getMember(id, D.address)).defaults).to.equal(1);
    expect((await env.chit.reputation(D.address)).missed).to.equal(1);
  });

  it("25. defaults / collateralUsed accumulate across rounds and are per circle", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.High, Tier.Medium, Tier.Medium, Tier.Medium]);
    const all = [A, B, C, D, E];
    await runRound(env, id, all, [{ who: B, discount: ONE / 2n }]);   // B wins, holdback → collateral 4
    for (let r = 2; r <= 5; r++) await runRound(env, id, [A, C, D, E]);
    const b = await env.chit.getMember(id, B.address);
    expect(b.defaults).to.equal(4);
    expect(b.collateralUsed).to.equal(4n * ONE);
    expect(b.removed).to.be.false;
    const id2 = await createAndFill(env, M5);
    const b2 = await env.chit.getMember(id2, B.address);
    expect(b2.defaults).to.equal(0);
    expect(b2.collateralUsed).to.equal(0n);
  });

  it("26. getRoundHistory records every settled round; unsettled rounds are empty", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, M5);
    const empty = await env.chit.getRoundHistory(id, 1);
    expect(empty.winner).to.equal(ethers.ZeroAddress);
    expect(empty.settledAt).to.equal(0);
    await runRound(env, id, [A, B, C, D, E], [{ who: C, discount: ONE / 5n }]);
    const at = await time.latest();
    const h = await env.chit.getRoundHistory(id, 1);
    const pot = 5n * ONE;
    expect(h.winner).to.equal(C.address);
    expect(h.pot).to.equal(pot);
    expect(h.discount).to.equal(ONE / 5n);
    expect(h.fee).to.equal(fee(pot));
    expect(h.holdback).to.equal(2n * ONE);
    expect(h.payout).to.equal(pot - fee(pot) - ONE / 5n - 2n * ONE);
    expect(h.settledAt).to.equal(at);
    expect(h.outcome).to.equal(Outcome.Auction);
    expect(h.recipient).to.equal(A.address);
    expect((await env.chit.getRoundHistory(id, 2)).settledAt).to.equal(0);
  });

  it("27. history for a no-winner round and for the solo final round", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Low, Tier.Low]);
    await runRound(env, id, [A, B, C]);
    await runRound(env, id, [A]);                          // B, C removed → no eligible winner
    const h2 = await env.chit.getRoundHistory(id, 2);
    expect(h2.winner).to.equal(ethers.ZeroAddress);
    expect(h2.payout).to.equal(0n);
    expect(h2.holdback).to.equal(0n);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);
  });

  it("28. maxDiscountBps caps bids per circle (of the assembled pot); 0 disables the auction", async () => {
    const [A, B, C, D, E] = env.members;
    const all = [A, B, C, D, E];
    const id = await createAndFill(env, M5, { params: { maxDiscountBps: 2000 } });
    expect((await env.chit.getRound(id)).maxDiscount).to.equal(ONE);  // 20% of the expected 5
    for (const m of all) await env.chit.connect(m).contribute(id, { value: ONE });
    await env.chit.connect(A).declineFullPot(id);
    await expect(env.chit.connect(B).placeBid(id, ONE + 1n)).to.be.revertedWithCustomError(env.chit, "BidTooHigh").withArgs(ONE);
    await env.chit.connect(B).placeBid(id, ONE);
    const id2 = await createAndFill(env, M5, { params: { maxDiscountBps: 0 } });
    for (const m of all) await env.chit.connect(m).contribute(id2, { value: ONE });
    await env.chit.connect(A).declineFullPot(id2);
    await expect(env.chit.connect(B).placeBid(id2, 1n)).to.be.revertedWithCustomError(env.chit, "BidTooHigh").withArgs(0);
    await time.increase(BD + 1);
    // declined but nobody could bid → the recipient receives the full pot
    await expect(env.chit.settleRound(id2)).to.emit(env.chit, "RoundSettled");
    const h = await env.chit.getRoundHistory(id2, 1);
    expect(h.winner).to.equal(A.address);
    expect(h.outcome).to.equal(Outcome.NoBids);
  });

  it("29. spec extras: duplicate / wrong-amount contribution, non-member bid, treasury auth, no collateral withdrawal", async () => {
    const [A, B, C, D, E, ...others] = await ethers.getSigners();
    void [B, C, D, E];
    const stranger = others[3];
    const id = await createAndFill(env, M5);
    const [a] = env.members;
    await env.chit.connect(a).contribute(id, { value: ONE });
    await expect(env.chit.connect(a).contribute(id, { value: ONE })).to.be.revertedWithCustomError(env.chit, "AlreadyPaid");
    await expect(env.chit.connect(env.members[1]).contribute(id, { value: ONE - 1n })).to.be.revertedWithCustomError(env.chit, "WrongAmount").withArgs(ONE, ONE - 1n);
    await expect(env.chit.connect(stranger).placeBid(id, 1n)).to.be.revertedWithCustomError(env.chit, "WrongPhase");
    await expect(env.chit.connect(stranger).contribute(id, { value: ONE })).to.be.revertedWithCustomError(env.chit, "NotMember");
    await expect(env.chit.connect(A).withdrawTreasury()).to.be.revertedWithCustomError(env.chit, "OnlyTreasury");
    // active collateral is not withdrawable: claimable is 0 while locked
    expect(await collateral(env, id, a)).to.equal(ONE);
    await expect(env.chit.connect(a).withdraw(id)).to.be.revertedWithCustomError(env.chit, "NothingToWithdraw");
    await checkBalanceInvariant(env, id);
  });
});
