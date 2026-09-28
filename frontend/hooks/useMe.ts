"use client";

import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import { useAuth } from "@/hooks/useAuth";
import type { MeOverview, MyCircle } from "@/lib/types";

/** GET /me + GET /me/circles for the signed-in user (polls while authenticated). */
export function useMe() {
  const auth = useAuth();
  const on = auth.status === "authenticated";
  const me = usePolling<MeOverview | null>(() => (on ? api.me() : Promise.resolve(null)), POLL_API_MS * 2, [on]);
  const circles = usePolling<MyCircle[]>(() => (on ? api.meCircles().then((r) => r.circles) : Promise.resolve([])), POLL_API_MS * 2, [on]);
  return { me, circles, refetch: () => Promise.all([me.refetch(), circles.refetch()]).then(() => undefined) };
}
