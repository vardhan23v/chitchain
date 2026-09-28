import { ethers } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ONE, ROUND, JOIN_WINDOW, FEE_BPS, Tier, Status, params,
  deployEnv, createAndFill, runRound, checkBalanceInvariant, claimable, collateral, type Env,
} from "./helpers";

const fee = (pot: bigint) => (pot * BigInt(FEE_BPS)) / 10_000n;

describe("ChitChain", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  it("1. five-member happy path reconciles to the wei", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium]);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Active);

    const all = [A, B, C, D, E];
    const winners: string[] = [];
    for (let r = 0; r < 5; r++) {
      const tx = await runRound(env, id, all);
      const rc = await tx.wait();
      const ev = rc!.logs.map((l) => env.chit.interface.parseLog(l)).find((p) => p?.name === "RoundSettled")!;
      winners.push(ev.args.winner);
      expect(ev.args.pot).to.equal(5n * ONE);
      expect(ev.args.fee).to.equal(fee(5n * ONE));
    }
    // no bids → winners in join order; invariant 2: each member paid out exactly once
    expect(winners).to.deep.equal(all.map((m) => m.address));
    expect(new Set(winners).size).to.equal(5);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);

    // everybody withdraws; treasury sweeps; contract ends empty
    let paidOut = 0n;
    for (const m of all) {
      const amt = await claimable(env, id, m);
      await expect(env.chit.connect(m).withdraw(id)).to.changeEtherBalance(m, amt);
      paidOut += amt;
    }
    const tre = await env.chit.treasuryClaimable();
    expect(tre).to.equal(fee(5n * ONE) * 5n);
    await env.chit.connect(env.treasury).withdrawTreasury();
    expect(paidOut + tre).to.equal(5n * 5n * ONE + 5n * ONE); // contributions + collateral
    expect(await ethers.provider.getBalance(await env.chit.getAddress())).to.equal(0n);
  });

  it("2. Unassessed pays 2× collateral, Low pays 0.5×", async () => {
    const [A, B, C] = env.members;
    await env.chit.connect(env.oracle).setRiskTier(B.address, Tier.Low);
    await env.chit.createCircle(params({ maxMembers: 3 }));
    const id = 1n;
    expect(await env.chit.requiredCollateral(A.address, id)).to.equal(2n * ONE);
    expect(await env.chit.requiredCollateral(B.address, id)).to.equal(ONE / 2n);
    await expect(env.chit.connect(A).join(id, { value: ONE }))
      .to.be.revertedWithCustomError(env.chit, "WrongAmount").withArgs(2n * ONE, ONE);
    await expect(env.chit.connect(A).join(id, { value: 2n * ONE }))
      .to.emit(env.chit, "Joined").withArgs(id, A.address, Tier.Unassessed, 2n * ONE);
    await env.chit.connect(B).join(id, { value: ONE / 2n });
    await expect(env.chit.connect(C).join(id, { value: 2n * ONE })).to.emit(env.chit, "CircleStarted");
    // invalid params
    await expect(env.chit.createCircle(params({ maxMembers: 1 }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    await expect(env.chit.createCircle(params({ maxMembers: 3, feeBps: 301 }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    await expect(env.chit.createCircle(params({ maxMembers: 3, baseCollateral: ONE - 1n }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    await expect(env.chit.connect(A).setRiskTier(A.address, Tier.Low)).to.be.revertedWithCustomError(env.chit, "OnlyOracle");
  });

  it("3. oracle tier change after join does not affect the circle (invariant 5)", async () => {
    const [A] = env.members;
    const id = await createAndFill(env, [Tier.Low, Tier.Medium, Tier.Medium]);
    await env.chit.connect(env.oracle).setRiskTier(A.address, Tier.High);
    expect(await env.chit.riskTier(A.address)).to.equal(Tier.High);
    expect((await env.chit.getMember(id, A.address)).tier).to.equal(Tier.Low);
    expect(await env.chit.requiredCollateral(A.address, id)).to.equal(ONE / 2n);
    // holdback still uses the Low snapshot: owed 2, required 50% = 1, collateral 0.5 → holdback 0.5
    await expect(runRound(env, id, env.members.slice(0, 3), [{ who: A, discount: ONE / 10n }]))
      .to.emit(env.chit, "HoldbackApplied").withArgs(id, A.address, ONE / 2n);
  });

  it("4. pre-win miss is covered from collateral and the pot stays full", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.High, Tier.Medium]);
    expect(await collateral(env, id, D)).to.equal(2n * ONE);
    const tx = runRound(env, id, [A, B, C, E]);
    await expect(tx).to.emit(env.chit, "DefaultDetected").withArgs(id, 1, D.address, ONE, ONE, 0, 0);
    // A (Medium) wins: owed 4, required 75% = 3, collateral 1 → holdback 2
    await expect(tx).to.emit(env.chit, "HoldbackApplied").withArgs(id, A.address, 2n * ONE);
    await expect(tx).to.emit(env.chit, "RoundSettled").withArgs(id, 1, A.address, 5n * ONE, 5n * ONE - fee(5n * ONE) - 2n * ONE, 0, fee(5n * ONE));
    expect(await collateral(env, id, D)).to.equal(ONE);
    const rep = await env.chit.reputation(D.address);
    expect(rep.missed).to.equal(1);
    const dm = await env.chit.getMember(id, D.address);
    expect(dm.defaults).to.equal(1);
    expect(dm.collateralUsed).to.equal(ONE);
    expect((await env.chit.reputation(A.address)).paidOnTime).to.equal(1);
  });

  it("5. exhausted collateral removes the member; circle completes with fewer rounds (invariant 4)", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Low, Tier.Medium]);
    expect(await collateral(env, id, D)).to.equal(ONE / 2n);
    // D misses round 1: 0.5 collateral < 1 due, reserve is empty → removed
    const tx = runRound(env, id, [A, B, C, E]);
    await expect(tx).to.emit(env.chit, "DefaultDetected").withArgs(id, 1, D.address, ONE, ONE / 2n, 0, ONE / 2n);
    await expect(tx).to.emit(env.chit, "Removed").withArgs(id, 1, D.address);
    const d = await env.chit.getMember(id, D.address);
    expect(d.removed).to.be.true;
    expect(d.collateral).to.equal(0n);
    expect((await env.chit.reputation(D.address)).circlesRemoved).to.equal(1);
    await expect(env.chit.connect(D).contribute(id, { value: ONE })).to.be.revertedWithCustomError(env.chit, "MemberRemoved");
    await expect(env.chit.connect(D).placeBid(id, 1n)).to.be.revertedWithCustomError(env.chit, "NotEligibleToBid");

    // 3 more rounds (B, C, E) with bids → D never wins and never earns dividends
    const rest = [A, B, C, E];
    for (const bidder of [B, C, E]) {
      const rc = await (await runRound(env, id, rest, [{ who: bidder, discount: ONE / 4n }])).wait();
      const ev = rc!.logs.map((l) => env.chit.interface.parseLog(l)).find((p) => p?.name === "RoundSettled")!;
      expect(ev.args.winner).to.equal(bidder.address);
    }
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);
    expect((await env.chit.getCircle(id)).round).to.equal(4);
    expect(await claimable(env, id, D)).to.equal(0n);
  });

  it("6. High-tier round-1 winner is fully secured by holdback; later defaults all covered", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.High, Tier.Medium, Tier.Medium, Tier.Medium]);
    const all = [A, B, C, D, E];
    const discount = ONE / 2n;
    const pot = 5n * ONE;
    // owed = 1 × 4 remaining, coverage 100% → required 4; collateral 2 → holdback 2
    const tx = runRound(env, id, all, [{ who: B, discount }]);
    await expect(tx).to.emit(env.chit, "HoldbackApplied").withArgs(id, B.address, 2n * ONE);
    await expect(tx).to.emit(env.chit, "RoundSettled").withArgs(id, 1, B.address, pot, pot - fee(pot) - discount - 2n * ONE, discount, fee(pot));
    expect(await collateral(env, id, B)).to.equal(4n * ONE);
    // dividends: 0.5 split 4 ways
    for (const m of [A, C, D, E]) expect(await claimable(env, id, m)).to.equal(discount / 4n);

    // B never pays again → 4 rounds covered from collateral, never removed, pot always full
    for (let r = 2; r <= 5; r++) {
      await expect(runRound(env, id, [A, C, D, E])).to.emit(env.chit, "DefaultDetected").withArgs(id, r, B.address, ONE, ONE, 0, 0);
    }
    const b = await env.chit.getMember(id, B.address);
    expect(b.removed).to.be.false;
    expect(b.collateral).to.equal(0n);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Completed);
    expect(await env.chit.treasuryClaimable()).to.equal(fee(pot) * 5n);
  });

  it("7. Low-tier round-1 winner defaults: collateral, then reserve, then removed", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Low, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium]);
    const all = [A, B, C, D, E];
    const pot = 5n * ONE;
    // owed 4, coverage 50% → required 2; collateral 0.5 → holdback 1.5
    await expect(runRound(env, id, all, [{ who: A, discount: ONE / 2n }]))
      .to.emit(env.chit, "HoldbackApplied").withArgs(id, A.address, ONE + ONE / 2n);
    expect(await collateral(env, id, A)).to.equal(2n * ONE);

    // rounds 2 and 3: covered from collateral (2 → 1 → 0)
    await expect(runRound(env, id, [B, C, D, E])).to.emit(env.chit, "DefaultDetected").withArgs(id, 2, A.address, ONE, ONE, 0, 0);
    await expect(runRound(env, id, [B, C, D, E])).to.emit(env.chit, "DefaultDetected").withArgs(id, 3, A.address, ONE, ONE, 0, 0);
    expect(await collateral(env, id, A)).to.equal(0n);
    const reserveBefore = (await env.chit.getCircle(id)).reserve;
    expect(reserveBefore).to.equal(fee(pot) * 3n);

    // round 4: nothing left → reserve covers 0.15, A removed, pot = 4 + 0.15
    const tx = runRound(env, id, [B, C, D, E]);
    await expect(tx).to.emit(env.chit, "DefaultDetected").withArgs(id, 4, A.address, ONE, 0, reserveBefore, ONE - reserveBefore);
    await expect(tx).to.emit(env.chit, "Removed").withArgs(id, 4, A.address);
    const pot4 = 4n * ONE + reserveBefore;
    await expect(tx).to.emit(env.chit, "RoundSettled").withArgs(id, 4, D.address, pot4, pot4 - fee(pot4), 0, fee(pot4));
    expect((await env.chit.getCircle(id)).reserve).to.equal(fee(pot4));
  });

  it("8. no bids → first eligible wins; equal bid rejected, strictly higher bid leads", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium]);
    const all = [A, B, C, D, E];
    const hbA = 2n * ONE; // Medium: owed 4 × 75% = 3, collateral 1
    await expect(runRound(env, id, all)).to.emit(env.chit, "RoundSettled").withArgs(id, 1, A.address, 5n * ONE, 5n * ONE - fee(5n * ONE) - hbA, 0, fee(5n * ONE));

    await env.chit.connect(C).placeBid(id, ONE / 2n);
    await expect(env.chit.connect(D).placeBid(id, ONE / 2n)).to.be.revertedWithCustomError(env.chit, "BidNotHigher").withArgs(ONE / 2n);
    await expect(env.chit.connect(A).placeBid(id, ONE)).to.be.revertedWithCustomError(env.chit, "NotEligibleToBid");
    const max = (await env.chit.getRound(id)).maxDiscount;
    expect(max).to.equal(2n * ONE);
    await expect(env.chit.connect(D).placeBid(id, max + 1n)).to.be.revertedWithCustomError(env.chit, "BidTooHigh").withArgs(max);
    await env.chit.connect(D).placeBid(id, ONE / 2n + 1n);
    const rs = await env.chit.getRound(id);
    expect(rs.bestBidder).to.equal(D.address);
    const hbD = (3n * ONE * 75n) / 100n - ONE; // owed 3 × 75% = 2.25, collateral 1 → 1.25
    await expect(runRound(env, id, all)).to.emit(env.chit, "RoundSettled").withArgs(id, 2, D.address, 5n * ONE, 5n * ONE - fee(5n * ONE) - (ONE / 2n + 1n) - hbD, ONE / 2n + 1n, fee(5n * ONE));
  });

  it("9. round with no eligible winner distributes the pot as dividends", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Low, Tier.Low]);
    await runRound(env, id, [A, B, C]); // A wins round 1 (first in join order)
    const reserve1 = (await env.chit.getCircle(id)).reserve;
    const aBefore = await claimable(env, id, A);
    const aColl = await collateral(env, id, A); // 1 + 0.5 holdback
    expect(aColl).to.equal(ONE + ONE / 2n);
    // B and C both skip with 0.5 collateral each → both removed, nobody eligible
    const pot = ONE + (ONE / 2n + reserve1) + ONE / 2n;
    const tx = runRound(env, id, [A]);
    await expect(tx).to.emit(env.chit, "Removed").withArgs(id, 2, B.address);
    await expect(tx).to.emit(env.chit, "Removed").withArgs(id, 2, C.address);
    await expect(tx).to.emit(env.chit, "RoundSettled").withArgs(id, 2, ethers.ZeroAddress, pot, 0, 0, fee(pot));
    await expect(tx).to.emit(env.chit, "DividendCredited").withArgs(id, 2, A.address, pot - fee(pot));
    await expect(tx).to.emit(env.chit, "CircleCompleted").withArgs(id);
    // A also gets collateral back on completion
    expect(await claimable(env, id, A)).to.equal(aBefore + pot - fee(pot) + aColl);
  });

  it("10. dividend dust goes to the first eligible recipient in join order", async () => {
    const [A, B, C, D, E] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium, Tier.Medium]);
    const discount = 7n; // 7 wei among 4 others → 1 each + 3 dust to A
    const tx = runRound(env, id, [A, B, C, D, E], [{ who: B, discount }]);
    await expect(tx).to.emit(env.chit, "DividendCredited").withArgs(id, 1, A.address, 4n);
    await expect(tx).to.emit(env.chit, "DividendCredited").withArgs(id, 1, C.address, 1n);
    expect(await claimable(env, id, A)).to.equal(4n);
    expect(await claimable(env, id, E)).to.equal(1n);
  });

  it("11. leave while Open; cancel after deadline refunds everyone", async () => {
    const [A, B, C] = env.members;
    await env.chit.createCircle(params({ maxMembers: 3 }));
    const id = 1n;
    await env.chit.connect(A).join(id, { value: 2n * ONE });
    await env.chit.connect(B).join(id, { value: 2n * ONE });
    await expect(env.chit.connect(A).leave(id)).to.emit(env.chit, "Left").withArgs(id, A.address, 2n * ONE);
    expect(await env.chit.getMembers(id)).to.deep.equal([B.address]);
    expect(await claimable(env, id, A)).to.equal(2n * ONE);
    await expect(env.chit.connect(A).leave(id)).to.be.revertedWithCustomError(env.chit, "NotMember");
    await expect(env.chit.connect(C).withdraw(id)).to.be.revertedWithCustomError(env.chit, "NothingToWithdraw");
    await expect(env.chit.connect(A).withdraw(id)).to.changeEtherBalance(A, 2n * ONE);

    await expect(env.chit.cancel(id)).to.be.revertedWithCustomError(env.chit, "JoinWindowStillOpen");
    await time.increase(JOIN_WINDOW + 1);
    await expect(env.chit.connect(C).join(id, { value: 2n * ONE })).to.be.revertedWithCustomError(env.chit, "JoinWindowClosed");
    await expect(env.chit.cancel(id)).to.emit(env.chit, "CircleCancelled").withArgs(id);
    expect((await env.chit.getCircle(id)).status).to.equal(Status.Cancelled);
    expect(await claimable(env, id, B)).to.equal(2n * ONE);
    expect(await collateral(env, id, B)).to.equal(0n);
    await checkBalanceInvariant(env, id);
    await expect(env.chit.connect(B).withdraw(id)).to.changeEtherBalance(B, 2n * ONE);
  });

  it("12. re-entrancy on withdraw fails; settle twice / early reverts (invariant 3)", async () => {
    const [A, B, C] = env.members;
    await env.chit.createCircle(params({ maxMembers: 3 }));
    const id = 1n;
    const attacker = await (await ethers.getContractFactory("ReentrantAttacker")).deploy(await env.chit.getAddress());
    env.tracked.push(await attacker.getAddress());
    await attacker.joinAndLeave(id, { value: 2n * ONE });
    await expect(attacker.attack()).to.changeEtherBalance(attacker, 2n * ONE);
    expect(await attacker.reentered()).to.equal(0n);
    await expect(attacker.attack()).to.be.revertedWithCustomError(env.chit, "NothingToWithdraw");

    for (const m of [A, B, C]) await env.chit.connect(m).join(id, { value: 2n * ONE });
    await expect(env.chit.settleRound(id)).to.be.revertedWithCustomError(env.chit, "BiddingNotOver");
    await time.increase(ROUND + 1);
    await env.chit.settleRound(id);
    await expect(env.chit.settleRound(id)).to.be.revertedWithCustomError(env.chit, "BiddingNotOver");
    // direct transfers rejected
    await expect(A.sendTransaction({ to: await env.chit.getAddress(), value: 1n })).to.be.revertedWithCustomError(env.chit, "DirectPaymentRejected");
    await checkBalanceInvariant(env, id);
  });
});
