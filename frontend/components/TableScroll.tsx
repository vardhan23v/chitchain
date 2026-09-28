import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a wide table: horizontal scroll with a visible right edge fade under `md`.
 * Add `table-data` to the <table> for zebra rows + sticky header.
 */
export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("edge-fade -mx-px overflow-x-auto overscroll-x-contain", className)}>
      {children}
    </div>
  );
}

export const TH = "px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap";
export const TD = "px-3 py-2.5 align-middle";
export const NUM = "tnum text-right whitespace-nowrap";
