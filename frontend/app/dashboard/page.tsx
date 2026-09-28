"use client";

import Link from "next/link";
import { CircleDot, ExternalLink, History, KeyRound, LifeBuoy, Lock, User, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CircleCard } from "@/components/CircleCard";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { ActiveCircleTiles } from "@/components/dashboard/ActiveCircleTiles";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { MeTiles } from "@/components/dashboard/MeTiles";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/hooks/useAuth";
import { useMe } from "@/hooks/useMe";
import { isUnreachable } from "@/lib/api";

const QUICK = [
  { href: "/member/ACCOUNT", label: "Risk profile", Icon: User },
  { href: "/activity", label: "Transaction history", Icon: History },
  { href: "/collateral", label: "My collateral", Icon: Lock },
  { href: "/support", label: "Support", Icon: LifeBuoy },
];

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
      <PageHeader
        eyebrow="My dashboard"
        title={auth.user?.displayName || "Overview"}
        description="Your balances, collateral and the circle that needs you right now. Every number is read from the contract."
        actions={
          <>
            {auth.user && <RoleBadge role={auth.user.role} passwordAdmin={auth.isPasswordAdmin} />}
            {down && <Badge variant="outline" className="gap-1 text-muted-foreground"><WifiOff className="h-3 w-3" aria-hidden /> {isUnreachable(me.error) ? "backend offline" : "couldn't load overview"}</Badge>}
          </>
        }
      />

      {auth.isPasswordAdmin && (
        <InfoBanner Icon={KeyRound} tone="agent">
          Password admin accounts have no wallet; use the <Link href="/admin" className="font-semibold text-primary hover:underline">Admin dashboard</Link>.
        </InfoBanner>
      )}

      <MeTiles me={me.data} circles={list} account={account} loading={me.loading} />

      {active ? (
        <ActiveCircleTiles circle={active} account={account} />
      ) : (
        <EmptyState
          Icon={CircleDot}
          title={circles.loading && !circles.data ? "Loading your circles…" : "You're not in an active circle right now"}
          text="Join an open circle and your live round will show here."
          action={<Button asChild variant="outline"><Link href="/#circles">Browse circles</Link></Button>}
        />
      )}

      <ControlPanel />

      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="More">
        {QUICK.map(({ href, label, Icon }) => (
          <Link key={label} href={href.replace("ACCOUNT", account)} className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-medium">
            <Icon className="h-4 w-4 text-primary" aria-hidden /> {label} <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
          </Link>
        ))}
      </nav>

      {list.length > 0 && (
        <section className="space-y-3">
          <SectionTitle Icon={CircleDot} tone="text-primary" trailing={<span className="tnum">{list.length}</span>}>My circles</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}
