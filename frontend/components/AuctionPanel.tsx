"use client";

import { useState } from "react";
import { Gavel, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { ZERO_ADDRESS } from "@/lib/contract";
import { TOOLTIPS } from "@/lib/labels";
import { big, formatMst, sameAddr, toWei } from "@/lib/format";
import type { MemberInfo, RoundInfo, RoundPhase } from "@/lib/types";

interface Props {
  round: RoundInfo;
  /** Client-side phase from useRoundClock (flips the instant a deadline passes). */
  phase: RoundPhase;
  active: boolean;
  me: MemberInfo | null;
  activeMembers: number;
  labelFor: (addr: string) => string;
  /** Receives the on-chain DISCOUNT (= pot − accepted payout). */
  onBid: (discountWei: bigint) => Promise<unknown>;
  pending: boolean;
}

/**
 * Bids are stored on-chain as a discount, but presented as "the payout I'd accept".
 * accepted = expectedPot − discount; the lowest accepted payout wins.
 */
export function AuctionPanel({ round, phase, active, me, activeMembers, labelFor, onBid, pending }: Props) {
  const [accepted, setAccepted] = useState("");
  const pot = big(round.expectedPot);
  const maxDiscount = big(round.maxDiscount);
  const bestDiscount = big(round.bestDiscount);
  const hasBid = !!round.bestBidder && !sameAddr(round.bestBidder, ZERO_ADDRESS);
  const lowestAccepted = hasBid ? pot - bestDiscount : pot;
  const floor = pot > maxDiscount ? pot - maxDiscount : 0n;
  const biddingOpen = active && phase !== "settling";
  const eligible = !!me && me.joined && !me.removed && !me.hasWon && biddingOpen;

  let parsed: bigint | null = null;
  try {
    parsed = accepted ? toWei(accepted) : null;
  } catch {
    parsed = null;
  }
  const tooLow = parsed !== null && parsed < floor;
  const notLower = parsed !== null && parsed >= lowestAccepted;
  const discount = parsed !== null && parsed <= pot ? pot - parsed : null;
  const disabled = !eligible || pending || parsed === null || discount === null || discount <= 0n || tooLow || notLower;
  const others = Math.max(1, activeMembers - 1);

  const hint = !active
    ? "Bidding opens when the circle is active."
    : phase === "settling"
      ? "Bidding is closed for this round — waiting for settlement."
      : !me?.joined
        ? "Join the circle to bid."
        : me.hasWon
          ? "You've already won — no more bids."
          : me.removed
            ? "Removed members can't bid."
            : tooLow
              ? `Lowest allowed payout is ${formatMst(floor)} MST (max discount ${formatMst(maxDiscount)}).`
              : notLower && parsed
                ? `Accept less than ${formatMst(lowestAccepted)} MST to lead.`
                : "Lowest accepted payout wins; ties go to the earlier bid. Open during contributions and bidding.";

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        <Gavel className="h-3.5 w-3.5" aria-hidden /> Auction
        <Tooltip>
          <TooltipTrigger aria-label="How does the auction work?"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent className="max-w-xs">{TOOLTIPS.acceptedPayout}</TooltipContent>
        </Tooltip>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Pot</dt><dd><MstcAmount wei={pot} size="sm" className="text-pot" /></dd></div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Current lowest accepted payout</dt>
          <dd className="text-right">{hasBid ? <MstcAmount wei={lowestAccepted} size="sm" /> : <span className="text-muted-foreground">No bids yet</span>}</dd>
        </div>
        <div className="flex justify-between"><dt className="text-muted-foreground">by</dt><dd className="font-medium">{hasBid ? labelFor(round.bestBidder) : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Max discount</dt><dd><MstcAmount wei={maxDiscount} size="sm" /></dd></div>
      </dl>
      <div className="mt-4 space-y-2">
        <Label htmlFor="accepted">Payout I&apos;d accept (MST)</Label>
        <Input
          id="accepted"
          inputMode="decimal"
          placeholder={hasBid ? `less than ${formatMst(lowestAccepted)}` : `≥ ${formatMst(floor)}`}
          value={accepted}
          onChange={(e) => setAccepted(e.target.value.replace(/[^0-9.]/g, ""))}
          disabled={!eligible}
          className="tnum"
          aria-describedby="accepted-hint"
        />
        <p className="tnum text-xs text-muted-foreground">
          Your discount = {formatMst(pot)} − {parsed !== null ? formatMst(parsed) : "…"} = <span className="font-semibold text-foreground">{discount !== null && discount >= 0n ? formatMst(discount) : "—"} MST</span>
          {discount !== null && discount > 0n && <> · dividend ≈ {formatMst(discount / BigInt(others))} MST each</>}
        </p>
        <p id="accepted-hint" className="text-xs text-muted-foreground">{hint}</p>
        <Button className="w-full" disabled={disabled} onClick={() => discount !== null && onBid(discount).then(() => setAccepted(""))}>
          {pending ? "Confirm in BridgeKey…" : "Place bid"}
        </Button>
        <p className="text-[11px] leading-snug text-muted-foreground">Discount = pot − accepted payout · Dividend per member = discount ÷ (active members − 1)</p>
      </div>
    </Card>
  );
}
