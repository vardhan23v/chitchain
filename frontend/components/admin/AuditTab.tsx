"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TableScroll, TH } from "@/components/TableScroll";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TxLink } from "@/components/TxLink";
import { useAudit } from "@/hooks/useAdmin";
import { shortAddr, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";


/** Application audit log. Blockchain events remain the authority for chain state. */
export function AuditTab() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const audit = useAudit({ actor: actor || undefined, action: action || undefined });
  const rows = audit.data ?? [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Actor wallet" value={actor} onChange={(e) => setActor(e.target.value.trim())} className="h-9 max-w-xs font-mono text-xs" aria-label="Filter by actor" />
        <Input placeholder="Action (e.g. login, claim, settle)" value={action} onChange={(e) => setAction(e.target.value.trim())} className="h-9 max-w-xs" aria-label="Filter by action" />
      </div>
      <p className="text-xs text-muted-foreground">Application log of website and backend actions. Blockchain events on MSTScan remain the authority for on-chain state.</p>
      <Card className="overflow-hidden">
        {audit.loading && !audit.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : audit.error && !audit.data ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Couldn&apos;t load the audit log, {audit.error}</p>
        ) : (
          <TableScroll><table className="table-data w-full min-w-[820px] text-sm">
            <thead><tr><th className={TH}>When</th><th className={TH}>Actor</th><th className={TH}>Role</th><th className={TH}>Action</th><th className={TH}>Target</th><th className={TH}>Result</th><th className={TH}>Tx</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground" title={new Date(r.ts * (r.ts < 1e12 ? 1000 : 1)).toLocaleString("en-IN")}>{timeAgo(r.ts < 1e12 ? r.ts : Math.floor(r.ts / 1000))}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.actorWallet ? shortAddr(r.actorWallet) : "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.role}</td>
                  <td className="px-3 py-2 font-medium">{r.action}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-muted-foreground" title={r.target ?? undefined}>{r.target ?? "—"}</td>
                  <td className={cn("px-3 py-2 text-xs font-medium", /ok|success/i.test(r.result) ? "text-success" : /denied|fail|error/i.test(r.result) ? "text-danger" : "")}><span className="inline-flex items-center gap-1">{/ok|success/i.test(r.result) ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : /denied|fail|error/i.test(r.result) ? <XCircle className="h-3 w-3" aria-hidden /> : null}{r.result}</span></td>
                  <td className="px-3 py-2">{r.txHash ? <TxLink hash={r.txHash} label="MSTScan" /> : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No audit rows match.</td></tr>}
            </tbody>
          </table></TableScroll>
        )}
      </Card>
    </div>
  );
}
