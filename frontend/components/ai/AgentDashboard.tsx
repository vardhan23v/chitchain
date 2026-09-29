"use client";

import { CheckCircle2, Loader2, Pause, Play, RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/StatTile";
import { RevealGroup } from "@/components/motion/Reveal";
import { CountUpMst } from "@/components/motion/CountUp";
import { Flash } from "@/components/motion/Flash";
import { AiStatusPill } from "@/components/ai/AiStatusPill";
import { kindIcon, clockTime } from "@/components/ai/ActivityLog";
import { durationLabel, LEVEL_LABEL } from "@/components/ai/strategy";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock, formatMst, sameAddr, shortAddr } from "@/lib/format";
import type { AgentEvent, AuctionSnapshot, BidAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  agent: BidAgent;
  auction: AuctionSnapshot | null;
  /** Latest event, for the AI status line. */
  latest: AgentEvent | null;
  labelFor: (addr: string) => string;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEvaluate: () => void;
  onApprove: () => void;
}

export const NEEDS_APPROVAL = "Needs your approval";

const PHASE: Record<AuctionSnapshot["status"], string> = { CONTRIBUTION: "Contributions open", BIDDING: "Bidding open", SETTLING: "Settling", INACTIVE: "Auction inactive" };

/** Live view of an attached agent: status, goal, four auction tiles, the AI status line and the controls. */
export function AgentDashboard({ agent, auction, latest, labelFor, busy, onPause, onResume, onStop, onEvaluate, onApprove }: Props) {
  const bidding = auction?.status === "BIDDING";
  const clock = useCountdown(auction?.biddingDeadline ?? null, bidding);
  const live = agent.status === "ACTIVE" || agent.status === "PAUSED";
  const needsApproval = agent.status === "PAUSED" && (agent.statusReason ?? "").toLowerCase().includes("approval");
  const holdsBest = !!auction && sameAddr(auction.bestBidder, agent.member);
  const hasBest = !!auction && auction.bestBidder && !/^0x0{40}$/.test(auction.bestBidder) && auction.bidCount > 0;
  const status = latest ? kindIcon(latest.kind) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AiStatusPill status={agent.status} />
            <span className="text-[13px] text-muted-foreground">Member {labelFor(agent.member)} · {shortAddr(agent.member)}</span>
            {agent.demoMode && <span className="rounded-full border border-pot/30 bg-pot/10 px-1.5 text-[10px] font-semibold text-pot">Demo rival on</span>}
          </div>
          <p className="mt-1.5 text-[14px] leading-snug">&ldquo;{agent.goal}&rdquo;</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {LEVEL_LABEL[agent.urgency]} urgency · {LEVEL_LABEL[agent.riskTolerance]} risk tolerance · {durationLabel(agent.durationSec)} · {agent.autonomous ? "Bids automatically" : "Asks before each bid"}
          </p>
          {agent.statusReason && !needsApproval && <p className="mt-1 text-[12px] text-muted-foreground">{agent.statusReason}</p>}
        </div>
      </div>

      <RevealGroup mode="load" className="grid grid-cols-2 gap-2.5 md:gap-3 2xl:grid-cols-4">
        <StatTile
          label="Current best discount"
          value={hasBest ? <CountUpMst wei={auction!.bestDiscount} /> : "None"}
          hint={hasBest ? (holdsBest ? "You hold the winning bid" : `By ${labelFor(auction!.bestBidder)}`) : auction ? PHASE[auction.status] : "Loading"}
          valueClassName="text-[24px] md:text-[28px]"
          className="p-3 md:p-4"
        />
        <StatTile label="Your maximum" value={<CountUpMst wei={agent.maxDiscount} />} hint={`${agent.maxDiscountPct}% of the pot`} valueClassName="text-[24px] md:text-[28px]" className="p-3 md:p-4" />
        <StatTile
          label="Time remaining"
          value={<Flash value={clock.phase}><span className={cn(clock.phase === "warning" && "text-warning")}>{bidding ? formatClock(clock.remaining) : auction ? PHASE[auction.status] : "Loading"}</span></Flash>}
          hint={auction ? `Round ${auction.round} of ${auction.roundsTotal}` : undefined}
          valueClassName="text-[24px] md:text-[28px]"
          className="p-3 md:p-4"
        />
        <StatTile
          label="Desired payout"
          value={agent.desiredPayout ? <CountUpMst wei={agent.desiredPayout} /> : "Not set"}
          hint={auction ? `Pot ${formatMst(auction.expectedPot)} MST` : undefined}
          valueClassName="text-[24px] md:text-[28px]"
          className="p-3 md:p-4"
        />
      </RevealGroup>

      <div className="flex items-start gap-2.5 rounded-xl border border-agent/25 bg-agent/[0.08] px-3.5 py-2.5 text-[13px] leading-snug" aria-live="polite">
        {status ? (
          <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", status.color)} style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }} aria-hidden>
            <status.Icon className="h-3 w-3" />
          </span>
        ) : (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-agent" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <span className="font-medium text-agent">AI status: </span>
          {latest ? (
            <>
              {latest.text}
              {latest.reason && <span className="text-muted-foreground">, {latest.reason}</span>}
              <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{clockTime(latest.ts)}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Watching the auction. The first evaluation runs within a few seconds.</span>
          )}
        </div>
      </div>

      {needsApproval && (
        <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-4">
          <p className="text-[15px] font-semibold leading-tight">The agent wants to bid</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {agent.lastBid ? `Proposed discount ${formatMst(agent.lastBid)} MST. ` : ""}{agent.lastReason ?? "Autonomous bidding is off, so nothing was submitted."} Approving turns on autonomous bidding within your limits.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" onClick={onApprove} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />} Approve and bid
            </Button>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onStop} disabled={busy}>Stop the agent</Button>
          </div>
        </div>
      )}

      {live && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {agent.status === "ACTIVE" ? (
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onPause} disabled={busy}><Pause aria-hidden /> Pause</Button>
          ) : (
            !needsApproval && <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onResume} disabled={busy}><Play aria-hidden /> Resume</Button>
          )}
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onEvaluate} disabled={busy || agent.status !== "ACTIVE"}><RefreshCw className={cn(busy && "animate-spin")} aria-hidden /> Evaluate now</Button>
          <Button type="button" variant="destructive" className="w-full sm:ml-auto sm:w-auto" onClick={onStop} disabled={busy}><Square aria-hidden /> Stop</Button>
        </div>
      )}
    </div>
  );
}
