"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ShieldCheck, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EASE } from "@/components/motion/Reveal";
import { explainFactor } from "@/components/RiskFactors";
import { scoreColor } from "@/components/ScoreGauge";
import { TierChip } from "@/components/TierChip";
import type { RiskResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  data: RiskResult | null;
  loading?: boolean;
  error?: string | null;
  /** Link target for "Full profile" (omit to hide). */
  href?: string;
  className?: string;
}

const R = 40;
const CIRC = 2 * Math.PI * R;

/** Radial arc (draws on view), score/100, tier, on-chain counters, factor list and the explanation behind "Why this score?". */
export function RiskCard({ data, loading, error, href, className }: Props) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const score = data ? Math.max(0, Math.min(100, Math.round(data.score))) : 0;
  const arc = (score / 100) * CIRC * 0.75; // 270° arc

  return (
    <Card className={cn("p-4 md:p-5", className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-agent" aria-hidden />
        <h2 className="text-[16px] font-semibold leading-tight tracking-tight">AI risk</h2>
        {href && <Link href={href} className="ml-auto text-[13px] text-primary hover:underline">Full profile</Link>}
      </div>

      {loading && !data ? (
        <div className="mt-4 flex items-center gap-5" aria-busy="true">
          <Skeleton className="h-28 w-28 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
        </div>
      ) : !data ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center text-[13px] text-muted-foreground">
          <WifiOff className="h-5 w-5" aria-hidden />
          <span className="font-semibold text-foreground">Risk assessment is temporarily unavailable.</span>
          <span>{error ?? "Try again in a moment."}</span>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Risk score ${score} out of 100, where 0 is safest and 100 is riskiest`}>
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-[135deg]">
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${CIRC * 0.75} ${CIRC}`} />
                <motion.circle
                  cx="50" cy="50" r={R} fill="none" stroke={scoreColor(score)} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${arc} ${CIRC}`}
                  initial={reduce ? false : { strokeDasharray: `0 ${CIRC}` }}
                  whileInView={{ strokeDasharray: `${arc} ${CIRC}` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="tnum text-[28px] font-semibold leading-none text-foreground">{score}</span>
                <span className="text-[11px] text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <TierChip tier={data.tier} />
              <dl className="tnum grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
                <div><dt className="text-muted-foreground">Paid on time</dt><dd className="font-semibold">{data.reputation.paidOnTime}</dd></div>
                <div><dt className="text-muted-foreground">Completed</dt><dd className="font-semibold">{data.reputation.circlesCompleted}</dd></div>
                <div><dt className="text-muted-foreground">Missed</dt><dd className={cn("font-semibold", data.reputation.missed > 0 && "text-warning")}>{data.reputation.missed}</dd></div>
                <div><dt className="text-muted-foreground">Removed</dt><dd className={cn("font-semibold", data.reputation.circlesRemoved > 0 && "text-danger")}>{data.reputation.circlesRemoved}</dd></div>
              </dl>
            </div>
          </div>

          {data.factors.length > 0 && (
            <ul className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px]">
              {data.factors.map((f) => (
                <li key={f.name} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="tnum font-semibold">{f.value}</span>
                  <span className="text-[12px] text-muted-foreground">{f.effect}</span>
                </li>
              ))}
            </ul>
          )}

          <Button variant="ghost" size="sm" className="mt-3 -ml-2 text-[13px]" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            Why this score? <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden />
          </Button>
          {open && (
            <div className="mt-1 space-y-2 text-[13px] text-muted-foreground">
              <p className="text-foreground">{data.explanation}</p>
              <ul className="space-y-1">
                {data.factors.map((f) => <li key={f.name}><span className="font-medium text-foreground">{f.name}:</span> {explainFactor(f.name)}</li>)}
              </ul>
              <p>Source: {data.dataSource === "SYNTHETIC" ? "synthetic demo history" : data.dataSource === "ONCHAIN" ? "on-chain history" : "mixed synthetic and on-chain history"}. Explanation by {data.explanationSource === "llm" ? "AI" : "template"}.</p>
            </div>
          )}
        </>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Heuristic risk assessment, experimental, not a credit decision.</p>
    </Card>
  );
}
