"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DefaultEventCard } from "@/components/DefaultEventCard";
import { Feed } from "@/components/Feed";
import { MembersTable } from "@/components/MembersTable";
import { InviteForm } from "@/components/organizer/InviteForm";
import { NameCircleForm } from "@/components/organizer/NameCircleForm";
import { OrganizerNotice } from "@/components/organizer/OrganizerNotice";
import { ForbiddenCard, RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { RoundHistory } from "@/components/RoundHistory";
import { StatTile } from "@/components/StatTile";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { isUnreachable } from "@/lib/api";
import { formatMst, shortAddr } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/labels";

export default function OrganizerCirclePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  return (
    <RequireAuth roles={["ORGANIZER", "ADMIN"]}>
      {Number.isFinite(id) && id > 0 ? <Analytics id={id} /> : <ForbiddenCard title="Unknown circle" />}
    </RequireAuth>
  );
}

function Analytics({ id }: { id: number }) {
  const auth = useAuth();
  const a = useAnalytics(id);
  const d = a.data;
  const forbidden = a.error && !d && /403|FORBIDDEN|NOT_ORGANIZER/i.test(a.error);
  if (forbidden) return <ForbiddenCard detail="Only the organizer of this circle (or an admin) can see its analytics." />;
  const labels = Object.fromEntries((d?.members ?? []).filter((m) => m.label).map((m) => [m.address.toLowerCase(), `Member ${m.label}`]));
  const labelFor = (addr: string) => labels[addr.toLowerCase()] ?? shortAddr(addr);
  const rate = Math.round((d?.contributionRate ?? 0) * 100);

  return (
    <div className="space-y-6">
      <Link href="/organizer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden /> My circles</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl md:text-3xl">{d?.circle.name ?? `Circle #${id}`}{d?.circle.name && <span className="ml-2 text-base font-normal text-muted-foreground">· Circle #{id}</span>}</h1>
        {auth.user && <RoleBadge role={auth.user.role} />}
        <TestnetBadge />
        <Link href={`/circle/${id}`} className="ml-auto text-sm text-primary hover:underline">Open room →</Link>
      </div>
      <OrganizerNotice />
      {d && !d.circle.name && <Card className="rounded-2xl p-4"><NameCircleForm id={id} onSaved={() => void a.refetch()} /></Card>}

      {a.loading && !d ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : a.error && !d ? (
        <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">{isUnreachable(a.error) ? "Backend unreachable — analytics need the ChitChain API." : a.error}</Card>
      ) : d ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Circle analytics">
            <StatTile label="Round" value={d.circle.status === 1 ? `${d.round.round} / ${d.circle.maxMembers}` : "—"} hint={PHASE_LABEL[d.round.phase]} />
            <StatTile label="Current pot" testnet value={`${formatMst(d.round.collected)} / ${formatMst(d.round.expectedPot)}`} hint="collected / expected, MST" />
            <StatTile label="Contribution rate" value={`${rate}%`} hint="this round">
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-success" style={{ width: `${rate}%` }} />
              </div>
            </StatTile>
            <StatTile label="Agent decisions" value={d.agentDecisions} hint="AI bidding agent, this circle" />
          </section>
          <MembersTable circle={d.circle} members={d.members} viewer={auth.user?.walletAddress ?? null} extras={{}} />
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-4">
              <RoundHistory rounds={d.rounds} loading={false} labelFor={labelFor} source="api" />
              {d.defaults.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-base">Defaults</h2>
                  {d.defaults.map((x) => <DefaultEventCard key={`${x.member}-${x.round}-${x.txHash}`} d={x} compact />)}
                </section>
              )}
              <InviteForm circleId={id} />
            </div>
            <Feed events={d.recentEvents} down={false} loading={false} labels={labels} title="Recent events" />
          </div>
        </>
      ) : null}
    </div>
  );
}
