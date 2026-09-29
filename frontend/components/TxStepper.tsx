"use client";

import { Check, Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TX_STAGES, type TxState } from "@/hooks/useTx";
import { TxLink } from "@/components/TxLink";
import { shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  state: TxState;
  className?: string;
  /** "Keep waiting" in the slow state: restarts the 90 s timer. */
  onKeepWaiting?: () => void;
  /** "Dismiss" in the slow state: clears the pending state; polling picks up the result. */
  onDismiss?: () => void;
}

/** Inline 5-step transaction stepper: Waiting for wallet → Signing → Submitted → Confirming → Confirmed / Failed. */
export function TxStepper({ state, className, onKeepWaiting, onDismiss }: Props) {
  if (state.stage === "idle") return null;
  const idx = TX_STAGES.findIndex((s) => s.key === state.stage);
  const failed = state.stage === "failed";
  const slow = state.slow && !failed && state.stage !== "confirmed";
  return (
    <div className={cn("glass rounded-xl px-3 py-2.5 text-xs", failed && "border-danger/40", slow && "border-warning/40", className)} role="status" aria-live="polite">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {TX_STAGES.map((s, i) => {
          const done = !failed && idx > i;
          const current = !failed && idx === i;
          return (
            <li key={s.key} className={cn("flex items-center gap-1", done && "text-success", current && "font-semibold text-primary", !done && !current && "text-muted-foreground")}>
              {done ? <Check className="h-3 w-3" aria-hidden /> : current && s.key !== "confirmed" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : current ? <Check className="h-3 w-3" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" aria-hidden />}
              {s.label}
              {i < TX_STAGES.length - 1 && <span className="ml-1 text-muted-foreground/50" aria-hidden>›</span>}
            </li>
          );
        })}
      </ol>
      {failed && (
        <p className="mt-1 flex items-start gap-1 text-danger">
          <XCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {state.error ?? "The transaction failed."}
        </p>
      )}
      {slow && state.hash && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-warning/30 bg-warning/5 px-2.5 py-2">
          <p className="flex items-start gap-1 font-semibold text-warning">
            <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> Taking longer than usual
          </p>
          <p className="text-muted-foreground">
            MST testnet has not confirmed <span className="font-mono">{shortAddr(state.hash, 10, 6)}</span> in 90 s. It usually still lands; you can keep this open or check MSTScan.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={onKeepWaiting}>Keep waiting</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={onDismiss}>Dismiss</Button>
            <TxLink hash={state.hash} label="View on MSTScan" className="text-xs" />
          </div>
        </div>
      )}
      {!slow && state.hash && <TxLink hash={state.hash} label="View on MSTScan" className="mt-1 text-xs" />}
    </div>
  );
}
