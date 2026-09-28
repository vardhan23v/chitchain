"use client";

import { useRef } from "react";
import { api, isUnreachable } from "@/lib/api";
import { readRoundHistory } from "@/lib/contract";
import { HAS_CONTRACT, POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { DataSource, RoundHistoryRow } from "@/lib/types";

export interface RoundHistoryData { rounds: RoundHistoryRow[]; source: DataSource }

/** GET /circles/:id/rounds, falling back to `getRoundHistory` on the contract (no tx hashes). */
export function useRoundHistory(id: number, enabled = true) {
  const source = useRef<DataSource>("api");
  return usePolling<RoundHistoryData>(
    async () => {
      if (!enabled) return { rounds: [], source: source.current };
      try {
        const r = await api.rounds(id);
        source.current = "api";
        return { rounds: r.rounds, source: "api" };
      } catch (e) {
        if (!isUnreachable(e) || !HAS_CONTRACT) throw e;
        const rounds = await readRoundHistory(id);
        source.current = "chain";
        return { rounds, source: "chain" };
      }
    },
    POLL_API_MS * 4,
    [id, enabled]
  );
}
