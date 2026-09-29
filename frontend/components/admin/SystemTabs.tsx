"use client";

import { Card } from "@/components/ui/card";
import { TableScroll, TH } from "@/components/TableScroll";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminConfig } from "@/hooks/useAdmin";
import { timeAgo } from "@/lib/format";
import { ServiceChips } from "@/components/admin/ServiceChips";
import type { Health, LoopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";


/** Read-only key/value view of GET /admin/config (backend never returns keys or DATABASE_URL). */
export function ConfigTab() {
  const c = useAdminConfig();
  const entries = Object.entries(c.data ?? {});
  return (
    <Card className="overflow-hidden">
      {c.loading && !c.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : c.error && !c.data ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Config is temporarily unavailable.<span className="mt-1 block font-mono text-[11px] text-muted-foreground/80">{c.error}</span></p>
      ) : (
        <TableScroll><table className="table-data w-full text-sm">
          <thead><tr><th className={TH}>Key</th><th className={TH}>Value</th></tr></thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k}><td className="px-3 py-2 font-mono text-xs">{k}</td><td className="break-all px-3 py-2 font-mono text-xs">{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">Nothing to show.</td></tr>}
          </tbody>
        </table></TableScroll>
      )}
      <p className="px-3 py-2 text-[11px] text-muted-foreground">Read-only. Secrets never leave the server.</p>
    </Card>
  );
}

const ms = (v: number | null) => (v ? timeAgo(v < 1e12 ? v : Math.floor(v / 1000)) : "Never");

/** Backend loops (indexer, keeper, autopilot, agent, oracle…) with last tick and last error. */
export function SystemTab({ loops, loading, health = null }: { loops: LoopStatus[] | null; loading: boolean; health?: Health | null }) {
  return (
    <Card className="overflow-hidden">
      <ServiceChips health={health} />
      {loading && !loops ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : (
        <TableScroll><table className="table-data w-full min-w-[720px] text-sm">
          <thead><tr><th className={TH}>Loop</th><th className={cn(TH, "text-right")}>Every</th><th className={cn(TH, "text-right")}>Ticks</th><th className={cn(TH, "text-right")}>Errors</th><th className={TH}>Last tick</th><th className={TH}>Last OK</th><th className={TH}>Last error</th></tr></thead>
          <tbody>
            {(loops ?? []).map((l) => (
              <tr key={l.name} className="align-top">
                <td className="px-3 py-2 font-medium">{l.name}{l.busy && <span className="ml-1 text-[10px] font-medium text-muted-foreground">Busy</span>}</td>
                <td className="tnum px-3 py-2 text-right">{Math.round(l.everyMs / 1000)} s</td>
                <td className="tnum px-3 py-2 text-right">{l.ticks}</td>
                <td className={cn("tnum px-3 py-2 text-right", l.errors > 0 && "font-semibold text-danger")}>{l.errors}</td>
                <td className="px-3 py-2 text-muted-foreground">{ms(l.lastTickAt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{ms(l.lastOkAt)}</td>
                <td className="max-w-[260px] truncate px-3 py-2 text-xs text-danger" title={l.lastError ?? undefined}>{l.lastError ?? "—"}</td>
              </tr>
            ))}
            {(loops ?? []).length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No loop status reported.</td></tr>}
          </tbody>
        </table></TableScroll>
      )}
    </Card>
  );
}
