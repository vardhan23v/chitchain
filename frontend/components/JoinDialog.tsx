"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MstcAmount } from "@/components/MstcAmount";
import { TierChip } from "@/components/TierChip";
import { formatMst } from "@/lib/format";
import type { Tier } from "@/lib/types";

interface Props {
  required: bigint | null;
  tier: Tier | null;
  contribution: string;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
}

/** DESIGN §7: AlertDialog for join showing the exact collateral and the tier that priced it. */
export function JoinDialog({ required, tier, contribution, disabled, onConfirm, className }: Props) {
  const label = required !== null ? `Join and lock ${formatMst(required)} MST` : "Join the circle";
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" className={className} disabled={disabled || required === null}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Join this circle</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>The contract will lock your collateral now. It covers any round you miss and is returned when the circle completes.</p>
              <div className="rounded-xl border border-white/60 bg-white/40 p-3">
                <div className="text-xs text-muted-foreground">Collateral to lock</div>
                <MstcAmount wei={required ?? 0n} size="lg" className="text-primary" />
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  Priced by your risk tier {tier !== null && <TierChip tier={tier} />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Then every round you contribute {formatMst(contribution)} MST. All funds sit in the contract, not in anyone&apos;s account.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Join and lock {formatMst(required ?? 0n)} MST</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
