"use client";

import { ExternalLink } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { CHAIN_NAME, EXPLORER_URL } from "@/lib/chain";
import { formatMst, shortAddr } from "@/lib/format";
import type { AdminOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

function Status({ label, tone }: { label: string; tone: "ok" | "warn" | "bad" }) {
  const cls = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-danger";
  return <span className={cn("inline-flex items-center gap-2 text-lg", cls)}><span className={cn("h-2.5 w-2.5 rounded-full", tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-danger")} aria-hidden />{label}</span>;
}

/** CHITCHAIN ADMIN overview tiles from GET /admin/overview. Read-only: no fund controls exist. */
export function OverviewTiles({ o, loading }: { o: AdminOverview | null; loading: boolean }) {
  const L = loading && !o;
  const explorer = (o?.contract.explorer || EXPLORER_URL).replace(/\/$/, "");
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Platform overview">
      <StatTile label="Users" value={o ? `${o.users.total}` : "—"} hint={o ? `${o.users.active} active · ${o.users.suspended} suspended · ${o.users.byRole.ORGANIZER ?? 0} organizers · ${o.users.byRole.ADMIN ?? 0} admins` : undefined} loading={L} />
      <StatTile label="Active circles" value={o?.circles.active ?? "—"} hint={o ? `${o.circles.open} open · ${o.circles.demo} demo` : undefined} loading={L} />
      <StatTile label="Completed circles" value={o?.circles.completed ?? "—"} hint={o ? `${o.circles.cancelled} cancelled · ${o.circles.total} total` : undefined} loading={L} />
      <StatTile label="MST locked" testnet value={o ? `${formatMst(o.mst.locked)} MST` : "—"} hint="everything the contract holds" loading={L} />
      <StatTile label="Active pots" testnet value={o ? `${formatMst(o.mst.pots)} MST` : "—"} loading={L} />
      <StatTile label="Collateral" testnet value={o ? `${formatMst(o.mst.collateral)} MST` : "—"} hint={o ? `reserve ${formatMst(o.mst.reserve)} MST` : undefined} loading={L} />
      <StatTile label="Defaults" value={o?.defaults ?? "—"} hint="covered from collateral, all circles" loading={L} className={o?.defaults ? "border-danger/40" : undefined} />
      <StatTile label="Transactions" value={o?.tx.total ?? "—"} hint={o ? <span className={o.tx.failed ? "text-danger" : undefined}>{o.tx.failed} failed{o.tx.lastFailure ? ` · ${o.tx.lastFailure}` : ""}</span> : undefined} loading={L} />
      <StatTile label="Keeper" value={o ? <Status label={o.keeper.status} tone={o.keeper.status === "ONLINE" ? "ok" : o.keeper.status === "STALE" ? "warn" : "bad"} /> : "—"} hint={o?.keeper.address ? `${shortAddr(o.keeper.address)} · ${formatMst(o.keeper.balance, 3)} MST` : undefined} loading={L} />
      <StatTile label={CHAIN_NAME} value={o ? <Status label={o.chain.connected ? "CONNECTED" : "DISCONNECTED"} tone={o.chain.connected ? "ok" : "bad"} /> : "—"} hint={o ? `block ${o.chain.latestBlock} · indexer lag ${o.chain.lag}` : undefined} loading={L} />
      <StatTile
        label="Smart contract"
        value={o ? <Status label={o.contract.status === "ACTIVE" ? "ACTIVE" : "NOT CONFIGURED"} tone={o.contract.status === "ACTIVE" ? "ok" : "bad"} /> : "—"}
        hint={o?.contract.address ? <a href={`${explorer}/address/${o.contract.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-chain hover:underline">{shortAddr(o.contract.address)} <ExternalLink className="h-3 w-3" aria-hidden /> MSTScan</a> : undefined}
        loading={L}
      />
      <StatTile label="Open tickets" value={o?.tickets.open ?? "—"} hint={o ? `${o.audit.last24h} audit rows in 24 h` : undefined} loading={L} />
    </section>
  );
}
