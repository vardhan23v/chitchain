"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Gavel, Info, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BidDialog } from "@/components/BidDialog";
import { Flash } from "@/components/motion/Flash";
import { EASE } from "@/components/motion/Reveal";
import { TxLink } from "@/components/TxLink";
import { useCountdown } from "@/hooks/useCountdown";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { ZERO_ADDRESS } from "@/lib/contract";
import { RollingClock } from "@/components/motion/RollingClock";
import { big, formatMst, sameAddr, shortAddr, timeAgo } from "@/lib/format";
import { TOOLTIPS } from "@/lib/labels";
import type { AuctionBid, CircleSummary, MemberInfo, RoundInfo, RoundPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  circle: Pick<CircleSummary, "id" | "name" | "status" | "maxMembers"> & { feeBps?: number };
  round: RoundInfo;
  /** Client-side phase from useRoundClock. */
  phase: RoundPhase;
  me: MemberInfo | null;
  activeMembers: number;
  labelFor: (addr: string) => string;
  /** Connected wallet (for the gas check). */
  account: string | null;
  onBid: (discountWei: bigint) => Promise<unknown>;
  pending: boolean;
  /** Show "Open the room" instead of the bid button (dashboard embed). */
  linkToRoom?: boolean;
  /** Increment to pulse a ring around the card (the room does this on "Place a bid"). */
  highlight?: number;
  className?: string;
  /** Four tiles in a row (only when the card has a full-width column; the room gives it a narrow one). */
  wide?: boolean;
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3", className)}>
      <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      <div className="tnum mt-1 truncate text-[22px] font-semibold leading-tight text-foreground md:text-[24px]">{children}</div>
    </div>
  );
}

/**
 * Live auction: pot, best discount (flashes on change), time remaining (warning under 30 s), participants,
 * a bid timeline (newest first, fresh rows slide in) and "Place a bid" through BidDialog → existing onBid.
 */
export function AuctionCard({ circle, round, phase, me, activeMembers, labelFor, account, onBid, pending, linkToRoom, highlight = 0, className, wide }: Props) {
  const active = circle.status === 1;
  const bidding = active && phase === "bidding";
  const clock = useCountdown(round.deadline || null, bidding);
  const bids = usePolling<AuctionBid[]>(() => api.auctionBids(circle.id, 20).then((r) => r.bids.filter((b) => b.round === round.round)), POLL_API_MS, [circle.id, round.round]);
  const rows = bids.data ?? [];
  const hasBest = !!round.bestBidder && !sameAddr(round.bestBidder, ZERO_ADDRESS) && big(round.bestDiscount) > 0n;
  const bestDiscount = big(round.bestDiscount);
  const pot = big(round.potForOffers);
  const lowestPayout = hasBest ? pot - bestDiscount : null;
  const recipientName = round.recipientName ?? (round.recipientLabel ? `Demo ${round.recipientLabel}` : round.recipient ? shortAddr(round.recipient) : "the recipient");
  const under30 = bidding && clock.remaining > 0 && clock.remaining <= 30;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  // Hashes present in the first batch render at rest; anything that arrives later slides in.
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null && bids.data) seen.current = new Set(rows.map((b) => b.txHash));
  const isFresh = (h: string) => seen.current !== null && !seen.current.has(h);
  useEffect(() => {
    if (!seen.current) return;
    for (const b of rows) seen.current.add(b.txHash);
  });

  const eligible = !!me && me.joined && !me.removed && !me.hasWon && bidding;
  const reason = !active
    ? circle.status === 2 ? "This circle has completed, every round is settled." : circle.status === 3 ? "This circle was cancelled, no auction took place." : "The circle starts once it fills."
    : phase === "contribution" || phase === "closing" ? "An auction opens only if this round's recipient declines the full pot."
    : phase === "decision" ? `${recipientName} has the first choice. An auction opens only if they decline.`
    : phase === "settling" ? "This round is closed, waiting for settlement."
    : !me?.joined ? "Join the circle to make an offer."
    : me.hasWon ? "You have already received a pot, so you cannot bid again."
    : me.removed ? "Removed members cannot bid." : undefined;

  // No auction exists this round yet (contributions or the recipient's decision): say so, and offer no bid action.
  if (active && round.phaseCode !== 2) {
    return (
      <Card className={cn("relative p-4 md:p-5", className?.replace(/\bh-full\b/g, ""))}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden />
          <h2 className="min-w-0 truncate text-[16px] font-semibold leading-tight tracking-tight">Auction · {circle.name ?? `Circle #${circle.id}`}</h2>
          <span className="tnum text-[12px] text-muted-foreground">Round {round.round} of {circle.maxMembers}</span>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[13px] text-muted-foreground">
          <Gavel className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{reason} If it opens, members who have not received a pot offer to take less than the full pot, and the lowest payout offer wins.</span>
        </p>
      </Card>
    );
  }

  return (
    <Card className={cn("relative p-4 md:p-5", className)}>
      {highlight > 0 && (
        <motion.span key={highlight} aria-hidden className="pointer-events-none absolute -inset-0.5 rounded-2xl ring-2 ring-primary/60" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.6, ease: EASE }} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("status-dot h-2 w-2 rounded-full", bidding ? "bg-success" : "bg-muted-foreground/50")} aria-hidden />
        <h2 className="min-w-0 truncate text-[16px] font-semibold leading-tight tracking-tight">
          {bidding ? "Auction open" : "Auction"} · {circle.name ?? `Circle #${circle.id}`}
        </h2>
        <span className="tnum text-[12px] text-muted-foreground">Round {round.round} of {circle.maxMembers}</span>
        <Tooltip>
          <TooltipTrigger aria-label="How does the auction work?" className="ml-auto rounded-full text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent>{TOOLTIPS.acceptedPayout}</TooltipContent>
        </Tooltip>
      </div>

      <div className={cn("mt-3 grid grid-cols-2 gap-2.5", wide && "lg:grid-cols-4")}>
        <Tile label="Pot"><span className="text-pot">{formatMst(pot, 3)}</span> <span className="text-[12px] font-medium text-muted-foreground">MST</span></Tile>
        <Tile label="Current lowest payout">
          <Flash value={`${round.bestBidder}:${round.bestDiscount}`} tint="bg-primary/15">
            {lowestPayout !== null ? <>{formatMst(lowestPayout, 3)} <span className="text-[12px] font-medium text-muted-foreground">MST</span></> : <span className="text-[15px] font-medium text-muted-foreground">No offers yet</span>}
          </Flash>
        </Tile>
        <Tile label="Current discount">
          {hasBest ? <>{formatMst(bestDiscount, 3)} <span className="text-[12px] font-medium text-muted-foreground">MST</span></> : <span className="text-[15px] font-medium text-muted-foreground">0 MST</span>}
        </Tile>
        <Tile label="Time remaining" className={cn(under30 && "border-warning/40")}>
          <span className={cn(under30 && "text-warning")}>{bidding ? <RollingClock seconds={clock.remaining} /> : <span className="text-[15px] font-medium text-muted-foreground">{phase === "decision" ? "Not open" : phase === "contribution" || phase === "closing" ? "Not open" : "Closed"}</span>}</span>
        </Tile>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
          <Gavel className="h-3.5 w-3.5" aria-hidden /> Payout offers
          <span className="ml-auto inline-flex items-center gap-1 text-[12px]"><Users className="h-3.5 w-3.5" aria-hidden />{activeMembers} members · {rows.length} offer{rows.length === 1 ? "" : "s"}</span>
        </div>
        {bids.loading && !bids.data ? (
          <div className="mt-2 space-y-1.5" aria-busy="true">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}</div>
        ) : rows.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-white/[0.1] px-3 py-4 text-center text-[13px] text-muted-foreground">{bids.error && !bids.data ? "Bid history is temporarily unavailable." : bidding ? "No offers yet. The lowest payout offer wins." : reason ?? "No offers this round."}</p>
        ) : (
          <ol className="mt-2 max-h-56 space-y-0.5 overflow-y-auto" aria-live="polite" aria-relevant="additions">
            <AnimatePresence initial={false}>
              {rows.map((b, i) => (
                <motion.li
                  key={b.txHash}
                  layout="position"
                  initial={isFresh(b.txHash) ? { opacity: 0, y: -10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]", i === 0 && "bg-primary/[0.08]")}
                >
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", i === 0 ? "bg-primary" : "bg-white/20")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{b.username ?? labelFor(b.member)} <span className="text-muted-foreground">will take</span> <span className="tnum font-semibold">{b.payout ? formatMst(b.payout, 3) : "?"} MST</span> <span className="tnum text-muted-foreground">(discount {formatMst(b.discount, 3)})</span></span>
                  <span className="tnum text-[12px] text-muted-foreground">{timeAgo(b.ts, now)}</span>
                  <TxLink hash={b.txHash} label={shortAddr(b.txHash, 6, 4)} className="text-[12px]" />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <div className="mt-4">
        {linkToRoom ? (
          <Link href={`/circle/${circle.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02]">{eligible ? "Place a bid" : "Open the room"}</Link>
        ) : (
          <BidDialog round={round} feeBps={circle.feeBps} account={account} activeMembers={activeMembers} labelFor={labelFor} onBid={onBid} pending={pending} disabled={!eligible} disabledReason={reason} triggerClassName="w-full" />
        )}
      </div>
    </Card>
  );
}
