"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TOOLTIPS } from "@/lib/labels";
import { TIER_MULTIPLIER } from "@/lib/chain";
import { formatMstc } from "@/lib/format";
import type { Tier } from "@/lib/types";

interface Props {
  collateral: string; // wei
  baseCollateral: string; // wei
  tier: Tier;
  removed?: boolean;
}

/** Pre-win requirement = baseCollateral × tier multiplier (ARCHITECTURE §3.2). */
export function preWinRequired(baseCollateral: string, tier: Tier): bigint {
  const base = BigInt(baseCollateral || "0");
  const mult = TIER_MULTIPLIER[tier] ?? 2;
  return (base * BigInt(Math.round(mult * 100))) / 100n;
}

/**
 * Filled = current collateral, outline = required (pre-win).
 * When collateral exceeds the pre-win requirement (post-win holdback) the excess is a striped segment.
 */
export function CollateralBar({ collateral, baseCollateral, tier, removed }: Props) {
  const reduce = useReducedMotion();
  const cur = BigInt(collateral || "0");
  const req = preWinRequired(baseCollateral, tier);
  const scale = cur > req ? cur : req;
  const w = (v: bigint) => (scale === 0n ? 0 : Number((v * 10000n) / scale) / 100);
  const solid = cur > req ? req : cur;
  const holdback = cur > req ? cur - req : 0n;
  const label = `Collateral ${formatMstc(cur)} of ${formatMstc(req)} MSTC required${holdback > 0n ? `, plus ${formatMstc(holdback)} held back` : ""}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <Tooltip>
          <TooltipTrigger className="underline decoration-dotted underline-offset-2">Collateral</TooltipTrigger>
          <TooltipContent>{TOOLTIPS.collateral}</TooltipContent>
        </Tooltip>
        <span className="tnum" aria-hidden>
          {formatMstc(cur)} / {formatMstc(req)}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full border border-primary/40 bg-transparent" role="img" aria-label={label}>
        <motion.div
          className={removed ? "h-full bg-muted-foreground/40" : "h-full bg-primary"}
          initial={false}
          animate={{ width: `${w(solid)}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
        />
        {holdback > 0n && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                className="striped-primary absolute top-0 h-full"
                style={{ left: `${w(solid)}%` }}
                initial={false}
                animate={{ width: `${w(holdback)}%` }}
                transition={reduce ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
              />
            </TooltipTrigger>
            <TooltipContent>{TOOLTIPS.holdback}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
