import { expect } from "chai";
import { ethers } from "hardhat";
import { ChitChain } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChitChain Security Invariants", () => {
  let chitChain: ChitChain;
  let owner: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let member: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, attacker, member] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ChitChain");
    chitChain = (await Factory.deploy()) as ChitChain;
    await chitChain.waitForDeployment();
  });

  it("should prevent unauthorized pause and administrative calls", async () => {
    await expect(
      chitChain.connect(attacker).pause()
    ).to.be.revertedWithCustomError(chitChain, "OwnableUnauthorizedAccount");
  });

  it("should prevent duplicate registration in the same circle", async () => {
    const amount = ethers.parseEther("0.1");
    await chitChain.createCircle("SecTest", amount, 3600, 3, ethers.ZeroAddress);

    await chitChain.connect(member).joinCircle(1, { value: amount });
    await expect(
      chitChain.connect(member).joinCircle(1, { value: amount })
    ).to.be.revertedWith("Already a member");
  });

  it("should prevent bidding on non-existent or inactive circles", async () => {
    await expect(
      chitChain.connect(attacker).placeBid(999, ethers.parseEther("0.01"))
    ).to.be.reverted;
  });
});
