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
  round: Pick<RoundInfo, "potForOffers" | "maxDiscount" | "bestDiscount" | "bestBidder">;
  /** circle fee in bps (taken from the pot at settlement) */
  feeBps?: number;
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
 * "Place a bid": the member enters their PAYOUT OFFER (how much of the pot they will accept). The lowest offer wins.
 * The contract stores the discount (pot − offer), which is shared as dividends. Shows pot, current lowest payout,
 * current discount, the resulting discount and dividend, a gas check, then "Confirm in wallet" (the existing bid action).
 */
export function BidDialog({ round, feeBps = 0, account, activeMembers, labelFor, onBid, pending, disabled, disabledReason, triggerClassName, triggerSize = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const pot = big(round.potForOffers);
  const maxDiscount = big(round.maxDiscount);
  const bestDiscount = big(round.bestDiscount);
  const hasBid = !!round.bestBidder && !sameAddr(round.bestBidder, ZERO_ADDRESS) && bestDiscount > 0n;
  // placeBid sends no value, so the check is gas only (0.01 MST reserve).
  const gasCheck = useBalanceCheck(open ? 0n : null, account);
  const short = !!gasCheck && !gasCheck.ok;

  const minPayout = pot > maxDiscount ? pot - maxDiscount : 0n;
  const lowestPayout = hasBid ? pot - bestDiscount : null;
  let offer: bigint | null = null;
  try {
    offer = input ? toWei(input) : null;
  } catch {
    offer = null;
  }
  const discount = offer !== null && offer <= pot ? pot - offer : null;
  const aboveCeiling = offer !== null && (lowestPayout !== null ? offer >= lowestPayout : offer >= pot);
  const belowFloor = offer !== null && offer < minPayout;
  const invalid = offer !== null && (aboveCeiling || belowFloor || discount === null);
  const others = Math.max(1, activeMembers - 1);
  const fee = (pot * BigInt(feeBps)) / 10_000n;
  const receive = offer !== null && !invalid && offer > fee ? offer - fee : null;
  const canSend = offer !== null && discount !== null && !invalid && !short && !pending;

  const hint = belowFloor
    ? `The lowest payout allowed this round is ${formatMst(minPayout, 4)} MST.`
    : aboveCeiling
      ? lowestPayout !== null
        ? `Offer less than the current lowest payout of ${formatMst(lowestPayout, 4)} MST to lead.`
        : `Offer less than the full pot of ${formatMst(pot, 4)} MST.`
      : "The lowest payout offer wins. The difference from the pot is shared by the other members.";

  const submit = async () => {
    if (discount === null || !canSend) return;
    // on-chain the bid is the discount: pot − your payout offer
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
          <DialogDescription>Say how much of the pot you will accept. The lowest payout offer wins; the difference from the pot becomes dividends for everyone else.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-3 gap-2 text-[13px]">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <dt className="text-muted-foreground">Pot</dt>
            <dd><MstcAmount wei={pot} size="md" decimals={4} className="text-pot" /></dd>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <dt className="text-muted-foreground">Current lowest payout</dt>
            <dd>{lowestPayout !== null ? <><MstcAmount wei={lowestPayout} size="md" decimals={4} /> <span className="block text-[12px] text-muted-foreground">by {labelFor(round.bestBidder)}</span></> : <span className="font-medium text-muted-foreground">No offers yet</span>}</dd>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <dt className="text-muted-foreground">Current discount</dt>
            <dd>{hasBid ? <MstcAmount wei={bestDiscount} size="md" decimals={4} /> : <span className="font-medium text-muted-foreground">0 MST</span>}</dd>
          </div>
        </dl>
        <div className="space-y-2">
          <Label htmlFor="bid-discount">Your payout offer</Label>
          <div className="relative">
            <Input
              id="bid-discount"
              inputMode="decimal"
              autoFocus
              placeholder={lowestPayout !== null ? `less than ${formatMst(lowestPayout, 4)}` : `${formatMst(minPayout, 4)} to less than ${formatMst(pot, 4)}`}
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
            <span className="text-muted-foreground">Discount if you win</span>
            <span className="tnum text-[20px] font-semibold text-foreground">{discount !== null && !invalid ? formatMst(discount, 4) : "0.00"} <span className="text-[12px] font-medium text-muted-foreground">MST</span></span>
          </div>
          {discount !== null && !invalid && <p className="tnum mt-1 text-[12px] text-muted-foreground">About {formatMst(discount / BigInt(others), 4)} MST shared to each of the other {others} member{others === 1 ? "" : "s"}.</p>}
          {receive !== null && feeBps > 0 && <p className="tnum mt-1 text-[12px] text-muted-foreground">You receive {formatMst(receive, 4)} MST after the {(feeBps / 100).toFixed(feeBps % 100 ? 2 : 0)} % platform fee; part may stay locked with your collateral until the circle completes.</p>}
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
