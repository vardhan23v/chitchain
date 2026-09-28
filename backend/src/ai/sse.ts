/**
 * v4 activity publishing + SSE stream.
 *  - recordEvent / setAgentStatus write to Postgres and fan out on the in-process bus.
 *  - attachStream(req, res, agentId) serves GET /ai/bidding/stream/:agentId as text/event-stream
 *    (`event: agent` on status change, `event: activity` per AgentEvent, `: ping` every 15 s).
 */
import type { Request, Response } from "express";
import { bus } from "../bus";
import { insertAgentEvent, updateBidAgent, type AgentEventApi, type AgentEventKind, type BidAgentApi, type BidAgentPatch } from "../db/ai";

const PING_MS = 15_000;

export async function recordEvent(agentId: string, kind: AgentEventKind, text: string, reason: string | null = null, data: Record<string, unknown> | null = null): Promise<AgentEventApi> {
  const ev = await insertAgentEvent(agentId, kind, text, reason, data);
  bus.emit("agentEvent", agentId, ev);
  return ev;
}
export async function setAgentStatus(agentId: string, patch: BidAgentPatch): Promise<BidAgentApi> {
  const agent = await updateBidAgent(agentId, patch);
  bus.emit("agentStatus", agentId, agent);
  return agent;
}

function write(res: Response, event: string, payload: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

/** Streams one agent's status + activity until the client disconnects. Listeners are removed on close. */
export function attachStream(req: Request, res: Response, agentId: string, initial: { agent: BidAgentApi; events: AgentEventApi[] }): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(`retry: 3000\n: connected\n\n`);
  write(res, "agent", { agent: initial.agent });
  for (const event of initial.events) write(res, "activity", { event });

  const onEvent = (id: string, event: AgentEventApi): void => { if (id === agentId) write(res, "activity", { event }); };
  const onStatus = (id: string, agent: BidAgentApi): void => { if (id === agentId) write(res, "agent", { agent }); };
  bus.on("agentEvent", onEvent);
  bus.on("agentStatus", onStatus);
  const ping = setInterval(() => { res.write(`: ping\n\n`); }, PING_MS);

  const cleanup = (): void => {
    clearInterval(ping);
    bus.off("agentEvent", onEvent);
    bus.off("agentStatus", onStatus);
  };
  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup);
}
