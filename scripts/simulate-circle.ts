import { ethers } from "hardhat";

async function main() {
  console.log("--- Starting ChitChain Circle Simulation ---");
  const [organizer, alice, bob, charlie] = await ethers.getSigners();

  const ChitChain = await ethers.getContractFactory("ChitChain");
  const chitChain = await ChitChain.deploy();
  await chitChain.waitForDeployment();
  const address = await chitChain.getAddress();

  console.log(`ChitChain deployed to: ${address}`);

  const contribution = ethers.parseEther("0.1");
  const cycleDuration = 3600; // 1 hour
  const memberLimit = 3;

  console.log("Creating circle with 3 members...");
  const tx = await chitChain.createCircle(
    "Simulation Club",
    contribution,
    cycleDuration,
    memberLimit,
    ethers.ZeroAddress
  );
  await tx.wait();

  console.log("Circle created successfully. Simulating member joins...");
  await chitChain.connect(alice).joinCircle(1, { value: contribution });
  await chitChain.connect(bob).joinCircle(1, { value: contribution });
  await chitChain.connect(charlie).joinCircle(1, { value: contribution });

  console.log("All 3 members joined. Circle is now active.");
  console.log("--- Simulation Complete ---");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
