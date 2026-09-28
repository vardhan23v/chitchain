"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api, ApiError, type AdminUserPatch } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { AdminOverview, AdminUser, AuditRow, SupportTicket } from "@/lib/types";

export function useAdminOverview() {
  return usePolling<AdminOverview>(() => api.adminOverview(), POLL_API_MS * 2, []);
}

const USER_ERRORS: Record<string, string> = {
  LAST_ADMIN: "You can't demote or suspend the last admin.",
  CANNOT_EDIT_SELF_ROLE: "You can't change your own role.",
};

export function useAdminUsers(filter: { role?: string; status?: string; q?: string }) {
  const state = usePolling<AdminUser[]>(() => api.adminUsers({ ...filter, limit: 200 }).then((r) => r.users), POLL_API_MS * 4, [filter.role, filter.status, filter.q]);
  const [busy, setBusy] = useState<string | null>(null);
  const update = useCallback(
    async (addr: string, body: AdminUserPatch) => {
      setBusy(addr);
      try {
        await api.adminUpdateUser(addr, body);
        toast.success("User updated");
        await state.refetch();
        return true;
      } catch (e) {
        const code = e instanceof ApiError ? e.code : undefined;
        toast.error(code && USER_ERRORS[code] ? USER_ERRORS[code] : e instanceof Error ? e.message : "Update failed");
        return false;
      } finally {
        setBusy(null);
      }
    },
    [state]
  );
  return { ...state, update, busy };
}

export function useAudit(filter: { actor?: string; action?: string }) {
  return usePolling<AuditRow[]>(() => api.adminAudit({ ...filter, limit: 200 }).then((r) => r.rows), POLL_API_MS * 4, [filter.actor, filter.action]);
}

export function useAdminSupport(status: "OPEN" | "CLOSED" | "") {
  const state = usePolling<SupportTicket[]>(() => api.adminSupport(status || undefined).then((r) => r.tickets), POLL_API_MS * 4, [status]);
  const [busy, setBusy] = useState<number | null>(null);
  const update = useCallback(
    async (id: number, body: { status?: "OPEN" | "CLOSED"; adminNote?: string }) => {
      setBusy(id);
      try {
        await api.adminUpdateTicket(id, body);
        toast.success("Ticket updated");
        await state.refetch();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed");
      } finally {
        setBusy(null);
      }
    },
    [state]
  );
  return { ...state, update, busy };
}

export function useAdminConfig() {
  return usePolling<Record<string, unknown>>(() => api.adminConfig(), 60_000, []);
}
