import { Router } from "express";
import { contractAs, isConfigured, oracle, sendTx, type Tier } from "../chain";
import { assessRisk, type RiskResult } from "../risk";
import { ApiError, parseAddress, wrap } from "./util";

export const members = Router();

members.get("/members/:addr/risk", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  res.json(await assessRisk(address));
}));

/** Computes the score and sends setRiskTier from the oracle wallet if the tier differs (or ?force=1). */
export async function assessAndSetTier(address: string, force: boolean): Promise<RiskResult & { txHash: string | null }> {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (!oracle) throw new ApiError(503, "RISK_ORACLE_PRIVATE_KEY not configured", "NO_ORACLE");
  const oracleContract = contractAs(oracle);
  const result = await assessRisk(address, true);
  let txHash: string | null = null;
  if (force || result.onChainTier !== result.tier) {
    const rc = await sendTx(`oracle setRiskTier ${address} → ${result.tier}`, oracle, () => oracleContract.setRiskTier(address, result.tier));
    txHash = rc.hash;
    result.onChainTier = result.tier as Tier;
  }
  return { ...result, txHash };
}

members.post("/members/:addr/assess", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  const force = ["1", "true", "yes"].includes(String(req.query.force ?? "").toLowerCase());
  res.json(await assessAndSetTier(address, force));
}));
