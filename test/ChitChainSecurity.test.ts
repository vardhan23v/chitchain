import { expect } from "chai";
import { Tier, deployEnv, createAndFill, params, type Env } from "./helpers";

describe("ChitChain Security Invariants", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  it("should prevent unauthorized administrative calls", async () => {
    const [attacker] = env.members;
    await expect(env.chit.connect(attacker).setRiskTier(attacker.address, Tier.Low)).to.be.revertedWithCustomError(env.chit, "OnlyOracle");
    await expect(env.chit.connect(attacker).withdrawTreasury()).to.be.revertedWithCustomError(env.chit, "OnlyTreasury");
  });

  it("should prevent duplicate registration in the same circle", async () => {
    const [member] = env.members;
    await env.chit.createCircle(params({ maxMembers: 3 }));
    const need = await env.chit.requiredCollateral(member.address, 1);
    await env.chit.connect(member).join(1, { value: need });
    await expect(env.chit.connect(member).join(1, { value: need })).to.be.revertedWithCustomError(env.chit, "AlreadyJoined");
  });

  it("should prevent bidding and deciding on non-existent or inactive circles", async () => {
    const [attacker] = env.members;
    await expect(env.chit.connect(attacker).placeBid(999, 1n)).to.be.revertedWithCustomError(env.chit, "NotActive");
    await expect(env.chit.connect(attacker).acceptFullPot(999)).to.be.revertedWithCustomError(env.chit, "NotActive");
    await expect(env.chit.connect(attacker).declineFullPot(999)).to.be.revertedWithCustomError(env.chit, "NotActive");
  });

  it("the organizer cannot move the pot: only the recipient decides and payouts are pull-only", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium]);
    for (const m of [A, B, C]) await env.chit.connect(m).contribute(id, { value: (await env.chit.getCircle(id)).contribution });
    // the deployer created the circle (organizer) but is not the recipient
    await expect(env.chit.acceptFullPot(id)).to.be.revertedWithCustomError(env.chit, "NotRecipient");
    await expect(env.chit.withdraw(id)).to.be.revertedWithCustomError(env.chit, "NothingToWithdraw");
  });
});
