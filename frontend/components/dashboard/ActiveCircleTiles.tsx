"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { ContributionChip } from "@/components/StatusChip";
import { MstcAmount } from "@/components/MstcAmount";
import { StatTile } from "@/components/StatTile";
import { useCircle } from "@/hooks/useCircle";
import { useRoundClock } from "@/hooks/useCountdown";
import { big, formatMst, shortAddr } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/labels";
import type { MyCircle } from "@/lib/types";

/** Live tiles for the most recent Active circle the viewer is in. */
export function ActiveCircleTiles({ circle: summary, account }: { circle: MyCircle; account: string }) {
  const room = useCircle(summary.id, account);
  const circle = room.data?.circle ?? summary;
  const round = room.data?.round ?? null;
  const me = room.me ?? summary.me;
  const clock = useRoundClock(round, circle.status === 1);
  const labelFor = (a: string) => room.data?.members.find((m) => m.address.toLowerCase() === a.toLowerCase())?.label ?? shortAddr(a);
  const hasBid = round && big(round.bestDiscount) > 0n;
  const claimable = big(me.claimable);
  const cta = claimable > 0n ? "Withdraw" : !me.paidThisRound && clock.roundPhase === "contribution" ? "Contribute" : !me.hasWon && big(me.bidThisRound) === 0n && clock.roundPhase !== "settling" ? "Place bid" : "Open room";
  const deadline = clock.roundPhase === "contribution" ? clock.contributionDeadline : clock.biddingDeadline;
  const used = big(me.collateralUsed);

  return (
    <section className="space-y-3" aria-label={`Circle #${circle.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg">
          <Link href={`/circle/${circle.id}`} className="hover:underline">Circle #{circle.id}</Link>
          <span className="ml-2 text-sm font-normal text-muted-foreground">Round {circle.round} of {circle.maxMembers}</span>
        </h2>
        <Countdown deadline={deadline || null} active={circle.status === 1} label={clock.roundPhase === "settling" ? undefined : PHASE_LABEL[clock.roundPhase]} tone={clock.roundPhase} size="sm" />
        <Button asChild className="ml-auto"><Link href={`/circle/${circle.id}`}>{cta}</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Current pot" testnet valueClassName="text-pot" value={round ? <>{formatMst(round.collected)} <span className="text-base font-medium text-muted-foreground">/ {formatMst(round.expectedPot)}</span></> : "—"} hint="collected / expected, MST" loading={!round && room.loading} />
        <StatTile label="My contribution" value={<ContributionChip status={me.contributionStatus} className="text-xs" />} hint={me.paidThisRound ? `${formatMst(circle.contribution)} MST paid this round` : `${formatMst(circle.contribution)} MST due`} />
        <StatTile label="My collateral" testnet value={<MstcAmount wei={me.collateral} size="lg" />} hint={used > 0n ? `used ${formatMst(used)} MST` : "nothing used"} />
        <StatTile label="My defaults" value={me.defaults} hint={me.defaults ? "missed contributions in this circle" : "no missed contributions"} className={me.defaults ? "border-danger/40" : undefined} />
        <StatTile label="Lowest accepted payout" testnet value={round && hasBid ? <MstcAmount wei={round.lowestAcceptedPayout} size="lg" /> : <span className="text-lg text-muted-foreground">No bids yet</span>} hint={round && hasBid ? `by ${labelFor(round.bestBidder)}` : round ? `max discount ${formatMst(round.maxDiscount)} MST` : undefined} loading={!round && room.loading} />
        <StatTile label="Phase" valueClassName={clock.roundPhase === "contribution" ? "text-primary" : clock.roundPhase === "bidding" ? "text-pot" : "text-warning"} value={PHASE_LABEL[clock.roundPhase]} hint={round ? `${formatMst(round.maxDiscount)} MST max discount` : undefined} />
        <StatTile label="Claimable" testnet value={<MstcAmount wei={claimable} size="lg" className={claimable > 0n ? "text-success" : undefined} />} hint={claimable > 0n ? "payouts, dividends and refunds" : "nothing to withdraw yet"} />
        <StatTile label="Won" value={me.hasWon ? "Yes" : "Not yet"} hint={me.hasWon ? "holdback released at completion" : "you can still bid"} />
      </div>
      {room.error && !room.data && <p className="text-xs text-muted-foreground">Live round data unavailable — showing the last known state.</p>}
    </section>
  );
}
