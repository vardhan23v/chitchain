"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { ScoreGauge, scoreBand } from "@/components/ScoreGauge";
import { StatTile } from "@/components/StatTile";
import { ContributionChip } from "@/components/StatusChip";
import { TierChip } from "@/components/TierChip";
import { useRoundClock } from "@/hooks/useCountdown";
import { big, formatMst, shortAddr } from "@/lib/format";
import { PHASE_LABEL } from "@/lib/labels";
import type { MeOverview, MyCircle } from "@/lib/types";

interface Props {
  me: MeOverview | null;
  circles: MyCircle[];
  account: string;
  loading: boolean;
}

/** DESIGN member dashboard tiles fed by GET /me (+ /me/circles for locked collateral). */
export function MeTiles({ me, circles, account, loading }: Props) {
  const ac = me?.activeCircle ?? null;
  const clock = useRoundClock(ac?.round ?? null, !!ac && ac.status === 1);
  const locked = circles.reduce((s, c) => s + big(c.me.collateral), 0n);
  const r = me?.risk ?? null;
  const bid = ac ? big(ac.me.bidThisRound) : 0n;
  const deadline = clock.roundPhase === "contribution" ? clock.contributionDeadline : clock.biddingDeadline;
  const cta = ac ? (big(ac.me.claimable) > 0n ? "Withdraw" : !ac.me.paidThisRound && clock.roundPhase === "contribution" ? "Contribute" : !ac.me.hasWon && bid === 0n && clock.roundPhase !== "settling" ? "Place bid" : "Open room") : null;
  const t = me?.totals;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="My overview">
      <StatTile label="Wallet" value={<span className="font-mono text-lg">{shortAddr(account)}</span>} hint={me?.user.displayName ?? "no display name"} />
      <StatTile label="Available MST" testnet value={me ? `${formatMst(me.balance, 4)} MST` : "—"} loading={loading && !me} hint="testnet coins, no monetary value" />
      <StatTile label="Locked collateral" testnet value={`${formatMst(locked)} MST`} hint={`across ${circles.length} circle${circles.length === 1 ? "" : "s"}`} />
      <StatTile label="Current contribution" value={ac ? <ContributionChip status={ac.me.contributionStatus} className="text-xs" /> : "—"} hint={ac ? `${formatMst(ac.contribution)} MST per round` : "no active circle"} />
      <StatTile label="Risk score" value={r ? <span className="flex items-center gap-3"><ScoreGauge score={r.score} /><TierChip tier={r.tier} /></span> : "—"} hint={r ? `${scoreBand(r.score)} · Demo heuristic risk model` : "Demo heuristic risk model · not assessed yet"} loading={loading && !me} />
      <StatTile label="Default count" value={t?.defaults ?? "—"} hint="missed contributions, all circles" className={t?.defaults ? "border-danger/40" : undefined} />
      <StatTile label="Payouts" testnet value={t ? `${formatMst(t.payouts)} MST` : "—"} hint="won pots, all circles" />
      <StatTile label="Dividends" testnet value={t ? `${formatMst(t.dividends)} MST` : "—"} hint="your share of every discount" />
      <StatTile label="Current bid" testnet value={ac && bid > 0n ? `${formatMst(big(ac.round.expectedPot) - bid)} MST` : "No bid"} hint={ac && bid > 0n ? "the payout you'd accept this round" : ac ? `pot ${formatMst(ac.round.expectedPot)} MST` : "no active circle"} />
      <StatTile
        label="Current circle"
        className="sm:col-span-2 lg:col-span-3"
        value={ac ? <Link href={`/circle/${ac.id}`} className="hover:underline">{ac.name ?? `Circle #${ac.id}`}</Link> : "None"}
        hint={ac ? `Circle #${ac.id} · Round ${ac.round.round} of ${ac.maxMembers} · ${PHASE_LABEL[clock.roundPhase]}` : <Link href="/#circles" className="text-primary hover:underline">Browse circles</Link>}
      >
        {ac && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Countdown deadline={deadline || null} active={ac.status === 1} label={clock.roundPhase === "settling" ? undefined : PHASE_LABEL[clock.roundPhase]} />
            <Button asChild size="sm" className="ml-auto uppercase tracking-wide"><Link href={`/circle/${ac.id}`}>{cta}</Link></Button>
          </div>
        )}
      </StatTile>
    </section>
  );
}
