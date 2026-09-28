"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContributionChip, WonChip } from "@/components/StatusChip";
import { TierChip } from "@/components/TierChip";
import type { MemberExtra } from "@/components/MemberCard";
import { big, formatMst, sameAddr, shortAddr } from "@/lib/format";
import { memberShort } from "@/lib/labels";
import type { CircleSummary, MemberInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  circle: CircleSummary;
  members: MemberInfo[];
  viewer: string | null;
  extras: Record<string, MemberExtra>;
  className?: string;
}

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const TD = "px-3 py-2 align-middle";

/** Wallet · Risk · Contribution this round · Collateral · Status · Defaults. Horizontal scroll under 640 px. */
export function MembersTable({ circle, members, viewer, extras, className }: Props) {
  const active = circle.status === 1;
  return (
    <Card className={cn("overflow-x-auto rounded-2xl", className)}>
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Members of circle #{circle.id}</caption>
        <thead className="bg-muted/50">
          <tr>
            <th className={TH}>Wallet</th>
            <th className={TH}>Risk</th>
            <th className={TH}>Contribution this round</th>
            <th className={TH}>Collateral</th>
            <th className={TH}>Status</th>
            <th className={cn(TH, "text-right")}>Defaults</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const isYou = sameAddr(m.address, viewer);
            const used = big(m.collateralUsed);
            return (
              <tr key={m.address} className={cn("border-t", isYou && "bg-primary/5", m.removed && "opacity-60")}>
                <td className={TD}>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Link href={`/member/${m.address}`} className="hover:underline">{memberShort(m.label, m.address)}</Link>
                    {isYou && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">You</span>}
                  </div>
                  <div className="font-mono text-[12px] text-muted-foreground">{shortAddr(m.address)}</div>
                </td>
                <td className={TD}><TierChip tier={m.tier} circle={circle} short /></td>
                <td className={cn(TD, "tnum")}>{active ? `${m.paidThisRound ? formatMst(circle.contribution) : "0"} MST` : "—"}</td>
                <td className={cn(TD, "tnum")}>
                  {formatMst(m.collateral)} MST
                  {used > 0n && <div className="text-[11px] text-muted-foreground">used {formatMst(used)}</div>}
                </td>
                <td className={TD}>
                  <div className="flex flex-wrap gap-1">
                    {m.removed ? (
                      <Badge variant="status-removed"><XCircle className="h-3 w-3" aria-hidden />Removed</Badge>
                    ) : active ? (
                      <ContributionChip status={m.contributionStatus} />
                    ) : null}
                    {m.hasWon && <WonChip round={extras[m.address.toLowerCase()]?.wonRound} />}
                  </div>
                </td>
                <td className={cn(TD, "tnum text-right", m.defaults > 0 && "font-semibold text-danger")}>{m.defaults}</td>
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No members yet.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
