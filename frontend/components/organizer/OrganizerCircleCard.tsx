"use client";

import Link from "next/link";
import { BarChart3, DoorOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NameCircleForm } from "@/components/organizer/NameCircleForm";
import { DemoBadge } from "@/components/TestnetBadge";
import { big, formatMst, shortAddr } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import { roundNo, type OrganizerCircle } from "@/lib/types";

const STATUS_VARIANT = { 0: "pot", 1: "default", 2: "status-paid", 3: "status-removed" } as const;

function Cell({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-muted-foreground">{label}</dt>
      <dd className={`tnum text-sm font-semibold ${warn ? "text-danger" : ""}`}>{value}</dd>
    </div>
  );
}

export function OrganizerCircleCard({ c, onChanged }: { c: OrganizerCircle; onChanged: () => void }) {
  const joined = c.members.filter((m) => m.joined && !m.removed).length;
  const hasBid = big(c.round?.bestDiscount ?? "0") > 0n;
  const active = c.status === 1 && !!c.round;
  const code = c.round?.phaseCode ?? 0;
  const recipient = c.round?.recipient ? (c.round.recipientName ?? (c.round.recipientLabel ? `Demo ${c.round.recipientLabel}` : shortAddr(c.round.recipient))) : null;
  const decision = !active ? "—" : code === 0 ? "After contributions" : code === 1 ? "Deciding" : "Declined";
  const auction = !active ? "—" : code === 2 ? (c.round.phase === "bidding" ? "Open" : "Closed, settling") : "Not opened";
  return (
    <Card className="flex flex-col gap-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {c.name ? (
          <h2 className="text-[17px]">{c.name} <span className="font-normal text-muted-foreground">· Circle #{c.id}</span></h2>
        ) : (
          <h2 className="text-[17px] text-muted-foreground">Unnamed · Circle #{c.id}</h2>
        )}
        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        {c.isDemo && <DemoBadge />}
      </div>
      {!c.name && <NameCircleForm id={c.id} onSaved={onChanged} />}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-white/[0.04] p-3 sm:grid-cols-4">
        <Cell label="Members" value={`${joined} / ${c.maxMembers}`} />
        <Cell label="Round" value={c.status === 1 ? `${roundNo(c)} / ${c.maxMembers}` : "—"} />
        <Cell label="Pot" value={c.round ? (code === 0 ? `${formatMst(c.round.collected, 3)} / ${formatMst(c.round.expectedPot, 3)} MST` : `${formatMst(c.round.potForOffers, 3)} MST`) : "—"} />
        <Cell label="Contribution" value={`${formatMst(c.contribution)} MST`} />
        <Cell label="Recipient" value={recipient ?? "—"} />
        <Cell label="Recipient decision" value={decision} />
        <Cell label="Auction" value={auction} />
        <Cell label="Current lowest payout" value={code === 2 ? (hasBid && c.lowestAcceptedPayout ? `${formatMst(c.lowestAcceptedPayout, 3)} MST` : "No offers yet") : "—"} />
        <Cell label="Current discount" value={code === 2 && hasBid ? `${formatMst(c.round.bestDiscount, 3)} MST` : "—"} />
        <Cell label="Pending contributions" value={c.pendingContributions} warn={c.pendingContributions > 0} />
        <Cell label="Defaults" value={c.defaults} warn={c.defaults > 0} />
        <Cell label="Collateral total" value={`${formatMst(c.collateralTotal)} MST`} />
      </dl>
      <div className="mt-auto flex gap-2">
        <Button asChild variant="outline" className="flex-1"><Link href={`/circle/${c.id}`}><DoorOpen aria-hidden /> Open the room</Link></Button>
        <Button asChild className="flex-1"><Link href={`/organizer/circles/${c.id}`}><BarChart3 aria-hidden /> View analytics</Link></Button>
      </div>
    </Card>
  );
}
