"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { CircleAnalytics } from "@/lib/types";

/** GET /organizer/circles/:id/analytics */
export function useAnalytics(id: number) {
  return usePolling<CircleAnalytics>(() => api.organizerAnalytics(id), POLL_API_MS * 2, [id]);
}
