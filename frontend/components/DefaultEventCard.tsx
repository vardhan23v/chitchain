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
          <h3 className="text-[15px] font-semibold leading-snug">
            {memberLabel(d.label, d.member)} missed the Round {d.round} contribution.
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
            <span>{partial ? `Partially covered, shortfall ${formatMst(shortfall)} MST.` : `Collateral covered ${formatMst(d.fromCollateral)} MST.`}</span>
            <span className="tnum">{timeAgo(d.ts)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">{shortAddr(d.member)}</span>
            <span aria-hidden>·</span>
            <TxLink hash={d.txHash} label="MSTScan" className="text-[13px]" />
          </p>
        </div>
        <DefaultStatusChip status={partial ? "PARTIALLY_COVERED" : "COVERED_BY_COLLATERAL"} />
      </div>
      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {rows.map(([k, v, cls]) => (
            <div key={k} className="bg-white/[0.04] px-3 py-2">
              <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
              <dd className={cn("tnum text-sm font-semibold", cls)}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
