"use client";

import Link from "next/link";
import { Wallet, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CircleCard } from "@/components/CircleCard";
import { ActiveCircleTiles } from "@/components/dashboard/ActiveCircleTiles";
import { ScoreGauge, scoreBand } from "@/components/ScoreGauge";
import { StatTile } from "@/components/StatTile";
import { TestnetBadge } from "@/components/TestnetBadge";
import { TierChip } from "@/components/TierChip";
import { useCircles } from "@/hooks/useCircles";
import { useMyCircles } from "@/hooks/useMyCircles";
import { useRisk } from "@/hooks/useRisk";
import { useWallet } from "@/hooks/useWallet";
import { BRIDGEKEY_URL } from "@/lib/chain";

export default function DashboardPage() {
  const wallet = useWallet();
  if (!wallet.account) {
    return (
      <Card className="rounded-2xl p-8 text-center">
        <Wallet className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-3 text-2xl">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Connect BridgeKey to see your circles, collateral and risk score.</p>
        {wallet.hasWallet ? (
          <Button className="mt-4" onClick={() => void wallet.connect()} disabled={wallet.connecting}>{wallet.connecting ? "Connecting…" : "Connect BridgeKey"}</Button>
        ) : (
          <Button className="mt-4" asChild><a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer">Install BridgeKey</a></Button>
        )}
      </Card>
    );
  }
  return <Dashboard account={wallet.account} />;
}

function Dashboard({ account }: { account: string }) {
  const all = useCircles();
  const mine = useMyCircles(account);
  const risk = useRisk(account);
  const stats = all.data?.stats ?? null;
  const circles = mine.data?.circles ?? [];
  const active = circles.filter((c) => c.status === 1).sort((a, b) => b.id - a.id)[0] ?? null;
  const backendDown = all.data?.source === "chain" || mine.data?.source === "chain";
  const r = risk.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1>Dashboard</h1>
        <TestnetBadge />
        {backendDown && <Badge variant="outline" className="gap-1 text-muted-foreground"><WifiOff className="h-3 w-3" aria-hidden /> backend offline — reading the contract</Badge>}
      </div>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Overview">
        <StatTile label="Total circles" value={stats?.circlesTotal ?? all.data?.circles.length ?? "—"} loading={all.loading && !all.data} />
        <StatTile label="Active circles" value={stats?.circlesLive ?? all.data?.circles.filter((c) => c.status === 1).length ?? "—"} loading={all.loading && !all.data} />
        <StatTile label="My circles" value={mine.data ? circles.length : "—"} loading={mine.loading && !mine.data} hint={mine.error && !mine.data ? "couldn't load" : `${circles.filter((c) => c.status === 1).length} active`} />
      </section>

      {active ? (
        <ActiveCircleTiles circle={active} account={account} />
      ) : (
        <Card className="rounded-2xl border-dashed p-6 text-center text-sm text-muted-foreground">
          {mine.loading && !mine.data ? "Loading your circles…" : "You're not in an active circle right now."} <Link href="/#circles" className="text-primary hover:underline">Browse circles</Link>
        </Card>
      )}

      <section className="grid gap-3 md:grid-cols-[auto_1fr]" aria-label="Risk">
        <Card className="rounded-2xl p-4 md:p-5">
          <div className="text-[13px] font-medium text-muted-foreground">My risk score</div>
          {r ? (
            <div className="mt-2 flex items-center gap-4">
              <div className="pb-4"><ScoreGauge score={r.score} /></div>
              <div className="space-y-1">
                <TierChip tier={r.tier} />
                <div className="text-sm">{scoreBand(r.score)} risk band</div>
                <Link href={`/member/${account}`} className="text-xs text-primary hover:underline">Full profile →</Link>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{risk.loading ? "Loading…" : "Needs the backend."}</p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Demo heuristic risk model · 0 = safest, 100 = riskiest · not a credit score</p>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile label="My defaults" value={circles.reduce((s, c) => s + (c.me?.defaults ?? 0), 0)} hint="across all my circles" />
          <StatTile label="Quick links" value={<span className="flex flex-wrap gap-2 text-sm font-medium"><Link className="text-primary hover:underline" href="/activity">Transaction history</Link><Link className="text-primary hover:underline" href="/collateral">My collateral</Link></span>} />
        </div>
      </section>

      {circles.length > 0 && (
        <section className="space-y-3">
          <h2>My circles</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{circles.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}
