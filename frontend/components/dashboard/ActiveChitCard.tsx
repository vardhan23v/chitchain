"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/Countdown";
import { EASE } from "@/components/motion/Reveal";
import { ContributionChip } from "@/components/StatusChip";
import type { RoomData } from "@/hooks/useCircle";
import { useRoundClock } from "@/hooks/useCountdown";
import { big, formatMst, shortAddr } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/labels";
import type { MyCircle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  summary: MyCircle;
  /** Live room (round, members) when loaded; the summary is the fallback. */
  room: RoomData | null;
  loading?: boolean;
  className?: string;
}

/** The chit that needs you right now: pot, members, round progress, next deadline, collateral, contribution status, best discount. */
export function ActiveChitCard({ summary, room, loading, className }: Props) {
  const circle = room?.circle ?? summary;
  const round = room?.round ?? null;
  const me = room?.members.find((m) => m.address.toLowerCase() === summary.me.address.toLowerCase()) ?? summary.me;
  const active = circle.status === 1;
  const clock = useRoundClock(round, active);
  const deadline = clock.biddingDeadline; // v2.2: end of the current window (contributions, decision or auction)
  const progress = circle.maxMembers > 0 ? Math.max(0, Math.min(100, ((circle.round - 1) / circle.maxMembers) * 100)) : 0;
  const hasBid = !!round && big(round.bestDiscount) > 0n;
  const potWei = round ? round.collected : (BigInt(circle.contribution) * BigInt(circle.memberCount)).toString();
  const expectedWei = round ? round.expectedPot : (BigInt(circle.contribution) * BigInt(circle.maxMembers)).toString();

  return (
    <Card className={cn("card-hover p-4 md:p-5", className)} aria-label={`Circle #${circle.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-dot h-2 w-2 rounded-full bg-success" aria-hidden />
        <h2 className="min-w-0 truncate text-[16px] font-semibold leading-tight tracking-tight">
          <Link href={`/circle/${circle.id}`} className="hover:underline">{circle.name ?? `Circle #${circle.id}`}</Link>
        </h2>
        <span className="tnum text-[12px] text-muted-foreground">Round {circle.round} of {circle.maxMembers}</span>
        <ContributionChip status={me.contributionStatus} className="ml-auto text-[11px]" />
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[13px] text-muted-foreground">Pot this round</div>
          <div className="tnum text-[32px] font-semibold leading-none tracking-tight text-pot md:text-[36px]">{formatMst(potWei)} <span className="text-[14px] font-medium text-muted-foreground">/ {formatMst(expectedWei)} MST</span></div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><Users className="h-3.5 w-3.5" aria-hidden /> <span className="tnum">{circle.memberCount} of {circle.maxMembers}</span> members</span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[12px] text-muted-foreground"><span>Rounds completed</span><span className="tnum">{Math.max(0, circle.round - 1)} of {circle.maxMembers}</span></div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Rounds completed">
          <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: EASE }} />
        </div>
      </div>

      <dl className="tnum mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Next deadline</dt>
          <dd className="mt-1">{active && deadline ? <Countdown deadline={deadline} active label={clock.roundPhase === "settling" ? undefined : PHASE_LABEL[clock.roundPhase]} tone={clock.roundPhase} size="sm" /> : <span className="text-muted-foreground">{loading ? "Loading" : "Not running"}</span>}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" aria-hidden /> Collateral locked</dt>
          <dd className="mt-1 font-semibold">{formatMst(me.collateral)} MST{big(me.collateralUsed) > 0n && <span className="ml-1 font-normal text-warning">({formatMst(me.collateralUsed)} used)</span>}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{round?.phaseCode === 2 ? "Current lowest payout" : "Recipient this round"}</dt>
          <dd className="mt-1 font-semibold">
            {round?.phaseCode === 2
              ? hasBid && round.lowestAcceptedPayout ? `${formatMst(round.lowestAcceptedPayout, 3)} MST` : <span className="font-normal text-muted-foreground">No offers yet</span>
              : round?.recipient ? (round.recipientName ?? (round.recipientLabel ? `Demo ${round.recipientLabel}` : shortAddr(round.recipient)))
              : <span className="font-normal text-muted-foreground">Named when the pot is ready</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild><Link href={`/circle/${circle.id}`}>View chit</Link></Button>
        {big(me.claimable) > 0n && <span className="text-[13px] text-success">{formatMst(me.claimable)} MST claimable</span>}
        {room === null && !loading && <span className="text-[12px] text-muted-foreground">Live round data is temporarily unavailable. Showing the last known state.</span>}
      </div>
    </Card>
  );
}
