"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import { useAuth } from "@/hooks/useAuth";
import type { SupportTicket } from "@/lib/types";

/** GET /support/mine + POST /support for the signed-in user. */
export function useSupport() {
  const auth = useAuth();
  const on = auth.status === "authenticated";
  const mine = usePolling<SupportTicket[]>(() => (on ? api.supportMine().then((r) => r.tickets) : Promise.resolve([])), POLL_API_MS * 4, [on]);
  const [sending, setSending] = useState(false);
  const create = useCallback(
    async (subject: string, message: string) => {
      setSending(true);
      try {
        await api.supportCreate({ subject, message });
        toast.success("Ticket sent — we'll reply here.");
        await mine.refetch();
        return true;
      } catch (e) {
        toast.error(e instanceof ApiError && e.code === "RATE_LIMITED" ? "Too many tickets — wait a minute." : e instanceof Error ? e.message : "Couldn't send the ticket");
        return false;
      } finally {
        setSending(false);
      }
    },
    [mine]
  );
  return { ...mine, create, sending };
}
