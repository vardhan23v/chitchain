"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import { useAuth } from "@/hooks/useAuth";
import type { OrganizerCircle } from "@/lib/types";

/** GET /organizer/circles (ADMIN sees all). Polls while signed in. */
export function useOrganizerCircles() {
  const auth = useAuth();
  const on = auth.status === "authenticated";
  return usePolling<OrganizerCircle[]>(() => (on ? api.organizerCircles().then((r) => r.circles) : Promise.resolve([])), POLL_API_MS * 2, [on]);
}
