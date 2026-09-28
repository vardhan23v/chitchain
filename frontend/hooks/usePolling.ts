"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** True after RPC_SLOW_MS without a successful response. */
  slow: boolean;
  refetch: () => Promise<void>;
  lastOk: number | null;
}

/** Generic interval poller with in-flight guard, visibility pause and slow-network detection. */
export function usePolling<T>(fn: () => Promise<T>, intervalMs: number, deps: unknown[], slowAfterMs = 10_000): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [lastOk, setLastOk] = useState<number | null>(null);
  const inflight = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const startedAt = useRef(Date.now());

  const tick = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
      setLastOk(Date.now());
      setSlow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();
    setLoading(true);
    void tick();
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void tick();
    }, intervalMs);
    const slowId = setInterval(() => {
      const ref = lastOk ?? startedAt.current;
      setSlow(Date.now() - ref > slowAfterMs);
    }, 1000);
    return () => {
      clearInterval(id);
      clearInterval(slowId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, error, loading, slow, refetch: tick, lastOk };
}
