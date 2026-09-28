"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { DefaultRecord } from "@/lib/types";

/** GET /circles/:id/defaults — newest first. Backend only. */
export function useDefaults(id: number, enabled = true) {
  return usePolling<DefaultRecord[]>(
    async () => {
      if (!enabled) return [];
      const r = await api.defaults(id);
      return r.defaults;
    },
    POLL_API_MS * 4,
    [id, enabled]
  );
}
