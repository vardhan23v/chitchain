import { Router } from "express";
import { parseEther } from "ethers";
import { z } from "zod";
import { demoWallet, getCircle, getCircleCount, isConfigured } from "../chain";
import { deactivateMandate, listAgentLogs, upsertMandate } from "../db";
import { AGENT_ONLY_DEMO, decideForMandate } from "../agent/bidder";
import { agentLogToApi, mandateToApi } from "./feedShape";
import { ApiError, optionalInt, parseAddress, wrap } from "./util";

export const agent = Router();

const mandateBody = z.object({
  circleId: z.coerce.number().int().positive(),
  member: z.string(),
  goal: z.string().trim().min(3).max(500),
  maxDiscountPct: z.coerce.number().min(0).max(50).nullable().optional(),
  desiredPayout: z.string().trim().regex(/^\d+(\.\d+)?$/, "MST decimal string, e.g. \"0.45\"").nullable().optional(),
  urgency: z.enum(["low", "medium", "high"]).nullable().optional(),
  riskTolerance: z.enum(["low", "medium", "high"]).nullable().optional(),
});

/** POST /agent/mandate — store the goal and run one decision now if the circle is Active. */
agent.post("/agent/mandate", wrap(async (req, res) => {
  const parsed = mandateBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "BAD_BODY");
  const { circleId, goal } = parsed.data;
  const member = parseAddress(parsed.data.member);
  if (!demoWallet(member)) throw new ApiError(400, AGENT_ONLY_DEMO, "NOT_DEMO_WALLET"); // custodial demo wallet only
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (circleId > (await getCircleCount())) throw new ApiError(404, "circle not found", "NOT_FOUND");
  let desiredPayout: bigint | null = null;
  if (parsed.data.desiredPayout) {
    try { desiredPayout = parseEther(parsed.data.desiredPayout); } catch { throw new ApiError(400, "desiredPayout: invalid MST amount", "BAD_BODY"); }
    if (desiredPayout <= 0n) throw new ApiError(400, "desiredPayout must be > 0", "BAD_BODY");
  }
  const row = await upsertMandate(circleId, member, {
    goal, maxDiscountPct: parsed.data.maxDiscountPct ?? null, desiredPayout,
    urgency: parsed.data.urgency ?? null, riskTolerance: parsed.data.riskTolerance ?? null,
  });
  const circle = await getCircle(circleId);
  const decision = circle.status === 1 ? await decideForMandate(row, true) : null;
  res.json({ mandate: mandateToApi(row), decision: decision ? agentLogToApi(decision) : null });
}));

agent.delete("/agent/mandate", wrap(async (req, res) => {
  const circleId = optionalInt(req.query.circleId);
  if (circleId === undefined) throw new ApiError(400, "circleId required", "BAD_QUERY");
  const member = parseAddress(String(req.query.member ?? ""));
  res.json({ ok: await deactivateMandate(circleId, member) });
}));

agent.get("/agent/logs", wrap(async (req, res) => {
  const circleId = optionalInt(req.query.circleId);
  const limit = optionalInt(req.query.limit);
  res.json({ logs: (await listAgentLogs({ circleId, limit })).map(agentLogToApi) });
}));
