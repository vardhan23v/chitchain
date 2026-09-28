"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/Avatar";
import { CollateralBar } from "@/components/CollateralBar";
import { ConfettiLite } from "@/components/Motion";
import { ContributionChip, WonChip } from "@/components/StatusChip";
import { TierChip } from "@/components/TierChip";
import { memberShort } from "@/lib/labels";
import { formatMst, shortAddr } from "@/lib/format";
import type { CircleSummary, MemberInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MemberExtra {
  wonRound?: number;
}

interface Props {
  m: MemberInfo;
  circle: CircleSummary;
  isYou: boolean;
  extra?: MemberExtra;
}

export function MemberCard({ m, circle, isYou, extra }: Props) {
  const reduce = useReducedMotion();
  const [shake, setShake] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const prevCollateral = useRef(m.collateral);
  const prevWon = useRef(m.hasWon);
  const circleActive = circle.status === 1;

  useEffect(() => {
    if (BigInt(m.collateral) < BigInt(prevCollateral.current) && !reduce) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 350);
      return () => clearTimeout(t);
    }
    prevCollateral.current = m.collateral;
  }, [m.collateral, reduce]);

  useEffect(() => {
    if (m.hasWon && !prevWon.current) setConfetti((n) => n + 1);
    prevWon.current = m.hasWon;
  }, [m.hasWon]);

  return (
    <motion.div
      className={cn(
        "relative flex min-w-[168px] flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm md:p-4",
        isYou && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        m.removed && "opacity-60 grayscale",
        shake && "animate-shake"
      )}
      animate={confetti && !reduce ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.4 }}
      data-testid="member-card"
    >
      <ConfettiLite trigger={confetti} />
      <div className="flex items-center gap-2">
        <Avatar address={m.address} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Link href={`/member/${m.address}`} className="hover:underline">{memberShort(m.label, m.address)}</Link>
            {isYou && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">You</span>}
          </div>
          <div className="truncate font-mono text-[12px] text-muted-foreground">{shortAddr(m.address)}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <TierChip tier={m.tier} circle={circle} short />
        {m.removed && (
          <Badge variant="status-removed"><XCircle className="h-3 w-3" aria-hidden />Removed</Badge>
        )}
        {m.hasWon && <WonChip round={extra?.wonRound} />}
        {!m.removed && circleActive && <ContributionChip status={m.contributionStatus} />}
      </div>
      <CollateralBar collateral={m.collateral} baseCollateral={circle.baseCollateral} tier={m.tier} removed={m.removed} circle={circle} />
      {m.defaults > 0 && <div className="text-[11px] text-muted-foreground">{m.defaults} missed · used {formatMst(m.collateralUsed)} MST collateral</div>}
    </motion.div>
  );
}

