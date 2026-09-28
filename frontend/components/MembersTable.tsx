"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/Avatar";
import { ContributionChip, WonChip } from "@/components/StatusChip";
import { TableScroll, TD, TH } from "@/components/TableScroll";
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

/** Wallet · Risk · Contribution · Collateral · Status · Defaults. Zebra rows, sticky header, right-aligned numbers. Scrolls horizontally under 640 px. */
export function MembersTable({ circle, members, viewer, extras, className }: Props) {
  const active = circle.status === 1;
  return (
    <Card className={cn("overflow-hidden", className)}>
      <TableScroll>
        <table className="table-data w-full min-w-[600px] text-sm">
          <caption className="sr-only">Members of circle #{circle.id}</caption>
          <thead>
            <tr>
              <th className={TH}>Member</th>
              <th className={TH}>Risk</th>
              <th className={cn(TH, "text-right")}>This round</th>
              <th className={cn(TH, "text-right")}>Collateral</th>
              <th className={TH}>Status</th>
              <th className={cn(TH, "text-right")}>Defaults</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isYou = sameAddr(m.address, viewer);
              const used = big(m.collateralUsed);
              return (
                <tr key={m.address} className={cn(isYou && "!bg-primary/[0.06]", m.removed && "opacity-60")}>
                  <td className={TD}>
                    <div className="flex items-center gap-2.5">
                      <Avatar address={m.address} size={28} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold leading-tight">
                          <Link href={`/member/${m.address}`} className="hover:underline">{memberShort(m.label, m.address)}</Link>
                          {isYou && <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-bold text-primary-foreground">You</span>}
                        </div>
                        <div className="font-mono text-[12px] text-muted-foreground">{shortAddr(m.address)}</div>
                      </div>
                    </div>
                  </td>
                  <td className={TD}><TierChip tier={m.tier} circle={circle} short /></td>
                  <td className={cn(TD, "tnum text-right")}>{active ? (m.paidThisRound ? <span className="font-medium text-success">{formatMst(circle.contribution)} MST</span> : <span className="text-muted-foreground">0.00 MST</span>) : <span className="text-muted-foreground">—</span>}</td>
                  <td className={cn(TD, "tnum text-right")}>
                    <span className="font-medium">{formatMst(m.collateral)} MST</span>
                    {used > 0n && <div className="text-[11px] text-warning">used {formatMst(used)}</div>}
                  </td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1">
                      {m.removed ? (
                        <Badge variant="status-removed" className="uppercase tracking-wide"><XCircle className="h-3 w-3" aria-hidden />Removed</Badge>
                      ) : active ? (
                        <ContributionChip status={m.contributionStatus} />
                      ) : null}
                      {m.hasWon && <WonChip round={extras[m.address.toLowerCase()]?.wonRound} />}
                    </div>
                  </td>
                  <td className={cn(TD, "tnum text-right", m.defaults > 0 ? "font-semibold text-danger" : "text-muted-foreground")}>{m.defaults}</td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No members yet.</td></tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Card>
  );
}
