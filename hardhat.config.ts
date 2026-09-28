import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const RPC = process.env.MST_RPC_URL ?? "https://testnetrpc.mstblockchain.com";
// Verified 2026-09-28: eth_chainId on the testnet RPC returns 0x5752035 = 91562037.
const CHAIN_ID = Number(process.env.MST_CHAIN_ID ?? 91562037);
const keys = [
  process.env.DEPLOYER_PRIVATE_KEY,
  process.env.KEEPER_PRIVATE_KEY,
  process.env.RISK_ORACLE_PRIVATE_KEY,
  ...(process.env.AGENT_WALLET_KEYS ?? "").split(","),
]
  .map((k) => k?.trim())
  .filter((k): k is string => !!k && k.length > 0);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: { chainId: 31337 },
    mstTestnet: { url: RPC, chainId: CHAIN_ID, accounts: keys },
  },
  paths: { sources: "contracts", tests: "test", artifacts: "artifacts" },
};

export default config;
