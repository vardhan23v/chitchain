"use client";

import { ExternalLink, ShieldAlert, ShieldHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DefaultStatusChip } from "@/components/StatusChip";
import { big, formatMst, shortAddr, timeAgo, txUrl } from "@/lib/format";
import { memberLabel } from "@/lib/labels";
import type { DefaultRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  d: DefaultRecord;
  compact?: boolean;
  className?: string;
}

/**
 * "Member D missed the Round 2 contribution." with the exact money movement.
 * Strong but calm: warning tint, key/value grid, MSTScan button. Never claims full protection when shortfall > 0.
 */
export function DefaultEventCard({ d, compact, className }: Props) {
  const shortfall = big(d.shortfall);
  const partial = d.status === "PARTIALLY_COVERED" || shortfall > 0n;
  const Icon = partial ? ShieldAlert : ShieldHalf;
  const rows: [string, string, string?][] = [
    ["Required", `${formatMst(d.required)} MST`],
    ["From collateral", `${formatMst(d.fromCollateral)} MST`, "text-warning"],
    ["From reserve", `${formatMst(d.fromReserve)} MST`],
    ["Collateral left", `${formatMst(d.remainingCollateral)} MST`],
    ["Shortfall", `${formatMst(shortfall)} MST`, shortfall > 0n ? "text-danger" : "text-success"],
    ["Pot", d.potFullyFunded && shortfall === 0n ? "Fully funded" : `Short by ${formatMst(shortfall)}`, d.potFullyFunded && shortfall === 0n ? "text-success" : "text-danger"],
  ];

  return (
    <Card className={cn("p-4 md:p-5", partial ? "border-danger/30 bg-danger/[0.04]" : "border-warning/30 bg-warning/[0.05]", className)}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", partial ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")} aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug">
            {memberLabel(d.label, d.member)} missed the Round {d.round} contribution.
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {partial ? `Partially covered — shortfall ${formatMst(shortfall)} MST` : `Collateral covered ${formatMst(d.fromCollateral)} MST`} · {timeAgo(d.ts)} · <span className="font-mono">{shortAddr(d.member)}</span>
          </p>
        </div>
        <DefaultStatusChip status={partial ? "PARTIALLY_COVERED" : "COVERED_BY_COLLATERAL"} />
      </div>
      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {rows.map(([k, v, cls]) => (
            <div key={k} className="bg-card px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className={cn("tnum text-sm font-semibold", cls)}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3">
        <Button asChild size="sm" variant="outline" className="rounded-full border-chain/30 text-chain hover:bg-chain/10 hover:text-chain">
          <a href={txUrl(d.txHash)} target="_blank" rel="noopener noreferrer" aria-label={`View transaction ${d.txHash} on MSTScan`}>View on MSTScan <ExternalLink aria-hidden /></a>
        </Button>
      </div>
    </Card>
  );
}
