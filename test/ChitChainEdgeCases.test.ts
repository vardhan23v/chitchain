import { expect } from "chai";
import { ethers } from "hardhat";
import { ChitChain } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChitChain Edge Cases & Boundary Conditions", () => {
  let chitChain: ChitChain;
  let organizer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async () => {
    [organizer, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ChitChain");
    chitChain = (await Factory.deploy()) as ChitChain;
    await chitChain.waitForDeployment();
  });

  it("should enforce minimum contribution floor", async () => {
    await expect(
      chitChain.createCircle("Tiny Pot", 0, 3600, 2, ethers.ZeroAddress)
    ).to.be.revertedWith("Contribution must be > 0");
  });

  it("should enforce valid cycle durations", async () => {
    await expect(
      chitChain.createCircle("Zero Duration", ethers.parseEther("0.1"), 0, 2, ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid duration");
  });
});
