"use client";

import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TxLink } from "@/components/TxLink";
import { formatMst, shortAddr } from "@/lib/format";
import type { RoundHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  rounds: RoundHistoryRow[] | null;
  loading: boolean;
  labelFor: (addr: string) => string;
  source?: "api" | "chain";
  className?: string;
}

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const TD = "px-3 py-2 align-top tnum whitespace-nowrap";

function when(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Round · Winner · Pot · Payout · Discount · Dividends (total, per member) · Holdback · Settled · tx. */
export function RoundHistory({ rounds, loading, labelFor, source, className }: Props) {
  return (
    <Card className={cn("overflow-x-auto rounded-2xl", className)}>
      <div className="flex items-center gap-2 px-4 pt-4 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" aria-hidden /> Round history
        {source === "chain" && <span className="ml-auto text-[11px] normal-case tracking-normal">from contract · no tx links</span>}
      </div>
      {loading && !rounds ? (
        <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : !rounds || rounds.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No rounds settled yet.</p>
      ) : (
        <table className="mt-2 w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className={TH}>Round</th>
              <th className={TH}>Winner</th>
              <th className={TH}>Pot</th>
              <th className={TH}>Payout</th>
              <th className={TH}>Discount</th>
              <th className={TH}>Dividends</th>
              <th className={TH}>Holdback</th>
              <th className={TH}>Settled</th>
              <th className={TH}>Tx</th>
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.round} className="border-t">
                <td className={TD}>R{r.round}</td>
                <td className={cn(TD, "font-medium")}>{r.winner ? r.winnerLabel ?? labelFor(r.winner) : <span className="text-muted-foreground">No bids — shared</span>}</td>
                <td className={TD}>{formatMst(r.pot)} MST</td>
                <td className={cn(TD, "text-success")}>{formatMst(r.payout)} MST</td>
                <td className={TD}>{formatMst(r.discount)} MST</td>
                <td className={TD}>
                  {formatMst(r.dividendsTotal)} MST
                  <div className="text-[11px] text-muted-foreground">{formatMst(r.dividendPerMember)} each</div>
                </td>
                <td className={TD}>{formatMst(r.holdback)} MST</td>
                <td className={cn(TD, "text-muted-foreground")}>{when(r.settledAt)}</td>
                <td className={TD}>{r.txHash ? <TxLink hash={r.txHash} label="↗" /> : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="px-4 pb-3 pt-2 text-[11px] text-muted-foreground">{footnote(rounds)}</p>
    </Card>
  );
}

function footnote(rounds: RoundHistoryRow[] | null): string {
  if (!rounds?.length) return "Payout = pot − discount − fee − holdback. Dividends = discount shared by the other active members.";
  return `${rounds.length} ${rounds.length === 1 ? "round" : "rounds"} settled · Payout = pot − discount − fee − holdback · Dividends = discount ÷ (active members − 1).`;
}
