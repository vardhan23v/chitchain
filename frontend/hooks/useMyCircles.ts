"use client";

import { useRef } from "react";
import { api, isUnreachable } from "@/lib/api";
import { readMyCircles } from "@/lib/contract";
import { HAS_CONTRACT, POLL_API_MS, POLL_CHAIN_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { DataSource, MyCircle } from "@/lib/types";

export interface MyCirclesData { circles: MyCircle[]; source: DataSource }

/** GET /members/:addr/circles, falling back to scanning the contract's circles for membership. */
export function useMyCircles(addr: string | null) {
  const source = useRef<DataSource>("api");
  return usePolling<MyCirclesData>(
    async () => {
      if (!addr) return { circles: [], source: "api" };
      try {
        const r = await api.myCircles(addr);
        source.current = "api";
        return { circles: r.circles, source: "api" };
      } catch (e) {
        if (!isUnreachable(e) || !HAS_CONTRACT) throw e;
        const circles = await readMyCircles(addr);
        source.current = "chain";
        return { circles, source: "chain" };
      }
    },
    source.current === "api" ? POLL_API_MS * 2 : POLL_CHAIN_MS * 2,
    [addr]
  );
}
