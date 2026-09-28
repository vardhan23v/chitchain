"use client";

import { useRef } from "react";
import { api, isUnreachable } from "@/lib/api";
import { readCircleList } from "@/lib/contract";
import { HAS_CONTRACT, POLL_API_MS, POLL_CHAIN_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { CircleSummary, DataSource, Stats } from "@/lib/types";

export interface CirclesData { circles: CircleSummary[]; stats: Stats | null; source: DataSource }

/** Home page data: backend first, contract views as fallback. */
export function useCircles() {
  const source = useRef<DataSource>("api");
  const state = usePolling<CirclesData>(
    async () => {
      try {
        const [c, s] = await Promise.all([api.circles(), api.stats().catch(() => null)]);
        source.current = "api";
        return { circles: c.circles, stats: s, source: "api" };
      } catch (e) {
        if (!isUnreachable(e) || !HAS_CONTRACT) throw e;
        const circles = await readCircleList();
        source.current = "chain";
        return { circles, stats: null, source: "chain" };
      }
    },
    source.current === "api" ? POLL_API_MS : POLL_CHAIN_MS,
    []
  );
  return state;
}
