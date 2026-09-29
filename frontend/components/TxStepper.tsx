"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/components/motion/MotionPref";
import { Check, Clock, FileText, Radio, Send, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ErrorState";
import { EASE } from "@/components/motion/Reveal";
import { TxLink } from "@/components/TxLink";
import type { TxStage, TxState } from "@/hooks/useTx";
import { shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  state: TxState;
  className?: string;
  /** "Keep waiting" in the slow state: restarts the 90 s timer. */
  onKeepWaiting?: () => void;
  /** "Dismiss" in the slow state: clears the pending state; polling picks up the result. */
  onDismiss?: () => void;
  /** "Try again" after a failure (re-runs the last action). */
  onRetry?: () => void;
}

/**
 * The 5 visible steps and the TxState stages each one covers:
 * Preparing ← wallet · Wallet confirmation ← signing · Submitted ← submitted · Confirming on MST ← confirming (incl. slow) · Confirmed ← confirmed.
 * `failed` renders ErrorState instead of the rail. Nothing completes before the receipt says so.
 */
const STEPS: { key: string; label: string; stages: TxStage[]; Icon: LucideIcon }[] = [
  { key: "prepare", label: "Preparing", stages: ["wallet"], Icon: FileText },
  { key: "wallet", label: "Wallet confirmation", stages: ["signing"], Icon: Wallet },
  { key: "submitted", label: "Submitted", stages: ["submitted"], Icon: Send },
  { key: "confirming", label: "Confirming on MST", stages: ["confirming"], Icon: Radio },
  { key: "confirmed", label: "Confirmed", stages: ["confirmed"], Icon: Check },
];

export function TxStepper({ state, className, onKeepWaiting, onDismiss, onRetry }: Props) {
  const reduce = useReducedMotion();
  if (state.stage === "idle") return null;

  if (state.stage === "failed") {
    return (
      <ErrorState
        className={className}
        message={state.error ?? "The transaction failed."}
        onRetry={onRetry}
        details={state.hash ? <span>Hash {state.hash} <br /><TxLink hash={state.hash} label="View on MSTScan" className="mt-1" /></span> : undefined}
      />
    );
  }

  const idx = STEPS.findIndex((s) => s.stages.includes(state.stage));
  const slow = state.slow && state.stage !== "confirmed";
  const confirmed = state.stage === "confirmed";

  return (
    <div className={cn("rounded-2xl border border-white/[0.08] bg-surface p-3 shadow-card md:p-4", slow && "border-warning/40", confirmed && "border-success/40", className)} role="status" aria-live="polite">
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map((s, i) => {
          const done = idx > i || (confirmed && i === idx);
          const current = idx === i && !confirmed;
          return (
            <li key={s.key} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <div className="relative flex w-full items-center">
                {i > 0 && <span className={cn("h-px flex-1", idx >= i ? "bg-success/60" : "bg-white/[0.1]")} aria-hidden />}
                <span
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                    done ? "border-success/50 bg-success/15 text-success" : current ? "border-primary/60 bg-primary/15 text-primary" : "border-white/[0.1] bg-white/[0.04] text-muted-foreground/60",
                  )}
                >
                  {current && s.key === "wallet" && !reduce && (
                    <motion.span className="absolute inset-0 rounded-full border border-primary/60" animate={{ scale: [1, 1.45], opacity: [0.7, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} aria-hidden />
                  )}
                  {current && s.key === "confirming" && !reduce && (
                    <motion.span className="absolute inset-0 rounded-full border border-pot/60" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} aria-hidden />
                  )}
                  {done && s.key === "confirmed" ? (
                    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
                      <motion.path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: EASE }} />
                    </svg>
                  ) : done ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <s.Icon className="h-4 w-4" aria-hidden />
                  )}
                </span>
                {i < STEPS.length - 1 && <span className={cn("h-px flex-1", idx > i ? "bg-success/60" : "bg-white/[0.1]")} aria-hidden />}
              </div>
              <span className={cn("text-[11px] leading-tight", done ? "text-success" : current ? "font-semibold text-foreground" : "text-muted-foreground/70")}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        {state.stage === "wallet" && <span>Preparing the transaction.</span>}
        {state.stage === "signing" && <span>Open BridgeKey and confirm.</span>}
        {(state.stage === "submitted" || state.stage === "confirming") && !slow && (
          <span className="inline-flex items-center gap-1.5">
            <span className="status-dot h-2 w-2 rounded-full bg-pot" aria-hidden /> Waiting for MST testnet
          </span>
        )}
        {confirmed && <span className="font-semibold text-success">Mined on MST testnet.</span>}
        {state.hash && <span className="font-mono">{shortAddr(state.hash, 10, 6)}</span>}
        {state.hash && <TxLink hash={state.hash} label="View on MSTScan" className="text-[12px]" />}
      </div>

      {slow && state.hash && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[12px]">
          <p className="flex items-start gap-1 font-semibold text-warning">
            <Clock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> Taking longer than usual
          </p>
          <p className="text-muted-foreground">MST testnet has not confirmed this transaction in 90 s. It usually still lands; you can keep this open or check MSTScan.</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={onKeepWaiting}>Keep waiting</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={onDismiss}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}
