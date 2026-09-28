"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, isUnreachable, type AiStartBody } from "@/lib/api";
import { API_URL } from "@/lib/chain";
import { sameAddr } from "@/lib/format";
import type { AgentEvent, AuctionSnapshot, BidAgent } from "@/lib/types";

/** Activity rows kept in memory (newest first on screen). */
export const MAX_EVENTS = 200;
const POLL_ACTIVITY_MS = 3000;
const POLL_STATUS_FALLBACK_MS = 4000;
const POLL_STATUS_LIVE_MS = 10_000;
const POLL_AUCTION_MS = 6000;

export type Transport = "sse" | "polling" | "idle";

export interface BidAgentState {
  /** The agent for this circle + member (ACTIVE/PAUSED first, else the most recent one). */
  agent: BidAgent | null;
  /** Ascending by id, capped at MAX_EVENTS. */
  events: AgentEvent[];
  auction: AuctionSnapshot | null;
  loading: boolean;
  /** Set when the AI bidding service could not be reached (network, 404 route, 5xx). */
  error: string | null;
  /** How activity arrives right now. */
  transport: Transport;
  busy: boolean;
  actions: {
    start: (body: AiStartBody) => Promise<BidAgent>;
    pause: () => Promise<void>;
    resume: (autonomous?: boolean) => Promise<void>;
    stop: () => Promise<void>;
    evaluate: () => Promise<void>;
    /** Forget a STOPPED/DONE agent locally so a new strategy can be drafted. */
    reset: () => void;
    refresh: () => Promise<void>;
  };
}

export const UNAVAILABLE = "The AI agent service is temporarily unavailable.";

const isLive = (a: BidAgent) => a.status === "ACTIVE" || a.status === "PAUSED";

function pickAgent(agents: BidAgent[], member: string | null): BidAgent | null {
  if (!member) return null;
  const mine = agents.filter((a) => sameAddr(a.member, member));
  const live = mine.find(isLive);
  if (live) return live;
  return mine.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

function mergeEvents(prev: AgentEvent[], incoming: AgentEvent[]): AgentEvent[] {
  if (incoming.length === 0) return prev;
  const map = new Map<number, AgentEvent>();
  for (const e of prev) map.set(e.id, e);
  for (const e of incoming) map.set(e.id, e);
  const all = Array.from(map.values()).sort((a, b) => a.id - b.id);
  return all.length > MAX_EVENTS ? all.slice(all.length - MAX_EVENTS) : all;
}

/** Service-level failure (route missing, gateway down, network) rather than a user-facing validation error. */
export function isServiceDown(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 404 || e.status >= 500;
  return isUnreachable(e);
}

/**
 * Autonomous bidding agent for one circle + custodial member.
 * Loads `aiMine`, then subscribes to `/ai/bidding/stream/:id` (SSE). If the stream errors the hook
 * falls back to polling: activity since the last event id every 3 s and status every 4 s.
 */
export function useBidAgent(circleId: number, member: string | null, enabled: boolean): BidAgentState {
  const [agent, setAgent] = useState<BidAgent | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [auction, setAuction] = useState<AuctionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transport, setTransport] = useState<Transport>("idle");
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const lastId = useRef(0);
  const agentId = agent && agent.id !== dismissed ? agent.id : null;

  const fail = useCallback((e: unknown) => {
    if (isServiceDown(e)) setError(UNAVAILABLE);
    else setError(e instanceof Error ? e.message : String(e));
  }, []);

  /* ── initial load: my agents for this circle ── */
  const loadMine = useCallback(async () => {
    if (!enabled || !member) {
      setAgent(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api.aiMine(circleId);
      const next = pickAgent(r.agents ?? [], member);
      setAgent((prev) => (prev && next && prev.id === next.id ? { ...prev, ...next } : next));
      setError(null);
    } catch (e) {
      // 401 just means the session is gone; the section gate handles that.
      if (e instanceof ApiError && e.status === 401) setAgent(null);
      else fail(e);
    } finally {
      setLoading(false);
    }
  }, [circleId, member, enabled, fail]);

  useEffect(() => {
    setLoading(true);
    setEvents([]);
    setDismissed(null);
    lastId.current = 0;
    void loadMine();
  }, [loadMine]);

  /* ── auction snapshot while no agent is attached (the form needs the pot and the cap) ── */
  useEffect(() => {
    if (!enabled || agentId) return;
    let stop = false;
    const tick = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const a = await api.auction(circleId);
        if (!stop) setAuction(a);
      } catch {
        /* the room already shows the pot; leave the last snapshot in place */
      }
    };
    void tick();
    const id = setInterval(tick, POLL_AUCTION_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [circleId, enabled, agentId]);

  /* ── status + activity for the attached agent: SSE first, polling on error ── */
  const pullStatus = useCallback(async (id: string) => {
    const r = await api.aiStatus(id);
    setAgent((prev) => (prev && prev.id !== id ? prev : r.agent));
    if (r.auction) setAuction(r.auction);
    setError(null);
  }, []);

  const pullActivity = useCallback(async (id: string) => {
    const r = await api.aiActivity(id, lastId.current || undefined);
    const rows = r.events ?? [];
    if (rows.length) {
      lastId.current = Math.max(lastId.current, ...rows.map((e) => e.id));
      setEvents((prev) => mergeEvents(prev, rows));
    }
    setError(null);
  }, []);

  useEffect(() => {
    if (!enabled || !agentId) {
      setTransport("idle");
      return;
    }
    const id = agentId;
    let stopped = false;
    let es: EventSource | null = null;
    let activityTimer: ReturnType<typeof setInterval> | null = null;
    let statusTimer: ReturnType<typeof setInterval> | null = null;

    const clearTimers = () => {
      if (activityTimer) clearInterval(activityTimer);
      if (statusTimer) clearInterval(statusTimer);
      activityTimer = statusTimer = null;
    };

    const startPolling = () => {
      if (stopped || activityTimer) return;
      setTransport("polling");
      const guard = (fn: () => Promise<void>) => () => {
        if (typeof document !== "undefined" && document.hidden) return;
        fn().catch(fail);
      };
      activityTimer = setInterval(guard(() => pullActivity(id)), POLL_ACTIVITY_MS);
      statusTimer = setInterval(guard(() => pullStatus(id)), POLL_STATUS_FALLBACK_MS);
    };

    const startStream = () => {
      if (stopped || typeof EventSource === "undefined") {
        startPolling();
        return;
      }
      try {
        es = new EventSource(`${API_URL}/ai/bidding/stream/${id}${lastId.current ? `?since=${lastId.current}` : ""}`);
      } catch {
        startPolling();
        return;
      }
      es.addEventListener("open", () => {
        if (stopped) return;
        clearTimers();
        setTransport("sse");
        // Catch up on anything that happened between the first load and the open stream.
        pullActivity(id).catch(() => {});
        // The stream only announces status changes; keep the auction clock fresh at a slow cadence.
        statusTimer = setInterval(() => {
          if (typeof document !== "undefined" && document.hidden) return;
          pullStatus(id).catch(() => {});
        }, POLL_STATUS_LIVE_MS);
      });
      es.addEventListener("agent", (ev) => {
        try {
          const body = JSON.parse((ev as MessageEvent).data) as { agent?: BidAgent };
          if (body.agent) setAgent((prev) => (prev && prev.id !== id ? prev : body.agent!));
        } catch {
          /* ignore malformed frames */
        }
      });
      es.addEventListener("activity", (ev) => {
        try {
          const body = JSON.parse((ev as MessageEvent).data) as { event?: AgentEvent };
          if (body.event) {
            lastId.current = Math.max(lastId.current, body.event.id);
            setEvents((prev) => mergeEvents(prev, [body.event!]));
          }
        } catch {
          /* ignore malformed frames */
        }
      });
      es.onerror = () => {
        // EventSource retries on its own; while it is down we poll, and stop polling once it reopens.
        if (stopped) return;
        if (es && es.readyState === EventSource.CLOSED) {
          es.close();
          es = null;
        }
        clearTimers();
        startPolling();
      };
    };

    // First paint: status + full activity, then attach the stream.
    Promise.all([pullStatus(id), pullActivity(id)])
      .catch(fail)
      .finally(() => {
        if (!stopped) startStream();
      });

    return () => {
      stopped = true;
      clearTimers();
      es?.close();
    };
  }, [agentId, enabled, pullStatus, pullActivity, fail]);

  /* ── actions ── */
  const run = useCallback(
    async (fn: () => Promise<BidAgent | void>) => {
      setBusy(true);
      try {
        const a = await fn();
        if (a) setAgent(a);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const actions = useMemo<BidAgentState["actions"]>(
    () => ({
      start: async (body) => {
        setBusy(true);
        try {
          const r = await api.aiStart(body);
          setDismissed(null);
          setEvents([]);
          lastId.current = 0;
          setAgent(r.agent);
          setError(null);
          return r.agent;
        } finally {
          setBusy(false);
        }
      },
      pause: () => run(async () => (agentId ? (await api.aiPause(agentId)).agent : undefined)),
      resume: (autonomous) => run(async () => (agentId ? (await api.aiResume(agentId, autonomous)).agent : undefined)),
      stop: () => run(async () => (agentId ? (await api.aiStop(agentId)).agent : undefined)),
      evaluate: () =>
        run(async () => {
          if (!agentId) return;
          await api.aiEvaluate(agentId);
          await Promise.all([pullStatus(agentId), pullActivity(agentId)]);
        }),
      reset: () => {
        if (agent) setDismissed(agent.id);
        setEvents([]);
        lastId.current = 0;
      },
      refresh: async () => {
        await loadMine();
        if (agentId) await Promise.all([pullStatus(agentId), pullActivity(agentId)]).catch(fail);
      },
    }),
    [agentId, agent, run, loadMine, pullStatus, pullActivity, fail]
  );

  return { agent: agentId ? agent : null, events, auction, loading, error, transport, busy, actions };
}
