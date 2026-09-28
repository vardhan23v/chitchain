"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { FeedEvent } from "@/lib/types";

/** GET /members/:addr/activity — every indexed event involving the address, newest first. Backend only. */
export function useActivity(addr: string | null, limit = 100) {
  return usePolling<FeedEvent[]>(
    async () => {
      if (!addr) return [];
      const r = await api.activity(addr, limit);
      return r.events;
    },
    POLL_API_MS * 4,
    [addr, limit]
  );
}
