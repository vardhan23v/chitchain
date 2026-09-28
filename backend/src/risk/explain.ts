import { z } from "zod";
import { chatJSON } from "../llm";
import type { Factor, Tier } from "./score";
import { TIER_LABEL } from "./score";

export interface Explanation { explanation: string; explanationSource: "llm" | "template" }

const schema = z.object({ explanation: z.string().min(1).max(600) });

/** Two-sentence explanation from the factors only. LLM with 8 s timeout; template fallback. */
export async function explainScore(score: number, tier: Tier, factors: Factor[], dataSource: string): Promise<Explanation> {
  const template = templateExplanation(score, tier, factors, dataSource);
  const prompt = [
    "Explain a chit-fund member's risk score to them in AT MOST two short sentences.",
    "Use ONLY the factors listed; do not invent history, do not mention credit bureaus, do not give advice.",
    `Score: ${score}/100 → tier ${TIER_LABEL[tier]}. Data source: ${dataSource}.`,
    "Factors:",
    ...factors.map((f) => `- ${f.name}: ${f.value} (${f.effect})`),
    'Reply as JSON: {"explanation": "..."}',
  ].join("\n");
  const out = await chatJSON(prompt, schema, { timeoutMs: 8000 });
  if (!out) return { explanation: template, explanationSource: "template" };
  const trimmed = limitSentences(out.explanation, 2);
  return { explanation: trimmed || template, explanationSource: "llm" };
}

export function templateExplanation(score: number, tier: Tier, factors: Factor[], dataSource: string): string {
  const cold = factors.some((f) => f.effect.includes("cold start"));
  const src = dataSource === "SYNTHETIC" ? " (synthetic demo history)" : "";
  if (cold) return `No payment history yet${src}, so the score defaults to 60 and the tier is Medium. Complete a circle on time to move to Low risk.`;
  const parts = factors.filter((f) => f.name !== "Base").map((f) => `${f.name.toLowerCase()} ${f.value} (${f.effect})`);
  return `Score ${score}/100 → ${TIER_LABEL[tier]} risk${src}: ${parts.join(", ")}. Collateral is priced from this tier.`;
}

function limitSentences(s: string, max: number): string {
  const sentences = s.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(\s|$)/g);
  if (!sentences) return s.trim();
  return sentences.slice(0, max).join("").trim();
}
