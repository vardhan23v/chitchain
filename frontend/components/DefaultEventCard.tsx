"use client";

import { ShieldAlert, ShieldHalf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DefaultStatusChip } from "@/components/StatusChip";
import { TxLink } from "@/components/TxLink";
import { big, formatMst, shortAddr, timeAgo } from "@/lib/format";
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
 * Never claims full protection when shortfall > 0.
 */
export function DefaultEventCard({ d, compact, className }: Props) {
  const shortfall = big(d.shortfall);
  const partial = d.status === "PARTIALLY_COVERED" || shortfall > 0n;
  const Icon = partial ? ShieldAlert : ShieldHalf;
  const rows: [string, string, string?][] = [
    ["Required", `${formatMst(d.required)} MST`],
    ["Collateral used", `${formatMst(d.fromCollateral)} MST`],
    ["From reserve", `${formatMst(d.fromReserve)} MST`],
    ["Remaining collateral", `${formatMst(d.remainingCollateral)} MST`],
    ["Shortfall", `${formatMst(shortfall)} MST`, shortfall > 0n ? "text-danger font-semibold" : undefined],
  ];

  return (
    <Card className={cn("rounded-2xl p-4", partial ? "border-danger/40 bg-danger/5" : "border-warning/40 bg-warning/5", className)}>
      <div className="flex flex-wrap items-start gap-2">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", partial ? "text-danger" : "text-warning")} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">
            {memberLabel(d.label, d.member)} missed the Round {d.round} contribution.
          </h3>
          <p className="text-xs text-muted-foreground">{timeAgo(d.ts)} · {shortAddr(d.member)}</p>
        </div>
        <DefaultStatusChip status={partial ? "PARTIALLY_COVERED" : "COVERED_BY_COLLATERAL"} />
      </div>
      {!compact && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          {rows.map(([k, v, cls]) => (
            <div key={k} className="flex justify-between gap-2 sm:block">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className={cn("tnum", cls)}>{v}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-xs text-muted-foreground">Pot</dt>
            <dd className={cn("text-xs font-bold uppercase tracking-wide", d.potFullyFunded && shortfall === 0n ? "text-success" : "text-danger")}>
              {d.potFullyFunded && shortfall === 0n ? "Fully funded" : `Short by ${formatMst(shortfall)} MST`}
            </dd>
          </div>
        </dl>
      )}
      {compact && (
        <p className={cn("mt-2 text-xs", partial ? "text-danger" : "text-muted-foreground")}>
          {partial ? `Partially covered — shortfall ${formatMst(shortfall)} MST` : `Collateral covered ${formatMst(d.fromCollateral)} MST`}
        </p>
      )}
      <div className="mt-2">
        <TxLink hash={d.txHash} label="View on MSTScan" />
      </div>
    </Card>
  );
}
