"use client";

import { Badge } from "@/components/ui/badge";
import { TxLink } from "@/components/TxLink";
import { big, formatMst, timeAgo } from "@/lib/format";
import type { AgentLog } from "@/lib/types";

interface Props {
  log: AgentLog;
  labelFor: (addr: string) => string;
  /** Current expected pot (wei) so the discount can be shown as an accepted payout too. */
  pot?: string | null;
}

/** Last agent decision: what it did, why, and the on-chain proof. */
export function AgentDecision({ log, labelFor, pot }: Props) {
  const discount = big(log.discount);
  const potWei = big(pot);
  const accepted = potWei > discount ? potWei - discount : null;
  return (
    <div className="mt-3 rounded-xl bg-agent/5 p-3 text-sm" aria-live="polite">
      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <span className="font-medium text-agent">Agent for {labelFor(log.member)}</span>· Round {log.round} · {timeAgo(log.ts)}
        <Badge variant="outline" className="text-[10px]">{log.source === "llm" ? "LLM" : "fallback"}</Badge>
      </div>
      <p className="mt-1">
        {log.bidThisRound ? (
          <>
            Bid placed — accepts <span className="tnum font-semibold">{accepted !== null ? `${formatMst(accepted)} MST` : "a lower payout"}</span> (discount {formatMst(discount)} MST)
          </>
        ) : (
          <>Not bidding this round</>
        )}
        {log.reason && <span className="text-muted-foreground"> — {log.reason}</span>}
      </p>
      {log.txHash && <TxLink hash={log.txHash} label="View bid on MSTScan" className="mt-1" />}
      {log.error && <p className="mt-1 text-xs text-danger">{log.error}</p>}
    </div>
  );
}
