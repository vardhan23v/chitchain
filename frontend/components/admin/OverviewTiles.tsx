"use client";

import { Activity, Coins, ExternalLink, Landmark, Link2, Lock, Server, ShieldHalf, Ticket, Users } from "lucide-react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { CountUpMst } from "@/components/motion/CountUp";
import { RevealGroup } from "@/components/motion/Reveal";
import { StatTile } from "@/components/StatTile";
import { CHAIN_NAME, EXPLORER_URL } from "@/lib/chain";
import { formatMst, shortAddr } from "@/lib/format";
import type { AdminOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Status value = colour + icon + text (never colour alone). ONLINE/CONNECTED success, STALE warning, OFFLINE danger. */
function Status({ label, tone }: { label: string; tone: "ok" | "warn" | "bad" }) {
  const cls = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-danger";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;
  return <span className={cn("inline-flex items-center gap-1.5 text-lg font-bold", cls)}><Icon className="h-4 w-4" aria-hidden />{label}</span>;
}

/** CHITCHAIN ADMIN overview tiles from GET /admin/overview. Read-only: no fund controls exist. */
export function OverviewTiles({ o, loading }: { o: AdminOverview | null; loading: boolean }) {
  const L = loading && !o;
  const explorer = (o?.contract.explorer || EXPLORER_URL).replace(/\/$/, "");
  return (
    <RevealGroup as="section" mode="load" className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Platform overview">
      <StatTile label="Users" Icon={Users} value={o ? o.users.total : "—"} hint={o ? `${o.users.active} active · ${o.users.suspended} suspended · ${o.users.byRole.ORGANIZER ?? 0} organizers · ${o.users.byRole.ADMIN ?? 0} admins` : undefined} loading={L} />
      <StatTile label="Active circles" Icon={Activity} iconClassName="text-primary" value={o?.circles.active ?? "—"} hint={o ? `${o.circles.open} open · ${o.circles.demo} demo` : undefined} loading={L} />
      <StatTile label="Completed circles" value={o?.circles.completed ?? "—"} hint={o ? `${o.circles.cancelled} cancelled · ${o.circles.total} total` : undefined} loading={L} />
      <StatTile label="MST locked" Icon={Landmark} iconClassName="text-pot" valueClassName="text-pot" testnet value={o ? <><CountUpMst wei={o.mst.locked} fromZero /> MST</> : "—"} hint="everything the contract holds" loading={L} />
      <StatTile label="Active pots" Icon={Coins} testnet value={o ? <><CountUpMst wei={o.mst.pots} fromZero /> MST</> : "—"} loading={L} />
      <StatTile label="Collateral" Icon={Lock} testnet value={o ? <><CountUpMst wei={o.mst.collateral} fromZero /> MST</> : "—"} hint={o ? `reserve ${formatMst(o.mst.reserve)} MST` : undefined} loading={L} />
      <StatTile label="Defaults" Icon={ShieldHalf} iconClassName="text-warning" value={o?.defaults ?? "—"} hint="missed payments detected on-chain, all circles" loading={L} className={o?.defaults ? "border-danger/40" : undefined} />
      <StatTile label="Transactions" value={o?.indexedTx ?? o?.tx.total ?? "—"} hint={o ? <span className={o.tx.failed ? "text-danger" : undefined}>on-chain, indexed · {o.tx.failed} backend sends failed since restart</span> : undefined} loading={L} />
      <StatTile label="Keeper" Icon={Server} value={o ? <Status label={o.keeper.status === "ONLINE" ? "Online" : o.keeper.status === "STALE" ? "Stale" : "Offline"} tone={o.keeper.status === "ONLINE" ? "ok" : o.keeper.status === "STALE" ? "warn" : "bad"} /> : "—"} hint={o?.keeper.address ? `${shortAddr(o.keeper.address)} · ${formatMst(o.keeper.balance)} MST` : undefined} loading={L} />
      <StatTile label={CHAIN_NAME} Icon={Link2} value={o ? <Status label={o.chain.connected ? "Connected" : "Disconnected"} tone={o.chain.connected ? "ok" : "bad"} /> : "—"} hint={o ? `block ${o.chain.latestBlock} · indexer lag ${o.chain.lag}` : undefined} loading={L} />
      <StatTile
        label="Smart contract"
        value={o ? <Status label={o.contract.status === "ACTIVE" ? "Active" : "Not configured"} tone={o.contract.status === "ACTIVE" ? "ok" : "bad"} /> : "—"}
        hint={o?.contract.address ? <a href={`${explorer}/address/${o.contract.address}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-chain hover:underline">{shortAddr(o.contract.address)} <ExternalLink className="h-3 w-3" aria-hidden /> MSTScan</a> : undefined}
        loading={L}
      />
      <StatTile label="Open tickets" Icon={Ticket} value={o?.tickets.open ?? "—"} hint={o ? `${o.audit.last24h} audit rows in 24 h` : undefined} loading={L} />
    </RevealGroup>
  );
}
