import { getAddress } from "ethers";
import { buildFeatures } from "./features";
import { scoreReputation } from "./score";
import { explainScore } from "./explain";
import { getRiskCache, setRiskCache } from "../db";
import { eventRowToFeed, type FeedEvent } from "../routes/feedShape";

export interface RiskResult {
  address: string; score: number; tier: number; onChainTier: number;
  factors: { name: string; value: string; effect: string }[];
  explanation: string; explanationSource: "llm" | "template";
  dataSource: "SYNTHETIC" | "ONCHAIN" | "MIXED";
  reputation: { paidOnTime: number; missed: number; circlesCompleted: number; circlesRemoved: number };
  history: FeedEvent[];
}

const CACHE_SEC = 30;

/** Full risk assessment (no tx). Cached for 30 s unless `fresh`. Works for any address (cold start → 60). */
export async function assessRisk(addressRaw: string, fresh = false): Promise<RiskResult> {
  const address = getAddress(addressRaw);
  if (!fresh) {
    const cached = getRiskCache(address, CACHE_SEC);
    if (cached) return JSON.parse(cached) as RiskResult;
  }
  const f = await buildFeatures(address);
  const s = scoreReputation(f.reputation);
  const ex = await explainScore(s.score, s.tier, s.factors, f.dataSource);
  const result: RiskResult = {
    address, score: s.score, tier: s.tier, onChainTier: f.onChainTier, factors: s.factors,
    explanation: ex.explanation, explanationSource: ex.explanationSource, dataSource: f.dataSource,
    reputation: f.reputation, history: f.history.map(eventRowToFeed),
  };
  setRiskCache(address, JSON.stringify(result));
  return result;
}
