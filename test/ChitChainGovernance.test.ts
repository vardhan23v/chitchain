import { expect } from "chai";
import { ethers } from "hardhat";
import { ONE, FEE_BPS, Tier, deployEnv, createAndFill, runRound, type Env } from "./helpers";

describe("ChitChain Governance & Fee Distribution", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  it("should deploy with initial zero treasury balance", async () => {
    expect(await ethers.provider.getBalance(await env.chit.getAddress())).to.equal(0n);
    expect(await env.chit.treasuryClaimable()).to.equal(0n);
  });

  it("sweeps every round's fee to the treasury at completion, and only the treasury can withdraw it", async () => {
    const [A, B, C] = env.members;
    const id = await createAndFill(env, [Tier.Medium, Tier.Medium, Tier.Medium]);
    for (let r = 0; r < 3; r++) await runRound(env, id, [A, B, C], [], { decision: "accept" });
    const fee = (3n * ONE * BigInt(FEE_BPS)) / 10_000n;
    expect(await env.chit.treasuryClaimable()).to.equal(fee * 3n);
    await expect(env.chit.connect(A).withdrawTreasury()).to.be.revertedWithCustomError(env.chit, "OnlyTreasury");
    await expect(env.chit.connect(env.treasury).withdrawTreasury()).to.changeEtherBalance(env.treasury, fee * 3n);
  });
});
