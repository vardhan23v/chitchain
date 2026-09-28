"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TxLink } from "@/components/TxLink";
import type { AgentEvent, BidAgent } from "@/lib/types";

interface Props {
  agent: BidAgent;
  /** Latest TX_FAILED event when there is one. */
  event: AgentEvent | null;
  busy?: boolean;
  onReview: () => void;
  onResume?: () => void;
}

/** "Transaction failed" with the decoded revert and a way back into the log. */
export function FailureCard({ agent, event, busy, onReview, onResume }: Props) {
  const paused = agent.status === "PAUSED";
  const title = event ? "Transaction failed" : paused ? "Agent paused" : "Something needs your attention";
  const reason = event?.reason ?? agent.statusReason ?? event?.text ?? "The last transaction did not go through.";
  return (
    <div className="rounded-2xl border border-danger/25 bg-danger/[0.05] p-4" role="alert">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger" aria-hidden><AlertTriangle className="h-4 w-4" /></span>
        <p className="text-[15px] font-semibold leading-tight">{title}</p>
        {agent.failures > 0 && <span className="ml-auto tnum text-[12px] text-muted-foreground">{agent.failures} {agent.failures === 1 ? "failure" : "failures"}</span>}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{reason}</p>
      {event?.data?.txHash && <TxLink hash={event.data.txHash} label="View on MSTScan" className="mt-1.5 text-[12px]" />}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onReview}>Review</Button>
        {paused && onResume && (
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={onResume} disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />} Resume
          </Button>
        )}
      </div>
    </div>
  );
}
