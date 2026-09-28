"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MstcAmount } from "@/components/MstcAmount";
import { SectionTitle } from "@/components/PageHeader";
import { TestnetBadge } from "@/components/TestnetBadge";
import { pctFromBps } from "@/lib/chain";
import { TOOLTIPS } from "@/lib/labels";
import { formatMst, pct } from "@/lib/format";
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

/** DESIGN §6.3 POT column: the visual anchor — big number, animated bar, compact meta row with tooltips. */
export function PotMeter({ circle, round }: { circle: CircleSummary; round: RoundInfo }) {
  const reduce = useReducedMotion();
  const isActive = circle.status === 1;
  const expected = isActive ? round.expectedPot : (BigInt(circle.contribution) * BigInt(circle.maxMembers)).toString();
  const collected = isActive ? round.collected : "0";
  const percent = pct(collected, expected);

  return (
    <Card className="relative overflow-hidden p-4 md:p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pot/10 blur-2xl" aria-hidden />
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
        Pot · in contract
      </SectionTitle>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <MstcAmount wei={collected} size="display" className="text-pot" unitClassName="hidden" />
        <span className="tnum text-lg font-semibold text-muted-foreground" aria-label={`of ${formatMst(expected)} MST expected`}>
          / {formatMst(expected)} <span className="text-sm">MST</span>
        </span>
        <span className="tnum ml-auto text-sm font-semibold text-pot">{Math.round(percent)}%</span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-pot/15" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Pot collected">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-pot to-pot/80"
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
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
