"use client";

import { useState } from "react";
import { Gavel, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { TOOLTIPS } from "@/lib/labels";
import { formatMstc, sameAddr, toWei } from "@/lib/format";
import type { MemberInfo, RoundInfo } from "@/lib/types";

const ZERO = "0x0000000000000000000000000000000000000000";

interface Props {
  round: RoundInfo;
  active: boolean;
  me: MemberInfo | null;
  labelFor: (addr: string) => string;
  onBid: (discountWei: bigint) => Promise<unknown>;
  pending: boolean;
}

export function AuctionPanel({ round, active, me, labelFor, onBid, pending }: Props) {
  const [discount, setDiscount] = useState("");
  const hasBid = round.bestBidder && !sameAddr(round.bestBidder, ZERO);
  const eligible = !!me && me.joined && !me.removed && !me.hasWon && active;
  let parsed: bigint | null = null;
  try {
    parsed = discount ? toWei(discount) : null;
  } catch {
    parsed = null;
  }
  const tooHigh = parsed !== null && parsed > BigInt(round.maxDiscount || "0");
  const notHigher = parsed !== null && parsed <= BigInt(round.bestDiscount || "0");
  const disabled = !eligible || pending || parsed === null || parsed <= 0n || tooHigh || notHigher;

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        <Gavel className="h-3.5 w-3.5" aria-hidden /> Auction
        <Tooltip>
          <TooltipTrigger aria-label="What is a discount?"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent className="max-w-xs">{TOOLTIPS.discount}</TooltipContent>
        </Tooltip>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Best bid</dt><dd>{hasBid ? <MstcAmount wei={round.bestDiscount} size="sm" /> : <span className="text-muted-foreground">No bids yet</span>}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">by</dt><dd className="font-medium">{hasBid ? labelFor(round.bestBidder) : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Max</dt><dd><MstcAmount wei={round.maxDiscount} size="sm" /></dd></div>
      </dl>
      <div className="mt-4 space-y-2">
        <Label htmlFor="discount">Your discount (MSTC)</Label>
        <Input
          id="discount"
          inputMode="decimal"
          placeholder={hasBid ? `more than ${formatMstc(round.bestDiscount)}` : "e.g. 0.50"}
          value={discount}
          onChange={(e) => setDiscount(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={!eligible}
          className="tnum"
          aria-describedby="discount-hint"
        />
        <p id="discount-hint" className="text-xs text-muted-foreground">
          {!active ? "Bidding opens when the circle is active." : !me?.joined ? "Join the circle to bid." : me.hasWon ? "You've already won — no more bids." : me.removed ? "Removed members can't bid." : tooHigh ? `Max discount this round is ${formatMstc(round.maxDiscount)} MSTC.` : notHigher && parsed ? `Bid more than ${formatMstc(round.bestDiscount)} MSTC to lead.` : "Highest discount wins; ties go to the earlier bid."}
        </p>
        <Button className="w-full" disabled={disabled} onClick={() => parsed && onBid(parsed).then(() => setDiscount(""))}>
          {pending ? "Confirm in BridgeKey…" : "Place bid"}
        </Button>
      </div>
    </Card>
  );
}
