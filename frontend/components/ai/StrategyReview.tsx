"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoBanner } from "@/components/InfoBanner";
import { PermissionCard } from "@/components/ai/PermissionCard";
import { DURATION_OPTIONS, LEVEL_LABEL, fmtMst, mstOf, type StrategyValues } from "@/components/ai/strategy";
import { shortAddr } from "@/lib/format";
import type { MemberInfo } from "@/lib/types";

interface Props {
  values: StrategyValues;
  member: MemberInfo;
  circleId: number;
  circleName?: string | null;
  /** Expected pot (wei) for the implied payout line. */
  pot: string | null;
  busy?: boolean;
  error?: string | null;
  onBack: () => void;
  onActivate: () => void;
}

/** Step 2: "Your AI strategy" summary, the permission card with limits, then activate. */
export function StrategyReview({ values, member, circleId, circleName, pot, busy, error, onBack, onActivate }: Props) {
  const potMst = mstOf(pot);
  const maxD = Number(values.maxDiscount);
  const floorPayout = Number.isFinite(potMst) && Number.isFinite(maxD) ? Math.max(0, potMst - maxD) : NaN;
  const duration = DURATION_OPTIONS.find((o) => o.value === values.duration);
  const expires = duration?.sec ? new Date(Date.now() + duration.sec * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "When the auction ends";
  const label = `Member ${member.label ?? shortAddr(member.address)}`;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold leading-tight">Your AI strategy</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">Read it once more. The agent follows exactly this, and the risk guard enforces the limits on every bid.</p>
      </div>

      <blockquote className="rounded-2xl border border-white/[0.08] bg-surface2 px-4 py-3 text-[14px] leading-snug">
        <span className="text-muted-foreground">Goal: </span>&ldquo;{values.goal}&rdquo;
      </blockquote>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] sm:grid-cols-3">
        <Item k="Desired payout" v={values.desiredPayout ? `${fmtMst(Number(values.desiredPayout))} MST` : "Not set"} />
        <Item k="Maximum discount" v={`${fmtMst(maxD)} MST (${values.maxDiscountPct}%)`} />
        <Item k="Lowest payout you accept" v={Number.isFinite(floorPayout) ? `${fmtMst(floorPayout)} MST` : "Depends on the pot"} />
        <Item k="Urgency" v={LEVEL_LABEL[values.urgency]} />
        <Item k="Risk tolerance" v={LEVEL_LABEL[values.riskTolerance]} />
        <Item k="Runs" v={duration?.label ?? "Until the auction ends"} />
        <Item k="Wallet" v={`${label} · ${shortAddr(member.address)}`} mono />
        <Item k="Circle" v={circleName ? `${circleName} (#${circleId})` : `Circle #${circleId}`} />
        <Item k="Demo rival" v={values.demoMode ? "On" : "Off"} />
      </dl>

      <PermissionCard
        checked={values.autonomous}
        summary={{ maxDiscountMst: fmtMst(maxD), maxDiscountPct: values.maxDiscountPct, circle: circleName ?? `#${circleId}`, member: label, expires }}
      />

      {!values.autonomous && (
        <InfoBanner tone="agent">Autonomous bidding is off. The agent will monitor and propose, then pause until you approve each bid.</InfoBanner>
      )}
      {error && <InfoBanner tone="danger" role="alert">{error}</InfoBanner>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onBack} disabled={busy}>Back</Button>
        <Button type="button" className="w-full bg-agent text-agent-foreground hover:bg-agent/90 sm:w-auto" onClick={onActivate} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />} Activate AI agent
        </Button>
      </div>
    </div>
  );
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{k}</dt>
      <dd className={mono ? "truncate font-mono text-[13px] font-medium" : "tnum truncate font-medium"}>{v}</dd>
    </div>
  );
}
