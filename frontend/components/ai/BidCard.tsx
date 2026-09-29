"use client";

import { Gavel } from "lucide-react";
import { RiskPassedChip } from "@/components/ai/AiStatusPill";
import { payoutFor } from "@/components/ai/strategy";
import { TxLink } from "@/components/TxLink";
import { formatMst } from "@/lib/format";
import type { AgentEvent, BidAgent } from "@/lib/types";

interface Props {
  /** The latest TX_CONFIRMED (or TX_SUBMITTED) event. */
  event: AgentEvent;
  agent: BidAgent;
  /** Expected pot (wei) so the payout can be derived when the event omits it. */
  pot: string | null;
}

/** "AI bid submitted": what was bid, why, the cap, risk guard, tx hash, status. */
export function BidCard({ event, agent, pot }: Props) {
  const discount = event.data?.discount ?? agent.lastBid ?? null;
  const payout = event.data?.payout ?? (payoutFor(pot, discount)?.toString() ?? null);
  const tx = event.data?.txHash ?? agent.lastTxHash ?? null;
  const confirmed = event.kind === "TX_CONFIRMED";
  const reason = event.reason ?? agent.lastReason ?? null;
  return (
    <div className="rounded-2xl border border-success/30 bg-success/[0.07] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/10 text-success" aria-hidden><Gavel className="h-4 w-4" /></span>
        <p className="text-[15px] font-semibold leading-tight">{confirmed ? "AI bid confirmed" : "AI bid submitted"}</p>
        <RiskPassedChip />
        <span className="ml-auto text-[12px] font-semibold text-chain">On-chain transaction</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <Item k="Bid (discount)" v={discount ? `${formatMst(discount)} MST` : "unknown"} />
        <Item k="Payout you accept" v={payout ? `${formatMst(payout)} MST` : "unknown"} />
        <Item k="Maximum allowed" v={`${formatMst(agent.maxDiscount)} MST (${agent.maxDiscountPct}%)`} />
        <Item k="Confirmed in" v={event.data?.block ? `Block ${event.data.block}` : "Pending"} />
      </dl>
      {reason && <p className="mt-2 text-[13px] text-muted-foreground">{reason}</p>}
      {tx && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[12px] text-muted-foreground break-all">{tx}</span>
          <TxLink hash={tx} label="View on MSTScan" className="text-[12px]" />
        </div>
      )}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{k}</dt>
      <dd className="tnum truncate font-medium">{v}</dd>
    </div>
  );
}
