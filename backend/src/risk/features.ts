import { getReputation, getRiskTier, isConfigured, labelOf, toJson, type Tier } from "../chain";
import { eventsForAddress, type EventRow } from "../db";
import { seedFor, type Reputation } from "./seed";

export type DataSource = "SYNTHETIC" | "ONCHAIN" | "MIXED";
export interface Features {
  reputation: Reputation;   // merged (on-chain + synthetic)
  onChain: Reputation;
  synthetic: Reputation | null;
  onChainTier: Tier;
  dataSource: DataSource;
  history: EventRow[];
}

const ZERO: Reputation = { paidOnTime: 0, missed: 0, circlesCompleted: 0, circlesRemoved: 0 };
const isZero = (r: Reputation): boolean => r.paidOnTime + r.missed + r.circlesCompleted + r.circlesRemoved === 0;

/** Merge on-chain reputation() + indexed events (history) + synthetic seed for demo wallets. */
export async function buildFeatures(address: string): Promise<Features> {
  let onChain: Reputation = ZERO;
  let onChainTier: Tier = 0;
  if (isConfigured()) {
    try {
      [onChain, onChainTier] = await Promise.all([getReputation(address), getRiskTier(address)]);
    } catch (e) {
      console.warn(`[risk] on-chain read failed for ${address}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const synthetic = seedFor(labelOf(address));
  const history = eventsForAddress(address, 50);
  const reputation: Reputation = synthetic
    ? {
        paidOnTime: onChain.paidOnTime + synthetic.paidOnTime,
        missed: onChain.missed + synthetic.missed,
        circlesCompleted: onChain.circlesCompleted + synthetic.circlesCompleted,
        circlesRemoved: onChain.circlesRemoved + synthetic.circlesRemoved,
      }
    : onChain;
  const dataSource: DataSource = synthetic ? (isZero(onChain) ? "SYNTHETIC" : "MIXED") : "ONCHAIN";
  return { reputation, onChain, synthetic, onChainTier, dataSource, history };
}

export function featuresJson(f: Features): unknown { return toJson(f); }
