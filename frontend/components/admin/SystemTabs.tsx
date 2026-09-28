"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminConfig } from "@/hooks/useAdmin";
import { timeAgo } from "@/lib/format";
import type { LoopStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

/** Read-only key/value view of GET /admin/config (backend never returns keys or DATABASE_URL). */
export function ConfigTab() {
  const c = useAdminConfig();
  const entries = Object.entries(c.data ?? {});
  return (
    <Card className="overflow-x-auto rounded-2xl">
      {c.loading && !c.data ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : c.error && !c.data ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Couldn&apos;t load config — {c.error}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className={TH}>Key</th><th className={TH}>Value</th></tr></thead>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k} className="border-t"><td className="px-3 py-2 font-mono text-xs">{k}</td><td className="break-all px-3 py-2 font-mono text-xs">{typeof v === "object" ? JSON.stringify(v) : String(v)}</td></tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">Nothing to show.</td></tr>}
          </tbody>
        </table>
      )}
      <p className="px-3 py-2 text-[11px] text-muted-foreground">Read-only. Secrets never leave the server.</p>
    </Card>
  );
}

const ms = (v: number | null) => (v ? timeAgo(v < 1e12 ? v : Math.floor(v / 1000)) : "never");

/** Backend loops (indexer, keeper, autopilot, agent, oracle…) with last tick and last error. */
export function SystemTab({ loops, loading }: { loops: LoopStatus[] | null; loading: boolean }) {
  return (
    <Card className="overflow-x-auto rounded-2xl">
      {loading && !loops ? (
        <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : (
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50"><tr><th className={TH}>Loop</th><th className={TH}>Every</th><th className={TH}>Ticks</th><th className={TH}>Errors</th><th className={TH}>Last tick</th><th className={TH}>Last OK</th><th className={TH}>Last error</th></tr></thead>
          <tbody>
            {(loops ?? []).map((l) => (
              <tr key={l.name} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{l.name}{l.busy && <span className="ml-1 text-[10px] text-muted-foreground">busy</span>}</td>
                <td className="tnum px-3 py-2">{Math.round(l.everyMs / 1000)} s</td>
                <td className="tnum px-3 py-2">{l.ticks}</td>
                <td className={cn("tnum px-3 py-2", l.errors > 0 && "font-semibold text-danger")}>{l.errors}</td>
                <td className="px-3 py-2 text-muted-foreground">{ms(l.lastTickAt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{ms(l.lastOkAt)}</td>
                <td className="max-w-[260px] truncate px-3 py-2 text-xs text-danger" title={l.lastError ?? undefined}>{l.lastError ?? "—"}</td>
              </tr>
            ))}
            {(loops ?? []).length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No loop status reported.</td></tr>}
          </tbody>
        </table>
      )}
    </Card>
  );
}
