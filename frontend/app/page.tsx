"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCard } from "@/components/CircleCard";
import { HowItWorks } from "@/components/HowItWorks";
import { Logo } from "@/components/Logo";
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
  const circles = (data?.circles ?? []).filter((c) => FILTERS[filter](c.status));
  const stats = data?.stats ?? null;

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 md:grid-cols-[3fr_2fr]">
        <div>
          <TestnetBadge className="mb-3" />
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            The pot sits in a contract,<br />not in anyone&apos;s account.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Transparent chit funds on MST Blockchain. Contributions, auction, payouts and penalties are enforced by code — every step verifiable on MSTScan.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/create"><Plus aria-hidden /> Create a circle</Link></Button>
            <Button size="lg" variant="outline" asChild><a href="#circles">Browse circles</a></Button>
          </div>
        </div>
        <div className="hidden justify-center md:flex"><Logo className="h-40 w-40 text-primary" /></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Network stats">
        <StatTile label="Circles live" value={stats?.circlesLive ?? (data ? data.circles.filter((c) => c.status <= 1).length : "—")} loading={loading} hint={stats ? `${stats.circlesTotal} total` : data?.source === "chain" ? "read from contract" : undefined} />
        <StatTile label="MST in contracts" testnet value={stats ? formatMst(stats.mstcInContract) : "—"} loading={loading} hint={stats ? "testnet coins, no monetary value" : "needs backend"} />
        <StatTile label="On-chain transactions" value={stats?.txCount ?? "—"} loading={loading} hint={stats ? undefined : "needs backend"} />
      </section>

      <HowItWorks />

      <section id="circles" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>Circles</h2>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="rounded-full">
              <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
              <TabsTrigger value="open" className="rounded-full">Open</TabsTrigger>
              <TabsTrigger value="active" className="rounded-full">Active</TabsTrigger>
              <TabsTrigger value="done" className="rounded-full">Done</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {slow && !data && <p className="text-sm text-warning" role="status">MST testnet is slow — retrying</p>}
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
        ) : circles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
            <Sparkles className="h-8 w-8 text-pot" aria-hidden />
            <p className="text-muted-foreground">{error && !data ? "Couldn't reach the backend or the contract." : "No circles here yet."}</p>
            <Button asChild><Link href="/create">Create the first circle</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{circles.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        )}
      </section>
    </div>
  );
}
