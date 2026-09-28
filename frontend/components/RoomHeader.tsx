"use client";

import { ExternalLink, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/Countdown";
import { DemoBadge } from "@/components/TestnetBadge";
import { useRoundClock } from "@/hooks/useCountdown";
import { CONTRACT_ADDRESS, HAS_CONTRACT } from "@/lib/chain";
import { addrUrl } from "@/lib/format";
import { PHASE_LABEL, STATUS_LABEL } from "@/lib/labels";
import type { CircleSummary, RoundInfo } from "@/lib/types";

interface Props {
  circle: CircleSummary;
  round: RoundInfo;
  txCount: number;
  onSettle: () => void;
  settling: boolean;
  source: "api" | "chain";
}

const STATUS_VARIANT = { 0: "pot", 1: "default", 2: "status-paid", 3: "status-removed" } as const;

/** Circle title, status, round r/N, phase pill with countdown, DEMO MODE chip, Contract ↗ and tx counter. */
export function RoomHeader({ circle, round, txCount, onSettle, settling, source }: Props) {
  const active = circle.status === 1;
  const clock = useRoundClock(round, active);
  const deadline = clock.roundPhase === "contribution" ? clock.contributionDeadline : clock.biddingDeadline;
  const label = clock.roundPhase === "settling" ? undefined : PHASE_LABEL[clock.roundPhase];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-2xl md:text-3xl">Circle #{circle.id}</h1>
      <Badge variant={STATUS_VARIANT[circle.status]}>{STATUS_LABEL[circle.status]}</Badge>
      {circle.isDemo && <DemoBadge />}
      {active && <span className="tnum text-sm text-muted-foreground">Round {circle.round} of {circle.maxMembers}</span>}
      {circle.status === 0 && <span className="tnum text-sm text-muted-foreground">{circle.memberCount}/{circle.maxMembers} members</span>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Countdown deadline={deadline || null} active={active} label={label} onSettle={onSettle} settling={settling} />
        {HAS_CONTRACT && (
          <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-chain/30 px-3 py-1 text-[13px] font-medium text-chain hover:bg-chain/10">
            Contract <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
      <div className="flex w-full items-center gap-1 text-[13px] text-muted-foreground">
        <Hash className="h-3.5 w-3.5" aria-hidden />
        {source === "api" ? <span className="tnum">{txCount} on-chain transactions in this circle</span> : <span>Reading directly from the contract — backend offline</span>}
      </div>
    </div>
  );
}
