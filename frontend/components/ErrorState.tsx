"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  title?: ReactNode;
  /** Plain-English message (never a raw revert string). */
  message: ReactNode;
  /** Extra detail behind "View details" (hash, raw code, hint). */
  details?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Failure surface for transactions and loads: icon, message, "Try again" and a collapsible detail block. */
export function ErrorState({ title = "The transaction did not go through", message, details, onRetry, retryLabel = "Try again", className }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-2xl border border-danger/30 bg-danger/[0.06] p-4", className)} role="alert">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger" aria-hidden><AlertTriangle className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight text-foreground">{title}</p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{message}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {onRetry && <Button size="sm" onClick={onRetry}>{retryLabel}</Button>}
            {details && (
              <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                View details <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />
              </Button>
            )}
          </div>
          {open && details && <div className="mt-3 rounded-xl border border-white/[0.08] bg-surface2 p-3 font-mono text-[12px] leading-relaxed text-muted-foreground break-all">{details}</div>}
        </div>
      </div>
    </div>
  );
}
