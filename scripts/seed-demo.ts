import { ethers } from "hardhat";

/**
 * One-command demo setup on MST testnet:
 *   1. funds the agent wallets from the deployer (so they can pay gas for placeBid)
 *   2. sets demo risk tiers via the oracle (A Low, B Medium, C Low, D High, E Medium)
 *   3. creates a 5-member circle with 30 s contribution + 30 s bidding phases (v2 CircleParams struct)
 * Members join from their own BridgeKey wallets in the UI; that is part of the live demo.
 */
async function main() {
  const address = process.env.CHITCHAIN_ADDRESS;
  if (!address) throw new Error("CHITCHAIN_ADDRESS missing in .env");
  const [deployer] = await ethers.getSigners();
  const oracle = new ethers.Wallet(process.env.RISK_ORACLE_PRIVATE_KEY!, ethers.provider);
  const chit = await ethers.getContractAt("ChitChain", address);

  const agentKeys = (process.env.AGENT_WALLET_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  const agents = agentKeys.map((k) => new ethers.Wallet(k, ethers.provider));
  const demoAddrs = (process.env.DEMO_MEMBER_ADDRESSES ?? "").split(",").map((a) => a.trim()).filter(Boolean);
  const tiers = [1, 2, 1, 3, 2]; // Low, Medium, Low, High, Medium

  console.log(`contract ${address}`);
  for (const a of agents) {
    const bal = await ethers.provider.getBalance(a.address);
    if (bal < ethers.parseEther("0.2")) {
      const tx = await deployer.sendTransaction({ to: a.address, value: ethers.parseEther("0.5") });
      await tx.wait();
      console.log(`funded agent ${a.address}  tx ${tx.hash}`);
    }
  }
  for (let i = 0; i < demoAddrs.length && i < tiers.length; i++) {
    const tx = await chit.connect(oracle).setRiskTier(demoAddrs[i], tiers[i]);
    await tx.wait();
    console.log(`setRiskTier(${demoAddrs[i]}, ${tiers[i]})  tx ${tx.hash}`);
  }
  const tx = await chit.createCircle({
    contribution: ethers.parseEther("0.1"),
    baseCollateral: ethers.parseEther("0.1"),
    maxMembers: 5,
    contributionDuration: 30,
    biddingDuration: 30,
    joinWindow: 1800,
    feeBps: 100,
    holdbackBps: 1000,     // 10% of a winner's payout locked until completion
    maxDiscountBps: 4000,  // bids capped at 40% of the expected pot
    lowBps: 5000,
    mediumBps: 10_000,
    highBps: 20_000,
  });
  const rc = await tx.wait();
  console.log(`createCircle tx ${tx.hash} block ${rc!.blockNumber}  circleCount=${await chit.circleCount()}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
