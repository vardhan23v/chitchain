/**
 * v4 autonomous AI bidding: /ai/bidding/*. Creating an agent needs the circle organizer (or ADMIN) and a custodial
 * demo wallet member; pause/resume/stop/evaluate need the owner or ADMIN; status/activity/stream are public.
 * There is deliberately NO /execute route: transactions are only reachable through the loop after the Risk Guard.
 */
import { Router } from "express";
import { parseEther } from "ethers";
import { z } from "zod";
import { demoWallet, getCircle, getCircleCount, isConfigured } from "../chain";
import { bidAgentsOf, createBidAgent, getBidAgent, liveBidAgent, listAgentEvents, type BidAgentApi } from "../db";
import { audit } from "../auth/audit";
import { assertOrganizer, requireAuth } from "../auth/middleware";
import { evaluateNow, forgetAgent, isRunning } from "../ai/loop";
import { buildSnapshot } from "../ai/snapshot";
import { attachStream, recordEvent, setAgentStatus } from "../ai/sse";
import { decisionToApi } from "../ai/types";
import { ApiError, optionalInt, parseAddress, wrap } from "./util";

export const aiBidding = Router();

const mstAmount = z.string().trim().regex(/^\d+(\.\d{1,18})?$/, "MST decimal string, e.g. \"1.0\"");
const startBody = z.object({
  circleId: z.coerce.number().int().positive(),
  member: z.string(),
  goal: z.string().trim().min(3).max(500),
  desiredPayout: mstAmount.nullable().optional(),
  maxDiscount: mstAmount,
  maxDiscountPct: z.coerce.number().min(0).max(50),
  urgency: z.enum(["low", "medium", "high"]),
  riskTolerance: z.enum(["low", "medium", "high"]),
  durationSec: z.coerce.number().int().min(60).max(30 * 86_400).nullable().optional(),
  autonomous: z.boolean(),
  demoMode: z.boolean().optional(),
});
const idBody = z.object({ agentId: z.string().min(1).max(64), autonomous: z.boolean().optional() });

function bad(issues: z.ZodIssue[]): never {
  throw new ApiError(400, issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "BAD_BODY");
}
async function loadAgent(id: string): Promise<BidAgentApi> {
  const a = await getBidAgent(id);
  if (!a) throw new ApiError(404, "agent not found", "NOT_FOUND");
  return a;
}
/** Owner of the agent or ADMIN. */
function assertOwner(req: Parameters<typeof audit>[0], agent: BidAgentApi): void {
  if (!req.auth) throw new ApiError(401, "sign in required", "NO_AUTH");
  if (req.auth.role === "ADMIN" || req.auth.address === agent.userWallet) return;
  audit(req, "auth.denied", `agent:${agent.id}`, "denied", { meta: { need: "owner" } });
  throw new ApiError(403, "not your agent", "FORBIDDEN");
}

aiBidding.post("/ai/bidding/start", requireAuth(), wrap(async (req, res) => {
  const parsed = startBody.safeParse(req.body);
  if (!parsed.success) bad(parsed.error.issues);
  const b = parsed.data;
  const member = parseAddress(b.member);
  if (!demoWallet(member)) throw new ApiError(400, "agent only available for custodial demo wallets", "NOT_DEMO_WALLET");
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (b.circleId > (await getCircleCount())) throw new ApiError(404, "circle not found", "NOT_FOUND");
  await assertOrganizer(req, b.circleId);
  const maxDiscount = parseEther(b.maxDiscount);
  if (maxDiscount <= 0n) throw new ApiError(400, "maxDiscount must be > 0", "BAD_BODY");
  let desiredPayout: bigint | null = null;
  if (b.desiredPayout) {
    desiredPayout = parseEther(b.desiredPayout);
    if (desiredPayout <= 0n) throw new ApiError(400, "desiredPayout must be > 0", "BAD_BODY");
  }
  if (await liveBidAgent(b.circleId, member)) throw new ApiError(409, "an active or paused agent already exists for this circle and member", "AGENT_EXISTS");
  const circle = await getCircle(b.circleId);
  const agent = await createBidAgent({
    userWallet: req.auth!.address, circleId: b.circleId, member, goal: b.goal, desiredPayout, maxDiscount, maxDiscountPct: b.maxDiscountPct,
    urgency: b.urgency, riskTolerance: b.riskTolerance, durationSec: b.durationSec ?? null, autonomous: b.autonomous, demoMode: b.demoMode ?? false,
  });
  await recordEvent(agent.id, "INFO", "Agent activated", b.autonomous ? "Autonomous bidding is on within your limits." : "The agent will ask for approval before any bid.", {
    round: circle.round, autonomous: b.autonomous, demoMode: b.demoMode ?? false, maxDiscount: maxDiscount.toString(), maxDiscountPct: b.maxDiscountPct, expiresAt: agent.expiresAt,
  });
  audit(req, "ai.agent.start", `circle:${b.circleId}`, "ok", { meta: { agentId: agent.id, member: member.toLowerCase(), autonomous: b.autonomous, demoMode: b.demoMode ?? false } });
  res.json({ agent });
}));

aiBidding.post("/ai/bidding/pause", requireAuth(), wrap(async (req, res) => {
  const parsed = idBody.safeParse(req.body);
  if (!parsed.success) bad(parsed.error.issues);
  const agent = await loadAgent(parsed.data.agentId);
  assertOwner(req, agent);
  if (agent.status !== "ACTIVE") throw new ApiError(409, `agent is ${agent.status}`, "BAD_STATE");
  await recordEvent(agent.id, "PAUSED", "Agent paused", "Paused by user");
  const updated = await setAgentStatus(agent.id, { status: "PAUSED", statusReason: "Paused by user" });
  audit(req, "ai.agent.pause", `agent:${agent.id}`, "ok");
  res.json({ agent: updated });
}));

aiBidding.post("/ai/bidding/resume", requireAuth(), wrap(async (req, res) => {
  const parsed = idBody.safeParse(req.body);
  if (!parsed.success) bad(parsed.error.issues);
  const agent = await loadAgent(parsed.data.agentId);
  assertOwner(req, agent);
  if (agent.status !== "PAUSED") throw new ApiError(409, `agent is ${agent.status}`, "BAD_STATE");
  const grant = parsed.data.autonomous === true && !agent.autonomous;
  await recordEvent(agent.id, "INFO", "Agent resumed", grant ? "Autonomous bidding approved; the agent may now place bids within your limits." : "Resumed by user", { autonomous: grant || agent.autonomous });
  const updated = await setAgentStatus(agent.id, { status: "ACTIVE", statusReason: null, failures: 0, ...(parsed.data.autonomous === true ? { autonomous: true } : {}) });
  audit(req, "ai.agent.resume", `agent:${agent.id}`, "ok", { meta: { autonomous: updated.autonomous } });
  res.json({ agent: updated });
}));

aiBidding.post("/ai/bidding/stop", requireAuth(), wrap(async (req, res) => {
  const parsed = idBody.safeParse(req.body);
  if (!parsed.success) bad(parsed.error.issues);
  const agent = await loadAgent(parsed.data.agentId);
  assertOwner(req, agent);
  if (agent.status === "STOPPED" || agent.status === "DONE") { res.json({ agent }); return; }
  await recordEvent(agent.id, "STOPPED", "Agent stopped", "Stopped by user");
  const updated = await setAgentStatus(agent.id, { status: "STOPPED", statusReason: "Stopped by user" });
  forgetAgent(agent.id);
  audit(req, "ai.agent.stop", `agent:${agent.id}`, "ok");
  res.json({ agent: updated });
}));

aiBidding.get("/ai/bidding/status/:agentId", wrap(async (req, res) => {
  const agent = await loadAgent(req.params.agentId);
  let auction = null;
  try { auction = (await buildSnapshot(agent.circleId)).snapshot; } catch { /* rpc down or contract unset: agent still returned */ }
  res.json({ agent, auction });
}));

aiBidding.get("/ai/bidding/activity/:agentId", wrap(async (req, res) => {
  const agent = await loadAgent(req.params.agentId);
  const events = await listAgentEvents(agent.id, { since: optionalInt(req.query.since), limit: optionalInt(req.query.limit) ?? 100 });
  res.json({ events });
}));

aiBidding.get("/ai/bidding/stream/:agentId", wrap(async (req, res) => {
  const agent = await loadAgent(req.params.agentId);
  const events = await listAgentEvents(agent.id, { since: optionalInt(req.query.since), limit: 50 });
  attachStream(req, res, agent.id, { agent, events });
}));

aiBidding.get("/ai/bidding/mine", requireAuth(), wrap(async (req, res) => {
  res.json({ agents: await bidAgentsOf(req.auth!.address, optionalInt(req.query.circleId)) });
}));

aiBidding.post("/ai/bidding/evaluate", requireAuth(), wrap(async (req, res) => {
  const parsed = idBody.safeParse(req.body);
  if (!parsed.success) bad(parsed.error.issues);
  const agent = await loadAgent(parsed.data.agentId);
  assertOwner(req, agent);
  if (agent.status === "STOPPED" || agent.status === "DONE") throw new ApiError(409, `agent is ${agent.status}`, "BAD_STATE");
  if (isRunning(agent.id)) throw new ApiError(409, "an evaluation is already running", "AGENT_BUSY");
  const out = await evaluateNow(agent.id);
  audit(req, "ai.agent.evaluate", `agent:${agent.id}`, "ok", { meta: { decision: out?.decision.decision ?? null } });
  res.json({ decision: out ? decisionToApi(out.decision, out.bundle.round.expectedPot) : null, agent: await getBidAgent(agent.id) });
}));
