"use client";

import { Check, Loader2, XCircle } from "lucide-react";
import { TX_STAGES, type TxState } from "@/hooks/useTx";
import { TxLink } from "@/components/TxLink";
import { cn } from "@/lib/utils";

/** Inline 5-step transaction stepper: Waiting for wallet → Signing → Submitted → Confirming → Confirmed / Failed. */
export function TxStepper({ state, className }: { state: TxState; className?: string }) {
  if (state.stage === "idle") return null;
  const idx = TX_STAGES.findIndex((s) => s.key === state.stage);
  const failed = state.stage === "failed";
  return (
    <div className={cn("glass rounded-xl px-3 py-2.5 text-xs", failed && "border-danger/40", className)} role="status" aria-live="polite">
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
          <XCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> Failed: {state.error ?? "Transaction failed"}
        </p>
      )}
      {state.hash && <TxLink hash={state.hash} label="View on MSTScan" className="mt-1 text-xs" />}
    </div>
  );
}
