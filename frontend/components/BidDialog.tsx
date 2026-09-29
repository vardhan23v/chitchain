"use client";

import { useState } from "react";
import { Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BalanceShortfall } from "@/components/BalanceShortfall";
import { MstcAmount } from "@/components/MstcAmount";
import { useBalanceCheck } from "@/hooks/useBalance";
import { big, formatMst, sameAddr, toWei } from "@/lib/format";
import { ZERO_ADDRESS } from "@/lib/contract";
import type { RoundInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  round: Pick<RoundInfo, "expectedPot" | "maxDiscount" | "bestDiscount" | "bestBidder">;
  /** Connected account for the gas check. */
  account: string | null;
  activeMembers: number;
  labelFor: (addr: string) => string;
  /** Receives the on-chain DISCOUNT (= pot − accepted payout); the existing actions.bid. */
  onBid: (discountWei: bigint) => Promise<unknown>;
  pending: boolean;
  disabled?: boolean;
  /** Reason the trigger is disabled, shown under it. */
  disabledReason?: string;
  triggerClassName?: string;
  triggerSize?: "default" | "sm" | "lg";
}

/**
 * "Place a bid": pot, current best discount, your discount, resulting payout, collateral note, balance check,
 * then "Confirm in wallet" which calls the existing bid action. The discount is what goes on-chain.
 */
export function BidDialog({ round, account, activeMembers, labelFor, onBid, pending, disabled, disabledReason, triggerClassName, triggerSize = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const pot = big(round.expectedPot);
  const maxDiscount = big(round.maxDiscount);
  const bestDiscount = big(round.bestDiscount);
  const hasBid = !!round.bestBidder && !sameAddr(round.bestBidder, ZERO_ADDRESS) && bestDiscount > 0n;
  // placeBid sends no value, so the check is gas only (0.01 MST reserve).
  const gasCheck = useBalanceCheck(open ? 0n : null, account);
  const short = !!gasCheck && !gasCheck.ok;

  let discount: bigint | null = null;
  try {
    discount = input ? toWei(input) : null;
  } catch {
    discount = null;
  }
  const tooHigh = discount !== null && discount > maxDiscount;
  const notBetter = discount !== null && hasBid && discount <= bestDiscount;
  const zero = discount !== null && discount <= 0n;
  const invalid = tooHigh || notBetter || zero;
  const payout = discount !== null && discount <= pot ? pot - discount : null;
  const others = Math.max(1, activeMembers - 1);
  const canSend = discount !== null && !invalid && !short && !pending;

  const hint = tooHigh
    ? `Maximum discount this round is ${formatMst(maxDiscount)} MST.`
    : notBetter
      ? `Beat the current best of ${formatMst(bestDiscount)} MST to lead.`
      : zero
        ? "Enter a discount above 0 MST."
        : "The highest discount wins the pot; the discount is shared as dividends.";

  const submit = async () => {
    if (discount === null || !canSend) return;
    setOpen(false);
    await onBid(discount);
    setInput("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} className={triggerClassName} disabled={disabled || pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Gavel aria-hidden />} Place a bid
        </Button>
      </DialogTrigger>
      {disabled && disabledReason && <p className="mt-1.5 text-[12px] text-muted-foreground">{disabledReason}</p>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Place a bid</DialogTitle>
          <DialogDescription>Offer a discount on the pot. The winner receives the pot minus their discount; the discount becomes dividends for everyone else.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <dt className="text-muted-foreground">Current pot</dt>
            <dd><MstcAmount wei={pot} size="md" className="text-pot" /></dd>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <dt className="text-muted-foreground">Current best discount</dt>
            <dd>{hasBid ? <><MstcAmount wei={bestDiscount} size="md" /> <span className="text-[12px] text-muted-foreground">by {labelFor(round.bestBidder)}</span></> : <span className="font-medium text-muted-foreground">No bids yet</span>}</dd>
          </div>
        </dl>
        <div className="space-y-2">
          <Label htmlFor="bid-discount">Your discount</Label>
          <div className="relative">
            <Input
              id="bid-discount"
              inputMode="decimal"
              autoFocus
              placeholder={hasBid ? `more than ${formatMst(bestDiscount)}` : `up to ${formatMst(maxDiscount)}`}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9.]/g, ""))}
              className={cn("tnum h-11 pr-14 text-[16px]", invalid && "border-danger focus-visible:ring-danger/30")}
              aria-describedby="bid-hint"
              aria-invalid={invalid || undefined}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground" aria-hidden>MST</span>
          </div>
          <p id="bid-hint" className={cn("text-[12px]", invalid ? "text-danger" : "text-muted-foreground")}>{hint}</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-surface2 p-3">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="text-muted-foreground">Resulting payout</span>
            <span className="tnum text-[20px] font-semibold text-foreground">{payout !== null && !invalid ? formatMst(payout) : "0.00"} <span className="text-[12px] font-medium text-muted-foreground">MST</span></span>
          </div>
          {discount !== null && !invalid && <p className="tnum mt-1 text-[12px] text-muted-foreground">About {formatMst(discount / BigInt(others))} MST dividend to each of the other {others} member{others === 1 ? "" : "s"}.</p>}
          <p className="mt-2 text-[12px] text-muted-foreground">Bidding sends no MST now. Your collateral stays locked and the payout is claimable after settlement.</p>
        </div>
        <BalanceShortfall check={gasCheck} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={!canSend}>Confirm in wallet</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
