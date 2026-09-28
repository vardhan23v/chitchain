import { ethers, network } from "hardhat";

/** Prints chain ID, latest block and the deployer's balance — Phase 0 connectivity check. */
async function main() {
  const net = await ethers.provider.getNetwork();
  const block = await ethers.provider.getBlockNumber();
  console.log(`network      : ${network.name}`);
  console.log(`chain id     : ${net.chainId}`);
  console.log(`latest block : ${block}`);
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.log("no accounts   : set DEPLOYER_PRIVATE_KEY in .env");
    return;
  }
  for (const [i, s] of signers.entries()) {
    const bal = await ethers.provider.getBalance(s.address);
    console.log(`account[${i}]   : ${s.address}  ${ethers.formatEther(bal)} MSTC`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
