"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import type { FeedEvent } from "@/lib/types";

const MAX_ITEMS = 200;

/** Incremental feed polling (since = last seen id). Backend only — no chain fallback for the feed. */
export function useFeed(circleId?: number, limit = 50) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [down, setDown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<FeedEvent | null>(null);
  const lastId = useRef<number>(0);
  const inflight = useRef(false);

  const tick = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await api.feed({ circleId, since: lastId.current || undefined, limit });
      const fresh = res.events.filter((e) => e.id > lastId.current);
      if (fresh.length) {
        lastId.current = fresh[fresh.length - 1].id;
        setEvents((prev) => [...fresh.slice().reverse(), ...prev].slice(0, MAX_ITEMS));
        setLatest(fresh[fresh.length - 1]);
      }
      setDown(false);
    } catch {
      setDown(true);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, [circleId, limit]);

  useEffect(() => {
    lastId.current = 0;
    setEvents([]);
    setLoading(true);
    void tick();
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void tick();
    }, POLL_API_MS);
    return () => clearInterval(id);
  }, [tick]);

  return { events, down, loading, latest, refetch: tick };
}
