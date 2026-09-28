"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { TestnetBadge } from "@/components/TestnetBadge";
import { pctFromBps } from "@/lib/chain";
import { TOOLTIPS } from "@/lib/labels";
import { formatMst, pct } from "@/lib/format";
import type { CircleSummary, RoundInfo } from "@/lib/types";

/** DESIGN §6.3 POT column: collected / expected, bar with 400 ms ease-out, reserve + fee. */
export function PotMeter({ circle, round }: { circle: CircleSummary; round: RoundInfo }) {
  const reduce = useReducedMotion();
  const isActive = circle.status === 1;
  const expected = isActive ? round.expectedPot : (BigInt(circle.contribution) * BigInt(circle.maxMembers)).toString();
  const collected = isActive ? round.collected : "0";
  const percent = pct(collected, expected);

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        Pot (in contract)
        <Tooltip>
          <TooltipTrigger aria-label="What is the pot?"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent>{TOOLTIPS.pot}</TooltipContent>
        </Tooltip>
        <TestnetBadge size="xs" className="ml-auto" />
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <MstcAmount wei={collected} size="display" className="text-pot" unitClassName="hidden" />
        <span className="tnum text-xl font-semibold text-muted-foreground" aria-label={`of ${formatMst(expected)} MST expected`}>
          / {formatMst(expected)} MST
        </span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-pot/15" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Pot collected">
        <motion.div
          className="h-full rounded-full bg-pot"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
        <span className="tnum">{Math.round(percent)}%</span>
        <Tooltip>
          <TooltipTrigger className="tnum underline decoration-dotted underline-offset-2">Reserve {formatMst(circle.reserve)}</TooltipTrigger>
          <TooltipContent>{TOOLTIPS.reserve}</TooltipContent>
        </Tooltip>
        <span className="tnum">· Fee {pctFromBps(circle.feeBps)}</span>
        <Tooltip>
          <TooltipTrigger className="tnum underline decoration-dotted underline-offset-2">· Holdback {pctFromBps(circle.holdbackBps)}</TooltipTrigger>
          <TooltipContent>{TOOLTIPS.holdback}</TooltipContent>
        </Tooltip>
        {isActive && <span className="tnum">· Max discount {formatMst(round.maxDiscount)} ({pctFromBps(circle.maxDiscountBps)})</span>}
      </div>
    </Card>
  );
}
