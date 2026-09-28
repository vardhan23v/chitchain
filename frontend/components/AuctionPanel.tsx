"use client";

import { useState } from "react";
import { Gavel, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { SectionTitle } from "@/components/PageHeader";
import { ZERO_ADDRESS } from "@/lib/contract";
import { TOOLTIPS } from "@/lib/labels";
import { big, formatMst, sameAddr, toWei } from "@/lib/format";
import type { MemberInfo, RoundInfo, RoundPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const invalid = tooLow || (notLower && !!parsed);

  const hint = !active
    ? "Bidding opens when the circle is active."
    : phase === "settling"
      ? "Bidding is closed for this round, waiting for settlement."
      : !me?.joined
        ? "Join the circle to bid."
        : me.hasWon
          ? "You've already won, no more bids."
          : me.removed
            ? "Removed members can't bid."
            : tooLow
              ? `Lowest allowed payout is ${formatMst(floor)} MST (max discount ${formatMst(maxDiscount)}).`
              : notLower && parsed
                ? `Accept less than ${formatMst(lowestAccepted)} MST to lead.`
                : "Lowest accepted payout wins; ties go to the earlier bid.";

  return (
    <Card className="flex h-full flex-col p-4 md:p-5">
      <SectionTitle
        Icon={Gavel}
        tone="text-agent"
        trailing={
          <Tooltip>
            <TooltipTrigger aria-label="How does the auction work?" className="rounded-full text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
            <TooltipContent>{TOOLTIPS.acceptedPayout}</TooltipContent>
          </Tooltip>
        }
      >
        Auction
      </SectionTitle>
      <dl className="mt-3 divide-y text-sm">
        <div className="flex items-center justify-between gap-2 py-1.5"><dt className="text-muted-foreground">Pot</dt><dd><MstcAmount wei={pot} size="sm" className="text-pot" /></dd></div>
        <div className="flex items-center justify-between gap-2 py-1.5">
          <dt className="text-muted-foreground">Lowest accepted payout</dt>
          <dd className="text-right">{hasBid ? <><MstcAmount wei={lowestAccepted} size="sm" /> <span className="text-xs text-muted-foreground">by {labelFor(round.bestBidder)}</span></> : <span className="text-muted-foreground">No bids yet</span>}</dd>
        </div>
        <div className="flex items-center justify-between gap-2 py-1.5"><dt className="text-muted-foreground">Max discount</dt><dd><MstcAmount wei={maxDiscount} size="sm" /></dd></div>
      </dl>
      <div className="mt-4 space-y-2">
        <Label htmlFor="accepted">Payout I&apos;d accept</Label>
        <div className="relative">
          <Input
            id="accepted"
            inputMode="decimal"
            placeholder={hasBid ? `less than ${formatMst(lowestAccepted)}` : `≥ ${formatMst(floor)}`}
            value={accepted}
            onChange={(e) => setAccepted(e.target.value.replace(/[^0-9.]/g, ""))}
            disabled={!eligible}
            className={cn("tnum h-10 pr-14", invalid && "border-danger focus-visible:ring-danger/30")}
            aria-describedby="accepted-hint"
            aria-invalid={invalid || undefined}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground" aria-hidden>MST</span>
        </div>
        <p className="tnum text-xs text-muted-foreground">
          Discount {formatMst(pot)} − {parsed !== null ? formatMst(parsed) : "…"} = <span className="font-semibold text-foreground">{discount !== null && discount >= 0n ? formatMst(discount) : "—"} MST</span>
          {discount !== null && discount > 0n && <> · ≈ {formatMst(discount / BigInt(others))} MST dividend each</>}
        </p>
        <p id="accepted-hint" className={cn("text-xs", invalid ? "text-danger" : "text-muted-foreground")}>{hint}</p>
        <Button className="w-full" disabled={disabled} onClick={() => discount !== null && onBid(discount).then(() => setAccepted(""))}>
          <Gavel aria-hidden /> {pending ? "Confirm in BridgeKey…" : "Place bid"}
        </Button>
      </div>
      <p className="mt-auto pt-3 text-[11px] leading-snug text-muted-foreground">Discount = pot − accepted payout · Dividend per member = discount ÷ (active members − 1)</p>
    </Card>
  );
}
