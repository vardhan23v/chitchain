"use client";

import { History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionTitle } from "@/components/PageHeader";
import { TableScroll, TD, TH } from "@/components/TableScroll";
import { TxLink } from "@/components/TxLink";
import { formatMst } from "@/lib/format";
import type { RoundHistoryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  rounds: RoundHistoryRow[] | null;
  loading: boolean;
  labelFor: (addr: string) => string;
  source?: "api" | "chain";
  className?: string;
}

const NUM = cn(TD, "tnum text-right whitespace-nowrap");

function when(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Round · Winner · Pot · Payout · Discount · Dividends (total, per member) · Holdback · Settled · tx. */
export function RoundHistory({ rounds, loading, labelFor, source, className }: Props) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <SectionTitle Icon={History} className="px-4 pt-4 md:px-5" trailing={source === "chain" ? <span>from contract · no tx links</span> : undefined}>Round history</SectionTitle>
      {loading && !rounds ? (
        <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
      ) : !rounds || rounds.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground md:px-5">No rounds settled yet.</p>
      ) : (
        <TableScroll className="mt-3">
          <table className="table-data w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className={TH}>Round</th>
                <th className={TH}>Winner</th>
                <th className={cn(TH, "text-right")}>Pot</th>
                <th className={cn(TH, "text-right")}>Payout</th>
                <th className={cn(TH, "text-right")}>Discount</th>
                <th className={cn(TH, "text-right")}>Dividends</th>
                <th className={cn(TH, "text-right")}>Holdback</th>
                <th className={TH}>Settled</th>
                <th className={TH}>Tx</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.round}>
                  <td className={cn(TD, "tnum font-semibold")}>R{r.round}</td>
                  <td className={cn(TD, "font-medium")}>{r.winner ? r.winnerLabel ?? labelFor(r.winner) : <span className="text-muted-foreground">No bids, shared</span>}</td>
                  <td className={NUM}>{formatMst(r.pot)} MST</td>
                  <td className={cn(NUM, "font-semibold text-success")}>{formatMst(r.payout)} MST</td>
                  <td className={NUM}>{formatMst(r.discount)} MST</td>
                  <td className={NUM}>
                    {formatMst(r.dividendsTotal)} MST
                    <div className="text-[11px] text-muted-foreground">{formatMst(r.dividendPerMember)} each</div>
                  </td>
                  <td className={cn(NUM, "text-primary")}>{formatMst(r.holdback)} MST</td>
                  <td className={cn(TD, "whitespace-nowrap text-muted-foreground")}>{when(r.settledAt)}</td>
                  <td className={TD}>{r.txHash ? <TxLink hash={r.txHash} label="MSTScan" /> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
      <p className="px-4 pb-3 pt-2 text-[11px] text-muted-foreground md:px-5">{footnote(rounds)}</p>
    </Card>
  );
}

function footnote(rounds: RoundHistoryRow[] | null): string {
  if (!rounds?.length) return "Payout = pot − discount − fee − holdback. Dividends = discount shared by the other active members.";
  return `${rounds.length} ${rounds.length === 1 ? "round" : "rounds"} settled · Payout = pot − discount − fee − holdback · Dividends = discount ÷ (active members − 1).`;
}
