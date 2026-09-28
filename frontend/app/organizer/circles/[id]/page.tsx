"use client";

import Link from "next/link";
import { ArrowLeft, ShieldHalf, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
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
import { RevealGroup } from "@/components/motion/Reveal";
import { StatTile } from "@/components/StatTile";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        back={<Link href="/organizer" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"><ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My circles</Link>}
        eyebrow={`Circle #${id} · analytics`}
        title={d?.circle.name ?? `Circle #${id}`}
        description="Contribution rate, defaults and agent decisions for this circle."
        actions={
          <>
            {auth.user && <RoleBadge role={auth.user.role} />}
            <Button asChild size="sm" variant="outline"><Link href={`/circle/${id}`}>Open room</Link></Button>
          </>
        }
      />
      <OrganizerNotice />
      {d && !d.circle.name && <Card className="p-4 md:p-5"><NameCircleForm id={id} onSaved={() => void a.refetch()} /></Card>}

      {a.loading && !d ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : a.error && !d ? (
        <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" title="Analytics are temporarily unavailable." text={isUnreachable(a.error) ? "Check your connection and try again in a moment." : a.error} />
      ) : d ? (
        <>
          <RevealGroup as="section" mode="load" className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Circle analytics">
            <StatTile label="Round" value={d.circle.status === 1 ? `${d.round.round} / ${d.circle.maxMembers}` : "—"} hint={d.circle.status === 1 ? PHASE_LABEL[d.round.phase] : "not active"} />
            <StatTile label="Current pot" testnet valueClassName="text-pot" value={<>{formatMst(d.round.collected)} <span className="text-base font-medium text-muted-foreground">/ {formatMst(d.round.expectedPot)}</span></>} hint="collected / expected, MST" />
            <StatTile label="Contribution rate" value={`${rate}%`} hint="this round">
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-success" style={{ width: `${rate}%` }} />
              </div>
            </StatTile>
            <StatTile label="Agent decisions" value={d.agentDecisions} hint="AI bidding agent, this circle" />
          </RevealGroup>
          <MembersTable circle={d.circle} members={d.members} viewer={auth.user?.walletAddress ?? null} extras={{}} />
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div className="space-y-6">
              <RoundHistory rounds={d.rounds} loading={false} labelFor={labelFor} source="api" />
              {d.defaults.length > 0 && (
                <section className="space-y-3">
                  <SectionTitle Icon={ShieldHalf} tone="text-warning" trailing={<span className="tnum">{d.defaults.length}</span>}>Defaults</SectionTitle>
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
