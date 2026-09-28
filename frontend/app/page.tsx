"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, CircleDot, Coins, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCard } from "@/components/CircleCard";
import { EmptyState } from "@/components/EmptyState";
import { HowItWorks } from "@/components/HowItWorks";
import { Logo } from "@/components/Logo";
import { SectionTitle } from "@/components/PageHeader";
import { RolesStrip } from "@/components/RolesStrip";
import { StatTile } from "@/components/StatTile";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useCircles } from "@/hooks/useCircles";
import { formatMst } from "@/lib/format";
import type { Status } from "@/lib/types";

type Filter = "all" | "open" | "active" | "done";
const FILTERS: Record<Filter, (s: Status) => boolean> = {
  all: () => true,
  open: (s) => s === 0,
  active: (s) => s === 1,
  done: (s) => s === 2 || s === 3,
};

export default function HomePage() {
  const { data, loading, slow, error } = useCircles();
  const [filter, setFilter] = useState<Filter>("all");
  const all = data?.circles ?? [];
  const circles = all.filter((c) => FILTERS[filter](c.status));
  const stats = data?.stats ?? null;
  const count = (f: Filter) => all.filter((c) => FILTERS[f](c.status)).length;

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 pt-2 md:grid-cols-[3fr_2fr] md:pt-6">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span>Chit funds on MST Blockchain</span>
            <TestnetBadge size="xs" />
          </div>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.08] tracking-tight md:text-5xl">
            The pot sits in a contract,<br className="hidden sm:block" /> not in anyone&apos;s account.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] text-muted-foreground md:text-lg">Contributions, auctions, payouts and penalties are enforced by code — every step verifiable on MSTScan.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/create"><Plus aria-hidden /> Create a circle</Link></Button>
            <Button size="lg" variant="outline" asChild><a href="#circles">Browse circles</a></Button>
          </div>
        </div>
        <div className="hidden justify-center md:flex">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 via-pot/10 to-transparent">
            <Logo className="h-36 w-36 text-primary drop-shadow-sm" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Network stats">
        <StatTile label="Circles live" Icon={CircleDot} iconClassName="text-primary" value={stats?.circlesLive ?? (data ? all.filter((c) => c.status <= 1).length : "—")} loading={loading && !data} hint={stats ? `${stats.circlesTotal} total` : data?.source === "chain" ? "read from contract" : undefined} />
        <StatTile label="MST in contracts" Icon={Coins} iconClassName="text-pot" testnet value={stats ? formatMst(stats.mstcInContract) : "—"} valueClassName="text-pot" loading={loading && !data} hint={stats ? "held by the contract, not by anyone" : "needs backend"} />
        <StatTile label="On-chain transactions" Icon={Activity} iconClassName="text-chain" value={stats?.txCount ?? "—"} loading={loading && !data} hint={stats ? "every one verifiable on MSTScan" : "needs backend"} className="col-span-2 md:col-span-1" />
      </section>

      <HowItWorks />

      <RolesStrip />

      <section id="circles" className="scroll-mt-20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle Icon={CircleDot} tone="text-primary">Circles</SectionTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList aria-label="Filter circles">
              {(["all", "open", "active", "done"] as Filter[]).map((f) => (
                <TabsTrigger key={f} value={f} className="capitalize">
                  {f}
                  {data && <span className="tnum rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{count(f)}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {slow && !data && <p className="text-sm text-warning" role="status">MST testnet is slow — retrying</p>}
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
        ) : circles.length === 0 ? (
          <EmptyState
            Icon={Sparkles}
            tone="bg-pot/10 text-pot"
            title={error && !data ? "Couldn't reach the backend or the contract" : all.length ? `No ${filter} circles` : "No circles here yet"}
            text={error && !data ? "Check your connection and try again." : "Set the rules once — the contract enforces them for everyone."}
            action={<Button asChild><Link href="/create"><Plus aria-hidden /> Create the first circle</Link></Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{circles.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        )}
      </section>
    </div>
  );
}
