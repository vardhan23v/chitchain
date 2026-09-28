"use client";

import Link from "next/link";
import { CheckCircle2, CircleDot, Circle as CircleIcon, Timer, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RevealItem } from "@/components/motion/Reveal";
import { MstcAmount } from "@/components/MstcAmount";
import { DemoBadge } from "@/components/TestnetBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock, formatDuration } from "@/lib/format";
import type { CircleSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS = {
  0: { label: "Open", Icon: CircleIcon, variant: "pot" },
  1: { label: "Active", Icon: CircleDot, variant: "status-won" },
  2: { label: "Completed", Icon: CheckCircle2, variant: "status-paid" },
  3: { label: "Cancelled", Icon: XCircle, variant: "status-removed" },
} as const;

export function CircleCard({ c }: { c: CircleSummary }) {
  const st = STATUS[c.status];
  const fill = useCountdown(c.joinDeadline, c.status === 0);
  const pot = BigInt(c.contribution) * BigInt(c.maxMembers);
  const cta = c.status === 0 ? "Join circle" : c.status === 1 ? "Open room" : "View summary";
  const done = c.status >= 2;

  return (
    <RevealItem className="flex min-w-0">
    <Card className={cn("flex w-full flex-col gap-4 p-4 md:p-5", done && "bg-card/70")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold" title={c.name ? `${c.name} · Circle #${c.id}` : undefined}>{c.name ?? `Circle #${c.id}`}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {c.name && <span className="tnum">Circle #{c.id} ·</span>}
            {c.status === 1 && <span className="tnum">Round {c.round} of {c.maxMembers}</span>}
            {c.status === 0 && <span className="tnum">{c.memberCount}/{c.maxMembers} joined</span>}
            {c.isDemo && <DemoBadge className="ml-0.5" />}
          </div>
        </div>
        <Badge variant={st.variant} className="shrink-0">
          <st.Icon className="h-3 w-3" aria-hidden />
          {st.label}
        </Badge>
      </div>

      <div>
        <div className="text-[11px] font-medium text-muted-foreground">{c.status === 0 ? "Pot per round" : c.status === 1 ? "Pot this round" : "Pot per round"}</div>
        <MstcAmount wei={pot} size="lg" className={done ? "text-foreground" : "text-pot"} />
        <div className="tnum mt-0.5 text-xs text-muted-foreground">
          {c.status === 2 || c.status === 3 ? `${c.maxMembers} rounds · ${c.memberCount} members` : <><MstcAmount wei={c.contribution} size="sm" className="text-foreground" /> per member · rounds of {formatDuration(c.contributionDuration + c.biddingDuration)}</>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" aria-label={`${c.memberCount} of ${c.maxMembers} members`}>
          <span className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: Math.min(c.maxMembers, 12) }, (_, i) => (
              <span key={i} className={cn("h-2 w-2 rounded-full", i < c.memberCount ? "bg-primary" : "border border-muted-foreground/40")} />
            ))}
          </span>
          <span className="tnum ml-1">{c.memberCount}/{c.maxMembers} members</span>
        </span>
        {c.status === 0 && (
          <span className={cn("tnum inline-flex items-center gap-1", fill.remaining > 0 && fill.remaining < 600 && "text-warning")}>
            <Timer className="h-3 w-3" aria-hidden />
            {fill.remaining > 0 ? `fills in ${formatClock(fill.remaining)}` : "join window closed"}
          </span>
        )}
      </div>

      <Button asChild variant={done ? "outline" : "default"} className="mt-auto w-full">
        <Link href={`/circle/${c.id}`}>{cta}</Link>
      </Button>
    </Card>
    </RevealItem>
  );
}
