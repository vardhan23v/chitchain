"use client";

import Link from "next/link";
import { Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TierChip } from "@/components/TierChip";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import { preWinRequired } from "@/lib/chain";
import { big, formatMst } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/labels";
import type { MyCircle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  c: MyCircle;
  onWithdraw: (circleId: number) => void;
  pending: boolean;
}

/** Locked · used · holdback · claimable · required by tier, with Withdraw when claimable > 0. */
export function CollateralRow({ c, onWithdraw, pending }: Props) {
  const me = c.me;
  const locked = big(me.collateral);
  const used = big(me.collateralUsed);
  const required = big(me.requiredCollateral) || preWinRequired(c.baseCollateral, me.tier, c);
  const holdback = locked > required ? locked - required : 0n;
  const claimable = big(me.claimable);
  const activeish = c.status <= 1;
  const cells: [string, string, string?][] = [
    ["Locked collateral", `${formatMst(locked)} MST`],
    ["Used to cover misses", `${formatMst(used)} MST`, used > 0n ? "text-warning" : undefined],
    ["Holdback", `${formatMst(holdback)} MST`, holdback > 0n ? "text-primary" : undefined],
    ["Claimable now", `${formatMst(claimable)} MST`, claimable > 0n ? "text-success" : undefined],
    ["Required by tier", `${formatMst(required)} MST`],
  ];

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/circle/${c.id}`} className="font-semibold hover:underline">Circle #{c.id}</Link>
        <Badge variant={c.status === 1 ? "default" : c.status === 0 ? "pot" : c.status === 2 ? "status-paid" : "status-removed"}>{STATUS_LABEL[c.status]}</Badge>
        <TierChip tier={me.tier} circle={c} short />
        {me.removed && <Badge variant="status-removed"><XCircle className="h-3 w-3" aria-hidden />Removed</Badge>}
        {me.hasWon && <Badge variant="status-won"><Trophy className="h-3 w-3" aria-hidden />Won</Badge>}
        <div className="ml-auto">
          {claimable > 0n ? (
            <WithdrawDialog claimable={me.claimable} onConfirm={() => onWithdraw(c.id)} disabled={pending} variant="outline" className="h-9" />
          ) : (
            <span className="text-xs text-muted-foreground">{activeish ? "Locked while active" : "Nothing to withdraw"}</span>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-white/[0.04] p-3 text-sm sm:grid-cols-5">
        {cells.map(([k, v, cls]) => (
          <div key={k}>
            <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
            <dd className={cn("tnum font-semibold", cls)}>{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
