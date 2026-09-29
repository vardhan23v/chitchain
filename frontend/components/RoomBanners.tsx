"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { MstcAmount } from "@/components/MstcAmount";
import { TxLink } from "@/components/TxLink";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import type { LabelMap } from "@/components/FeedItem";
import { useRoundHistory } from "@/hooks/useRoundHistory";
import { formatMst, shortAddr } from "@/lib/format";
import { OUTCOME_LABEL } from "@/lib/labels";
import type { CircleSummary, FeedEvent, MemberInfo, RoundHistoryRow } from "@/lib/types";

interface Props {
  circle: CircleSummary;
  me: MemberInfo | null;
  members: MemberInfo[];
  events: FeedEvent[];
  labels: LabelMap;
  onWithdraw: () => void;
  pending: boolean;
}

const who = (labels: LabelMap, a: unknown) => labels[String(a).toLowerCase()] ?? shortAddr(String(a));

/** DESIGN §12: Cancelled banner and Completed summary. */
export function RoomBanners({ circle, me, members, labels, onWithdraw, pending }: Props) {
  const claimable = BigInt(me?.claimable ?? "0");
  const history = useRoundHistory(circle.id, circle.status === 2);
  if (circle.status === 3) {
    return (
      <Card className="flex flex-wrap items-center gap-3 border-danger/30 bg-danger/5 p-4">
        <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
        <span className="font-medium">This circle didn&apos;t fill in time. Withdraw your collateral.</span>
        {claimable > 0n && <WithdrawDialog claimable={me!.claimable} onConfirm={onWithdraw} disabled={pending} className="ml-auto" />}
      </Card>
    );
  }
  if (circle.status !== 2) return null;

  // Round-by-round from the contract's round records (the live feed is paged and may not hold every round).
  const settled = history.data?.rounds ?? [];
  const sharedTotal = settled.reduce((t, r) => t + BigInt(r.dividendsTotal), 0n);
  const totalFees = settled.reduce((t, r) => t + BigInt(r.fee), 0n);
  const nameFor = (r: RoundHistoryRow) => (r.winner ? r.winnerName ?? who(labels, r.winner) : null);

  return (
    <Card className="border-success/30 bg-success/5 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
        <h2 className="text-[17px]">Circle completed</h2>
        <span className="text-[13px] text-muted-foreground">Every payout is pull-only and verifiable.</span>
        {claimable > 0n && <WithdrawDialog claimable={me!.claimable} onConfirm={onWithdraw} disabled={pending} className="ml-auto" label={`Withdraw ${formatMst(me!.claimable)} MST`} />}
      </div>
      {settled.length > 0 ? (
        <RevealGroup as="ul" mode="load" className="mt-3 divide-y text-sm">
          {settled.map((r) => (
            <RevealItem as="li" key={r.round} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
              <span className="tnum w-16 text-muted-foreground">Round {r.round}</span>
              {!r.winner ? (
                <span className="text-muted-foreground">No one left to receive it, pot shared as dividends</span>
              ) : (
                <>
                  <span className="font-medium">{nameFor(r)}</span>
                  <span className="text-muted-foreground">{OUTCOME_LABEL[r.outcome ?? "NONE"]}</span>
                  <span className="tnum">received <span className="font-semibold text-success">{formatMst(BigInt(r.payout) + BigInt(r.holdback), 4)}</span></span>
                  {BigInt(r.discount) > 0n && <span className="tnum text-muted-foreground">discount {formatMst(r.discount, 4)} shared, {formatMst(r.dividendPerMember, 4)} each</span>}
                </>
              )}
              {r.txHash && <TxLink hash={r.txHash} label="MSTScan" className="ml-auto text-xs" />}
            </RevealItem>
          ))}
        </RevealGroup>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Winners: {members.filter((m) => m.hasWon).map((m) => m.username ?? m.label ?? shortAddr(m.address)).join(", ") || "—"}. Round-by-round detail is temporarily unavailable.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-success/20 pt-3 text-[13px] text-muted-foreground">
        <span className="tnum">Discounts shared as dividends {formatMst(sharedTotal, 4)} MST</span>
        <span className="tnum">Fees collected {formatMst(totalFees, 4)} MST, kept in the reserve and sent to the treasury at the end</span>
        <span>Reserve now <MstcAmount wei={circle.reserve} size="sm" /></span>
      </div>
    </Card>
  );
}
