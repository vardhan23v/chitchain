/**
 * HTTP client for the Python CrewAI decision service (agent/). The crew only PROPOSES: the result is validated
 * here, clamped by fallback.clampDecision and re-checked by the Risk Guard before anything is sent on-chain.
 */
import { parseEther } from "ethers";
import { z } from "zod";
import { config } from "../config";
import type { AuctionSnapshot, Decision, StrategyBrief } from "./types";
import type { AgentEventApi } from "../db/ai";

const decisionSchema = z.object({
  decision: z.enum(["WAIT", "BID", "STOP"]),
  discount_mst: z.number().nonnegative().nullable().optional(),
  reason_code: z.string().min(1).max(64).default("CREW"),
  reason: z.string().min(1).max(600),
  confidence: z.number().min(0).max(1).default(0.5),
  analyst: z.record(z.unknown()).nullable().optional(),
});

export class CrewUnavailable extends Error {
  constructor(message: string, public readonly status: number | null = null) { super(message); }
}
export function crewConfigured(): boolean { return config.AI_AGENT_URL !== ""; }

export interface CrewPayload { strategy: StrategyBrief; auction: AuctionSnapshot; history: Pick<AgentEventApi, "ts" | "kind" | "text" | "reason" | "data">[] }

/** POST ${AI_AGENT_URL}/evaluate with a hard timeout. Throws CrewUnavailable on any transport / schema failure. */
export async function evaluateWithCrew(payload: CrewPayload, timeoutMs = 20_000): Promise<Decision> {
  if (!crewConfigured()) throw new CrewUnavailable("AI_AGENT_URL not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${config.AI_AGENT_URL}/evaluate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
  } catch (e) {
    throw new CrewUnavailable(ctrl.signal.aborted ? `crew timeout after ${timeoutMs} ms` : `crew unreachable: ${e instanceof Error ? e.message : String(e)}`);
  } finally { clearTimeout(timer); }
  const text = await res.text();
  if (!res.ok) throw new CrewUnavailable(`crew responded ${res.status}: ${text.slice(0, 200)}`, res.status);
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new CrewUnavailable("crew returned non-JSON"); }
  const parsed = decisionSchema.safeParse(json);
  if (!parsed.success) throw new CrewUnavailable(`crew decision failed validation: ${parsed.error.issues.map((i) => i.path.join(".")).join(",")}`);
  const d = parsed.data;
  let discount: bigint | null = null;
  if (d.decision === "BID" && d.discount_mst !== null && d.discount_mst !== undefined) {
    try { discount = parseEther(d.discount_mst.toFixed(18)); } catch { discount = null; }
  }
  return { decision: d.decision, discount, reasonCode: d.reason_code, reason: d.reason, confidence: d.confidence, source: "crew", analyst: d.analyst ?? null };
}
