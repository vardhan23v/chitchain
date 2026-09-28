import { ethers } from "hardhat";

async function main() {
  console.log("Checking signers & balances on target network...");
  const signers = await ethers.getSigners();

  for (let i = 0; i < Math.min(signers.length, 5); i++) {
    const address = await signers[i].getAddress();
    const balance = await ethers.provider.getBalance(address);
    console.log(`Signer #${i} (${address}): ${ethers.formatEther(balance)} ETH`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
