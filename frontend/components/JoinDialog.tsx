"use client";

import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BalanceShortfall } from "@/components/BalanceShortfall";
import { MstcAmount } from "@/components/MstcAmount";
import { TierChip } from "@/components/TierChip";
import { useBalanceCheck } from "@/hooks/useBalance";
import { api } from "@/lib/api";
import { formatMst } from "@/lib/format";
import type { Tier } from "@/lib/types";

interface Props {
  required: bigint | null;
  tier: Tier | null;
  contribution: string;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
  /** Circle id and connected account: used for the pre-send balance check and the "You're invited" chip. */
  circleId?: number;
  account?: string | null;
}

/** DESIGN §7: AlertDialog for join showing the exact collateral and the tier that priced it. */
export function JoinDialog({ required, tier, contribution, disabled, onConfirm, className, circleId, account }: Props) {
  const label = required !== null ? `Join and lock ${formatMst(required)} MST` : "Join the circle";
  const check = useBalanceCheck(required, account ?? null);
  const [invited, setInvited] = useState(false);

  // Invites are informational: the chip is a nudge, joining is open to any wallet. 404 (older backend) degrades silently.
  useEffect(() => {
    setInvited(false);
    if (!circleId || !account) return;
    let alive = true;
    api
      .inviteCheck(circleId, account)
      .then((r) => alive && setInvited(!!r?.invited))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [circleId, account]);

  const short = !!check && !check.ok;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" className={className} disabled={disabled || required === null}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-wrap items-center gap-2">
            Join this circle
            {invited && (
              <Badge variant="status-won" className="whitespace-nowrap font-medium">
                <MailCheck className="h-3 w-3" aria-hidden /> You&apos;re invited
              </Badge>
            )}
          </AlertDialogTitle>
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
              <BalanceShortfall check={check} />
              {invited && <p className="text-xs text-muted-foreground">Invites are a nudge only; anyone can join an open circle from their wallet.</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={short}>Join and lock {formatMst(required ?? 0n)} MST</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
