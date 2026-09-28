import { expect } from "chai";
import { ethers } from "hardhat";
import { ChitChain } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChitChain Governance & Fee Distribution", () => {
  let chitChain: ChitChain;
  let owner: HardhatEthersSigner;
  let organizer: HardhatEthersSigner;
  let member1: HardhatEthersSigner;
  let member2: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, organizer, member1, member2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ChitChain");
    chitChain = (await Factory.deploy()) as ChitChain;
    await chitChain.waitForDeployment();
  });

  it("should deploy with initial zero treasury balance", async () => {
    const address = await chitChain.getAddress();
    const balance = await ethers.provider.getBalance(address);
    expect(balance).to.equal(0n);
  });
});
