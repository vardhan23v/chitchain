"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { TOOLTIPS } from "@/lib/labels";
import { formatMstc, pct } from "@/lib/format";
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
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <MstcAmount wei={collected} size="display" className="text-pot" unitClassName="hidden" />
        <span className="tnum text-xl font-semibold text-muted-foreground" aria-label={`of ${formatMstc(expected)} MSTC expected`}>
          / {formatMstc(expected)} MSTC
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
          <TooltipTrigger className="tnum underline decoration-dotted underline-offset-2">Reserve {formatMstc(circle.reserve)}</TooltipTrigger>
          <TooltipContent>{TOOLTIPS.reserve}</TooltipContent>
        </Tooltip>
        <span className="tnum">· Fee {(circle.feeBps / 100).toFixed(circle.feeBps % 100 ? 2 : 0)}%</span>
        {isActive && (
          <span className="tnum">· Max discount {formatMstc(round.maxDiscount)}</span>
        )}
      </div>
    </Card>
  );
}
