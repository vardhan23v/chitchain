"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RiskResult } from "@/lib/types";

export function useRisk(addr: string) {
  const [data, setData] = useState<RiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.risk(addr));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Risk assessment is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [addr]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const assess = useCallback(async () => {
    setAssessing(true);
    try {
      const r = await api.assess(addr);
      setData(r);
      setLastTx(r.txHash);
      return r;
    } finally {
      setAssessing(false);
    }
  }, [addr]);

  return { data, error, loading, assess, assessing, lastTx, refetch: load };
}
