import { ethers } from "hardhat";

async function main() {
  console.log("ChitChain Gas Benchmarking Suite");
  const [deployer, member1, member2] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("ChitChain");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  console.log("Measuring createCircle gas cost...");
  const txCreate = await contract.createCircle(
    "Gas Test",
    ethers.parseEther("0.05"),
    600,
    2,
    ethers.ZeroAddress
  );
  const receiptCreate = await txCreate.wait();
  console.log(`- createCircle Gas Used: ${receiptCreate?.gasUsed.toString()} units`);

  console.log("Measuring joinCircle gas cost...");
  const txJoin1 = await contract.connect(member1).joinCircle(1, { value: ethers.parseEther("0.05") });
  const receiptJoin1 = await txJoin1.wait();
  console.log(`- joinCircle (Member 1) Gas Used: ${receiptJoin1?.gasUsed.toString()} units`);

  const txJoin2 = await contract.connect(member2).joinCircle(1, { value: ethers.parseEther("0.05") });
  const receiptJoin2 = await txJoin2.wait();
  console.log(`- joinCircle (Trigger Start) Gas Used: ${receiptJoin2?.gasUsed.toString()} units`);
}

main().catch(console.error);
