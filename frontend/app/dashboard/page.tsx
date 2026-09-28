"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CircleCard } from "@/components/CircleCard";
import { ActiveCircleTiles } from "@/components/dashboard/ActiveCircleTiles";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { MeTiles } from "@/components/dashboard/MeTiles";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";
import { isUnreachable } from "@/lib/api";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

function Dashboard() {
  const auth = useAuth();
  const { me, circles } = useMe();
  const account = auth.user?.walletAddress ?? "";
  const list = circles.data ?? [];
  const active = list.filter((c) => c.status === 1).sort((a, b) => b.id - a.id)[0] ?? null;
  const down = !!me.error && !me.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">My dashboard</h1>
        {auth.user && <RoleBadge role={auth.user.role} />}
        <TestnetBadge />
        {down && <Badge variant="outline" className="gap-1 text-muted-foreground"><WifiOff className="h-3 w-3" aria-hidden /> {isUnreachable(me.error) ? "backend offline" : "couldn't load overview"}</Badge>}
      </div>

      <MeTiles me={me.data} circles={list} account={account} loading={me.loading} />

      {active ? (
        <ActiveCircleTiles circle={active} account={account} />
      ) : (
        <Card className="rounded-2xl border-dashed p-6 text-center text-sm text-muted-foreground">
          {circles.loading && !circles.data ? "Loading your circles…" : "You're not in an active circle right now."} <Link href="/#circles" className="text-primary hover:underline">Browse circles</Link>
        </Card>
      )}

      <ControlPanel />

      <section className="flex flex-wrap gap-4 text-sm">
        <Link className="text-primary hover:underline" href={`/member/${account}`}>Full risk profile</Link>
        <Link className="text-primary hover:underline" href="/activity">Transaction history</Link>
        <Link className="text-primary hover:underline" href="/collateral">My collateral</Link>
        <Link className="text-primary hover:underline" href="/support">Support</Link>
      </section>

      {list.length > 0 && (
        <section className="space-y-3">
          <h2>My circles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}
