"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleDot, Circle as CircleIcon, ExternalLink, Hash, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/Countdown";
import { EASE } from "@/components/motion/Reveal";
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

const STATUS = {
  0: { variant: "pot", Icon: CircleIcon },
  1: { variant: "status-won", Icon: CircleDot },
  2: { variant: "status-paid", Icon: CheckCircle2 },
  3: { variant: "status-removed", Icon: XCircle },
} as const;

/** Eyebrow (circle id, tx counter), then title with status badge, phase pill (crossfades when the phase flips) and DEMO chip; Contract link on the right. */
export function RoomHeader({ circle, round, txCount, onSettle, settling, source }: Props) {
  const active = circle.status === 1;
  const clock = useRoundClock(round, active);
  // v2.2: the countdown follows the current window (contributions, recipient decision, or the auction after a decline)
  const deadline = clock.biddingDeadline;
  const label = clock.roundPhase === "settling" || clock.roundPhase === "closing" ? undefined : PHASE_LABEL[clock.roundPhase];
  const closing = clock.roundPhase === "closing" || (round.phaseCode === 0 && clock.roundPhase !== "contribution");
  const st = STATUS[circle.status];

  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
          {circle.name && <span className="tnum">Circle #{circle.id}</span>}
          {active && <span className="tnum font-normal">Round {circle.round} of {circle.maxMembers}</span>}
          {circle.status === 0 && <span className="tnum font-normal">{circle.memberCount}/{circle.maxMembers} members</span>}
          <span className="inline-flex items-center gap-1 font-normal" title={source === "api" ? "Indexed by ChitChain" : "Indexer offline, reading the contract directly"}>
            <Hash className="h-3 w-3" aria-hidden />
            {source === "api" ? <span className="tnum">{txCount} on-chain transactions</span> : <span>reading directly from the contract</span>}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 truncate">{circle.name ?? `Circle #${circle.id}`}</h1>
          <Badge variant={st.variant}><st.Icon className="h-3 w-3" aria-hidden />{STATUS_LABEL[circle.status]}</Badge>
          {circle.isDemo && <DemoBadge />}
          {active && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={clock.roundPhase}
                className="inline-flex"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <Countdown deadline={deadline || null} active={active} label={label} tone={clock.roundPhase} onSettle={onSettle} settling={settling} settleLabel={closing ? "Close contributions" : "Settle the round"} />
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {HAS_CONTRACT && (
          <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-chain/30 px-3 py-1.5 text-[13px] font-semibold text-chain transition-colors hover:bg-chain/10" aria-label="Open the ChitChain contract on MSTScan">
            Contract <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </header>
  );
}
