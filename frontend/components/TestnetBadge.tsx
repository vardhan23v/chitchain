import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Subtle muted chip: "MST Testnet" with an amber flask. All amounts in the app are testnet coins with no monetary value. */
export function TestnetBadge({ className, size = "sm" }: { className?: string; size?: "xs" | "sm" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-border bg-muted/40 font-semibold text-muted-foreground",
        size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
      title="MST testnet coins, no monetary value"
    >
      <FlaskConical className={cn("text-warning", size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3")} aria-hidden />
      Testnet
    </span>
  );
}

/** Amber "DEMO MODE" chip for backend-driven demo circles. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning", className)}>
      Demo mode
    </span>
  );
}
