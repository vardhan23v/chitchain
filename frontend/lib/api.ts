import { API_URL } from "@/lib/chain";
import type { AgentLog, CircleRoom, CircleSummary, DemoState, FeedEvent, Mandate, RiskResult, Stats } from "@/lib/types";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) throw new ApiError(body?.error ?? `HTTP ${res.status}`, res.status, body?.code);
    return body as T;
  } finally {
    clearTimeout(t);
  }
}

const post = <T>(path: string, body?: unknown, timeoutMs?: number) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, timeoutMs);

export const api = {
  health: () => request<{ ok: boolean; chainId: number; latestBlock: number; lastIndexedBlock: number; contract: string; keeper: string; explorer: string }>("/health", undefined, 4000),
  stats: () => request<Stats>("/stats"),
  circles: () => request<{ circles: CircleSummary[] }>("/circles"),
  circle: (id: number) => request<CircleRoom>(`/circles/${id}`),
  feed: (p: { circleId?: number; since?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (p.circleId !== undefined) q.set("circleId", String(p.circleId));
    if (p.since !== undefined) q.set("since", String(p.since));
    if (p.limit !== undefined) q.set("limit", String(p.limit));
    return request<{ events: FeedEvent[] }>(`/feed?${q.toString()}`);
  },
  risk: (addr: string) => request<RiskResult>(`/members/${addr}/risk`),
  assess: (addr: string) => post<RiskResult & { txHash: string }>(`/members/${addr}/assess`, undefined, 60_000),
  mandate: (body: { circleId: number; member: string; goal: string; maxDiscountPct?: number }) =>
    post<{ mandate: Mandate; decision: AgentLog | null }>("/agent/mandate", body, 60_000),
  deleteMandate: (circleId: number, member: string) =>
    request<{ ok: boolean }>(`/agent/mandate?circleId=${circleId}&member=${member}`, { method: "DELETE" }),
  agentLogs: (circleId: number, limit = 20) => request<{ logs: AgentLog[] }>(`/agent/logs?circleId=${circleId}&limit=${limit}`),
  demoState: () => request<DemoState>("/demo/state"),
  demoFund: () => post<{ txHashes: string[] }>("/demo/fund", undefined, 120_000),
  demoAssessAll: () => post<{ results: (RiskResult & { txHash: string })[] }>("/demo/assess-all", undefined, 120_000),
  demoSkip: (address: string, skip: boolean) => post<{ ok: boolean }>("/demo/skip", { address, skip }),
  demoNewCircle: (body?: { roundDuration?: number; contribution?: string }) =>
    post<{ circleId: number; txHash: string }>("/demo/new-circle", body ?? { roundDuration: 30 }, 180_000),
  demoWithdraw: (address: string, circleId: number) => post<{ txHash: string }>("/demo/withdraw", { address, circleId }, 60_000),
  settle: (id: number) => post<{ txHash: string }>(`/circles/${id}/settle`, undefined, 60_000),
};

/** True when the backend itself is down (network error, timeout, bad gateway) rather than answering with an app error. */
export function isUnreachable(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 502 || e.status === 503 || e.status === 504;
  return true; // network error / abort / JSON parse
}
