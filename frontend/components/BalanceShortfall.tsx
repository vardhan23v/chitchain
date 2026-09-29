"use client";

import { AlertTriangle } from "lucide-react";
import type { BalanceCheck } from "@/lib/wallet";
import { FAUCET_URL } from "@/lib/chain";
import { formatMst } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Inline "not enough MST" notice (audit 1.8) with the faucet link. Renders nothing when the check passed or is unknown. */
export function BalanceShortfall({ check, className }: { check: BalanceCheck | null; className?: string }) {
  if (!check || check.ok) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs text-danger", className)} role="alert">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        You need about {formatMst(check.shortfall, 4)} MST more ({formatMst(check.required, 4)} required, {formatMst(check.balance, 4)} available). Get testnet MST from the{" "}
        <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">faucet</a>.
      </span>
    </p>
  );
}
