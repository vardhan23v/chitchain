"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { MstcAmount } from "@/components/MstcAmount";
import { TxLink } from "@/components/TxLink";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import type { LabelMap } from "@/components/FeedItem";
import { formatMst, shortAddr } from "@/lib/format";
import type { CircleSummary, FeedEvent, MemberInfo } from "@/lib/types";

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
export function RoomBanners({ circle, me, members, events, labels, onWithdraw, pending }: Props) {
  const claimable = BigInt(me?.claimable ?? "0");
  if (circle.status === 3) {
    return (
      <Card className="flex flex-wrap items-center gap-3 border-danger/30 bg-danger/5 p-4">
        <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
        <span className="font-medium">Didn&apos;t fill in time, withdraw your collateral</span>
        {claimable > 0n && <WithdrawDialog claimable={me!.claimable} onConfirm={onWithdraw} disabled={pending} className="ml-auto" />}
      </Card>
    );
  }
  if (circle.status !== 2) return null;

  const settled = events.filter((e) => e.name === "RoundSettled").sort((a, b) => Number(a.args.round ?? a.round) - Number(b.args.round ?? b.round));
  const dividends = events.filter((e) => e.name === "DividendCredited").reduce<Record<string, bigint>>((acc, e) => {
    const k = String(e.args.member).toLowerCase();
    acc[k] = (acc[k] ?? 0n) + BigInt(String(e.args.amount ?? "0"));
    return acc;
  }, {});
  const totalFees = settled.reduce((s, e) => s + BigInt(String(e.args.fee ?? "0")), 0n);

  return (
    <Card className="border-success/30 bg-success/5 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
        <h2 className="text-base">Circle completed</h2>
        <span className="text-xs text-muted-foreground">· every payout is pull-only and verifiable</span>
        {claimable > 0n && <WithdrawDialog claimable={me!.claimable} onConfirm={onWithdraw} disabled={pending} className="ml-auto" label={`Withdraw all · ${formatMst(me!.claimable)} MST`} />}
      </div>
      {settled.length > 0 ? (
        <RevealGroup as="ul" mode="load" className="mt-3 divide-y text-sm">
          {settled.map((e) => (
            <RevealItem as="li" key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-1.5">
              <span className="tnum w-16 text-muted-foreground">Round {String(e.args.round ?? e.round)}</span>
              <span className="font-medium">{who(labels, e.args.winner)}</span>
              <span className="tnum">payout <span className="font-semibold text-success">{formatMst(String(e.args.payout ?? "0"))}</span></span>
              <span className="tnum text-muted-foreground">discount {formatMst(String(e.args.discount ?? "0"))}</span>
              <TxLink hash={e.txHash} label="MSTScan" className="ml-auto text-xs" />
            </RevealItem>
          ))}
        </RevealGroup>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Winners: {members.filter((m) => m.hasWon).map((m) => m.label ?? shortAddr(m.address)).join(", ") || "—"}. Round-by-round detail needs the backend feed.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-success/20 pt-3 text-[13px] text-muted-foreground">
        {Object.keys(dividends).length > 0 && (
          <span>Dividends: {Object.entries(dividends).map(([k, v]) => `${labels[k] ?? shortAddr(k)} ${formatMst(v)}`).join(" · ")}</span>
        )}
        <span className="tnum">Fees collected {formatMst(totalFees)} MST → reserve → treasury</span>
        <span>Reserve now <MstcAmount wei={circle.reserve} size="sm" /></span>
      </div>
    </Card>
  );
}
