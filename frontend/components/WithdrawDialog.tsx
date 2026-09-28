"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MstcAmount } from "@/components/MstcAmount";
import { formatMst } from "@/lib/format";

interface Props {
  claimable: string;
  disabled?: boolean;
  onConfirm: () => void;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  label?: string;
}

export function WithdrawDialog({ claimable, disabled, onConfirm, className, variant = "default", label }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" variant={variant} className={className} disabled={disabled}>{label ?? `Withdraw ${formatMst(claimable)} MST`}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw to your wallet</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>Your claimable balance (payouts, dividends and refunds) is pulled from the contract to your wallet.</p>
              <MstcAmount wei={claimable} size="lg" className="text-success" />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Withdraw {formatMst(claimable)} MST</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
