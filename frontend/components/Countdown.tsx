"use client";

import { Loader2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  deadline: number | null;
  active: boolean;
  /** Phase text shown before the clock, e.g. "Contributions open". */
  label?: string;
  onSettle?: () => void;
  settling?: boolean;
  canSettle?: boolean;
  className?: string;
}

/** DESIGN §6.3: pill; warning under 10 s; "Settling…" at 0; after 15 s the keeper is late → anyone can settle. */
export function Countdown({ deadline, active, label, onSettle, settling, canSettle = true, className }: Props) {
  const { remaining, phase } = useCountdown(deadline, active);
  if (!active || !deadline) return null;

  if (phase === "late") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)} aria-live="polite">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[13px] font-medium text-warning">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Waiting for settlement… anyone can settle
        </span>
        {onSettle && (
          <Button size="sm" variant="outline" onClick={onSettle} disabled={settling || !canSettle}>
            {settling ? "Settling…" : "Settle round"}
          </Button>
        )}
      </div>
    );
  }

  if (phase === "settling") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium text-muted-foreground", className)} aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Settling…
      </span>
    );
  }

  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold",
        phase === "warning" ? "border-warning/40 bg-warning/10 text-warning" : "border-primary/30 bg-primary/10 text-primary",
        className
      )}
      aria-live="polite"
      aria-label={`${label ? label + ", " : ""}${remaining} seconds left`}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden />
      {label && <span className="font-medium">{label} ·</span>}
      {formatClock(remaining)}
    </span>
  );
}
