import { ethers, network } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";

/** Deploys ChitChain(riskOracle, treasury) and records address + tx + block in deployments/<network>.json. */
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
  const oracleKey = process.env.RISK_ORACLE_PRIVATE_KEY;
  const riskOracle = oracleKey ? new ethers.Wallet(oracleKey).address : deployer.address;
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  console.log(`deployer   : ${deployer.address}`);
  console.log(`riskOracle : ${riskOracle}`);
  console.log(`treasury   : ${treasury}`);

  const chit = await (await ethers.getContractFactory("ChitChain")).deploy(riskOracle, treasury);
  const tx = chit.deploymentTransaction()!;
  const rc = await tx.wait();
  const address = await chit.getAddress();

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    riskOracle,
    treasury,
    deployTx: tx.hash,
    block: rc!.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  mkdirSync("deployments", { recursive: true });
  writeFileSync(`deployments/${network.name}.json`, JSON.stringify(out, null, 2));
  console.log(`\nChitChain deployed at ${address}`);
  console.log(`tx ${tx.hash} (block ${rc!.blockNumber})`);
  console.log(`explorer: https://testnet.mstscan.com/address/${address}`);
  console.log(`\nNext: set CHITCHAIN_ADDRESS / NEXT_PUBLIC_CHITCHAIN_ADDRESS=${address} and START_BLOCK=${rc!.blockNumber} in .env, then run: npm run export-abi`);
}
main().catch((e) => { console.error(e); process.exit(1); });
