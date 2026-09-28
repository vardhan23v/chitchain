"use client";

import { Coins, Gavel, Loader2, Timer, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock } from "@/lib/format";
import type { RoundPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  deadline: number | null;
  active: boolean;
  /** Phase text shown before the clock, e.g. "Contributions open". */
  label?: string;
  /** Colours the pill: contribution = primary, bidding = pot, settling = warning. */
  tone?: RoundPhase;
  onSettle?: () => void;
  settling?: boolean;
  canSettle?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const TONE: Record<RoundPhase, { cls: string; Icon: LucideIcon }> = {
  contribution: { cls: "border-primary/30 bg-primary/10 text-primary", Icon: Coins },
  bidding: { cls: "border-pot/40 bg-pot/10 text-pot", Icon: Gavel },
  settling: { cls: "border-warning/40 bg-warning/10 text-warning", Icon: Timer },
};

/** DESIGN §6.3: phase pill with countdown; warning under 10 s; "Settling…" at 0; after 15 s the keeper is late → anyone can settle. */
export function Countdown({ deadline, active, label, tone = "contribution", onSettle, settling, canSettle = true, size = "md", className }: Props) {
  const { remaining, phase } = useCountdown(deadline, active);
  if (!active || !deadline) return null;
  const base = cn("inline-flex items-center gap-1.5 rounded-full border font-semibold", size === "md" ? "px-3 py-1.5 text-[13px]" : "px-2.5 py-1 text-xs");

  if (phase === "late") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)} aria-live="polite">
        <span className={cn(base, TONE.settling.cls)}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Waiting for settlement · anyone can settle
        </span>
        {onSettle && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={onSettle} disabled={settling || !canSettle}>
            {settling ? "Settling…" : "Settle round"}
          </Button>
        )}
      </div>
    );
  }

  if (phase === "settling") {
    return (
      <span className={cn(base, TONE.settling.cls, className)} aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Settling…
      </span>
    );
  }

  const t = phase === "warning" ? TONE.settling : TONE[tone];
  return (
    <span className={cn("tnum", base, t.cls, className)} aria-live="polite" aria-label={`${label ? label + ", " : ""}${remaining} seconds left`}>
      <t.Icon className="h-3.5 w-3.5" aria-hidden />
      {label && <span className="font-medium">{label}</span>}
      {label && <span className="opacity-50" aria-hidden>·</span>}
      {formatClock(remaining)}
    </span>
  );
}
