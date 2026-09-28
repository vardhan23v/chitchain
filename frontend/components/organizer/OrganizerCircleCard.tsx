"use client";

import Link from "next/link";
import { BarChart3, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NameCircleForm } from "@/components/organizer/NameCircleForm";
import { DemoBadge } from "@/components/TestnetBadge";
import { big, formatMst } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { roundNo, type OrganizerCircle } from "@/lib/types";

const STATUS_VARIANT = { 0: "pot", 1: "default", 2: "status-paid", 3: "status-removed" } as const;

function Cell({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`tnum text-sm font-semibold ${warn ? "text-danger" : ""}`}>{value}</dd>
    </div>
  );
}

export function OrganizerCircleCard({ c, onChanged }: { c: OrganizerCircle; onChanged: () => void }) {
  const joined = c.members.filter((m) => m.joined && !m.removed).length;
  const hasBid = big(c.round?.bestDiscount ?? "0") > 0n;
  return (
    <Card className="card-hover flex flex-col gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {c.name ? (
          <h2 className="text-base">{c.name} <span className="font-normal text-muted-foreground">· Circle #{c.id}</span></h2>
        ) : (
          <h2 className="text-base text-muted-foreground">Unnamed · Circle #{c.id}</h2>
        )}
        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        {c.isDemo && <DemoBadge />}
      </div>
      {!c.name && <NameCircleForm id={c.id} onSaved={onChanged} />}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-4">
        <Cell label="Members" value={`${joined} / ${c.maxMembers}`} />
        <Cell label="Round" value={c.status === 1 ? `${roundNo(c)} / ${c.maxMembers}` : "—"} />
        <Cell label="Current pot" value={c.round ? `${formatMst(c.round.collected)} / ${formatMst(c.round.expectedPot)} MST` : "—"} />
        <Cell label="Contribution" value={`${formatMst(c.contribution)} MST`} />
        <Cell label="Lowest accepted payout" value={hasBid ? `${formatMst(c.lowestAcceptedPayout)} MST` : "No bids yet"} />
        <Cell label="Pending contributions" value={c.pendingContributions} warn={c.pendingContributions > 0} />
        <Cell label="Defaults" value={c.defaults} warn={c.defaults > 0} />
        <Cell label="Collateral total" value={`${formatMst(c.collateralTotal)} MST`} />
      </dl>
      <div className="mt-auto flex gap-2">
        <Button asChild variant="outline" className="flex-1"><Link href={`/circle/${c.id}`}><DoorOpen aria-hidden /> Open room</Link></Button>
        <Button asChild className="flex-1"><Link href={`/organizer/circles/${c.id}`}><BarChart3 aria-hidden /> Analytics</Link></Button>
      </div>
    </Card>
  );
}
