"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Info, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CountUpMst } from "@/components/motion/CountUp";
import { Flash } from "@/components/motion/Flash";
import { EASE } from "@/components/motion/Reveal";
import { ConfettiLite } from "@/components/Motion";
import { MstcAmount } from "@/components/MstcAmount";
import { SectionTitle } from "@/components/PageHeader";
import { TestnetBadge } from "@/components/TestnetBadge";
import { pctFromBps } from "@/lib/chain";
import { TOOLTIPS } from "@/lib/labels";
import { formatMst, formatMstFull, pct } from "@/lib/format";
import type { CircleSummary, RoundInfo } from "@/lib/types";

function Meta({ label, value, tip }: { label: string; value: string; tip?: string }) {
  const inner = (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className="text-muted-foreground">{label}</span>
      <span className="tnum font-semibold text-foreground">{value}</span>
    </span>
  );
  if (!tip) return inner;
  return (
    <Tooltip>
      <TooltipTrigger className="rounded underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">{inner}</TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** DESIGN §6.3 POT column: the visual anchor, big number, animated bar, compact meta row with tooltips. */
export function PotMeter({ circle, round }: { circle: CircleSummary; round: RoundInfo }) {
  const isActive = circle.status === 1;
  const expected = isActive ? round.expectedPot : (BigInt(circle.contribution) * BigInt(circle.maxMembers)).toString();
  const collected = isActive ? round.collected : "0";
  const percent = pct(collected, expected);
  const rounded = Math.round(percent);
  const full = isActive && expected !== "0" && collected === expected;

  // Confetti once per round, only when the pot fills while we are watching (not when it is already full on load).
  const [confetti, setConfetti] = useState(0);
  const prevFull = useRef(full);
  const celebrated = useRef<number | null>(null);
  useEffect(() => {
    if (full && !prevFull.current && celebrated.current !== circle.round) {
      celebrated.current = circle.round;
      setConfetti((n) => n + 1);
    }
    prevFull.current = full;
  }, [full, circle.round]);

  return (
    <Card className="relative overflow-hidden p-4 md:p-5">
      <SectionTitle
        Icon={Landmark}
        tone="text-pot"
        trailing={
          <>
            <Tooltip>
              <TooltipTrigger aria-label="What is the pot?" className="rounded-full text-muted-foreground hover:text-foreground"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
              <TooltipContent>{TOOLTIPS.pot}</TooltipContent>
            </Tooltip>
            <TestnetBadge size="xs" />
          </>
        }
      >
        Pot in the contract
      </SectionTitle>
      <div className="relative mt-3 flex flex-wrap items-baseline gap-x-2">
        <ConfettiLite trigger={confetti} />
        <span className="tnum whitespace-nowrap text-[44px] font-extrabold leading-none tracking-tight text-pot md:text-5xl" aria-label={`${formatMstFull(collected)} MST`} title={`${formatMstFull(collected)} MST`}>
          <CountUpMst wei={collected} />
        </span>
        <span className="tnum text-lg font-semibold text-muted-foreground" aria-label={`of ${formatMst(expected)} MST expected`}>
          / {formatMst(expected)} <span className="text-sm">MST</span>
        </span>
        <Flash value={rounded} tint="bg-pot/15" className="ml-auto">
          <span className="tnum text-sm font-semibold text-pot">{rounded}%</span>
        </Flash>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-pot/15" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Pot collected">
        <motion.div
          className="h-full rounded-full bg-pot"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.4, ease: EASE }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
        <Meta label="Reserve" value={`${formatMst(circle.reserve)} MST`} tip={TOOLTIPS.reserve} />
        <Meta label="Fee" value={pctFromBps(circle.feeBps)} tip="Platform fee taken from each payout into the reserve." />
        <Meta label="Holdback" value={pctFromBps(circle.holdbackBps)} tip={TOOLTIPS.holdback} />
        {isActive && <Meta label="Max discount" value={`${formatMst(round.maxDiscount)} MST · ${pctFromBps(circle.maxDiscountBps)}`} tip={TOOLTIPS.discount} />}
      </div>
    </Card>
  );
}
