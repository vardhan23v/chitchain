import { ethers } from "hardhat";

/** Sends gas money from the deployer to keeper, risk oracle and the five custodial demo wallets. */
async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY missing in .env");
  const target = ethers.parseEther(process.env.FUND_AMOUNT ?? "1");
  const roles: { name: string; key: string }[] = [
    { name: "keeper", key: process.env.KEEPER_PRIVATE_KEY ?? "" },
    { name: "riskOracle", key: process.env.RISK_ORACLE_PRIVATE_KEY ?? "" },
    ...(process.env.AGENT_WALLET_KEYS ?? "").split(",").map((k, i) => ({ name: `demo ${"ABCDE"[i] ?? i}`, key: k.trim() })),
  ].filter((r) => r.key.length > 0);

  console.log(`deployer ${deployer.address} balance ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MSTC`);
  for (const { name, key } of roles) {
    const addr = new ethers.Wallet(key).address;
    const bal = await ethers.provider.getBalance(addr);
    if (bal >= target) { console.log(`${name.padEnd(11)} ${addr} already has ${ethers.formatEther(bal)}`); continue; }
    const tx = await deployer.sendTransaction({ to: addr, value: target - bal });
    await tx.wait();
    console.log(`${name.padEnd(11)} ${addr} topped up to ${ethers.formatEther(target)}  tx ${tx.hash}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
