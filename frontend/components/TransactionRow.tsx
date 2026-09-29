"use client";

import Link from "next/link";
import { TransactionStatus, type TxRowStatus } from "@/components/TransactionStatus";
import { eventAmount, renderFeedEvent, type LabelMap } from "@/components/FeedItem";
import { TxLink } from "@/components/TxLink";
import { formatMst, shortAddr, timeAgo } from "@/lib/format";
import type { FeedEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export type TxType = "contribution" | "bid" | "settlement" | "withdrawal" | "other";

const TYPE_LABEL: Record<TxType, string> = { contribution: "Contribution", bid: "Bid", settlement: "Settlement", withdrawal: "Withdrawal", other: "Event" };

/** Client-side bucket for the activity tabs, keyed on the indexed event name. */
export function txType(e: FeedEvent): TxType {
  switch (e.name) {
    case "Contributed":
    case "DefaultDetected":
    case "Covered":
      return "contribution";
    case "BidPlaced":
      return "bid";
    case "RoundSettled":
    case "DividendCredited":
    case "HoldbackApplied":
      return "settlement";
    case "Withdrawn":
    case "Left":
      return "withdrawal";
    default:
      return "other";
  }
}

/** Human type label for a bucket. */
export const txTypeLabel = (t: TxType) => TYPE_LABEL[t];

interface Props {
  e: FeedEvent;
  labels?: LabelMap;
  now?: number;
  /** Indexed rows are confirmed; pass a live status for an in-flight tx. */
  status?: TxRowStatus;
  /** Table row (desktop) or compact card (mobile). */
  layout?: "row" | "card";
  className?: string;
}

const CELL = "px-3 py-2.5 align-middle";

function actor(e: FeedEvent): string {
  const a = e.args ?? {};
  const v = a.member ?? a.winner ?? a.creator;
  return v ? String(v) : "";
}

/** One transaction: icon, type + description, amount MST, round, status, time, wallet short, hash short. */
export function TransactionRow({ e, labels = {}, now = Date.now(), status = "confirmed", layout = "row", className }: Props) {
  const r = renderFeedEvent(e, labels);
  const amt = eventAmount(e);
  const type = txType(e);
  const who = actor(e);
  const round = e.round ?? (e.args?.round !== undefined ? Number(e.args.round) : null);
  const icon = (
    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", r.color)} style={{ background: "color-mix(in srgb, currentColor 14%, transparent)" }} aria-hidden>
      <r.Icon className="h-4 w-4" />
    </span>
  );

  if (layout === "card") {
    return (
      <li className={cn("flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-surface p-3 shadow-card", className)}>
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-muted-foreground">{TYPE_LABEL[type]}</span>
            <TransactionStatus status={status} className="ml-auto" />
          </div>
          <p className="mt-0.5 text-[14px] leading-snug">{r.text}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            {amt !== null && <span className="tnum font-semibold text-foreground">{formatMst(amt)} MST</span>}
            {round !== null && round > 0 && <span className="tnum">Round {round}</span>}
            {e.circleId && <Link href={`/circle/${e.circleId}`} className="text-primary hover:underline">Circle #{e.circleId}</Link>}
            <span className="tnum">{timeAgo(e.ts, now)}</span>
            <TxLink hash={e.txHash} className="text-[12px]" />
          </div>
        </div>
      </li>
    );
  }

  return (
    <tr className={cn("border-t border-white/[0.06] text-[14px] transition-colors hover:bg-white/[0.03]", className)}>
      <td className={CELL}>
        <span className="flex items-center gap-2.5">
          {icon}
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-muted-foreground">{TYPE_LABEL[type]}</span>
            <span className="block truncate">{r.text}</span>
          </span>
        </span>
      </td>
      <td className={cn(CELL, "tnum whitespace-nowrap text-right font-semibold")}>{amt !== null ? <>{formatMst(amt)} <span className="text-[12px] font-medium text-muted-foreground">MST</span></> : <span className="text-muted-foreground">No amount</span>}</td>
      <td className={cn(CELL, "tnum whitespace-nowrap text-muted-foreground")}>{e.circleId ? <Link href={`/circle/${e.circleId}`} className="text-primary hover:underline">#{e.circleId}</Link> : null}{round !== null && round > 0 ? <span className="ml-1">R{round}</span> : null}</td>
      <td className={CELL}><TransactionStatus status={status} /></td>
      <td className={cn(CELL, "tnum whitespace-nowrap text-muted-foreground")}>{timeAgo(e.ts, now)}</td>
      <td className={cn(CELL, "whitespace-nowrap font-mono text-[12px] text-muted-foreground")}>{who ? labels[who.toLowerCase()] ?? shortAddr(who) : null}</td>
      <td className={cn(CELL, "whitespace-nowrap")}><TxLink hash={e.txHash} className="text-[12px]" /></td>
    </tr>
  );
}
