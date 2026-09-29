import { expect } from "chai";
import { deployEnv, params, type Env } from "./helpers";

describe("ChitChain Edge Cases & Boundary Conditions", () => {
  let env: Env;
  beforeEach(async () => { env = await deployEnv(); });

  it("should enforce minimum contribution floor", async () => {
    await expect(env.chit.createCircle(params({ contribution: 0n }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
  });

  it("should enforce valid cycle durations", async () => {
    await expect(env.chit.createCircle(params({ contributionDuration: 0 }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    await expect(env.chit.createCircle(params({ biddingDuration: 0 }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
    await expect(env.chit.createCircle(params({ joinWindow: 0 }))).to.be.revertedWithCustomError(env.chit, "InvalidParams");
  });
});
