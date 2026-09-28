"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { AgentLog } from "@/lib/types";

export function useAgentLogs(circleId: number, enabled = true) {
  return usePolling<AgentLog[]>(
    async () => {
      if (!enabled) return [];
      const r = await api.agentLogs(circleId, 10);
      return r.logs;
    },
    POLL_API_MS * 2,
    [circleId, enabled]
  );
}
