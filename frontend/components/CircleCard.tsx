"use client";

import Link from "next/link";
import { CheckCircle2, CircleDot, Circle as CircleIcon, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MstcAmount } from "@/components/MstcAmount";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock, formatDuration } from "@/lib/format";
import type { CircleSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS = {
  0: { label: "Open", Icon: CircleIcon, cls: "text-pot" },
  1: { label: "Active", Icon: CircleDot, cls: "text-primary" },
  2: { label: "Completed", Icon: CheckCircle2, cls: "text-success" },
  3: { label: "Cancelled", Icon: XCircle, cls: "text-danger" },
} as const;

export function CircleCard({ c }: { c: CircleSummary }) {
  const st = STATUS[c.status];
  const fill = useCountdown(c.joinDeadline, c.status === 0);
  const pot = BigInt(c.contribution) * BigInt(c.maxMembers);
  const cta = c.status === 0 ? "Join" : c.status === 1 ? "Open room" : "View";

  return (
    <Card className="flex flex-col gap-3 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Circle #{c.id}</span>
        <span className={cn("inline-flex items-center gap-1 text-[13px] font-medium", st.cls)}>
          <st.Icon className="h-3.5 w-3.5" aria-hidden />
          {st.label}
          {c.status === 1 && ` R${c.round}/${c.maxMembers}`}
          {c.status === 0 && ` ${c.memberCount}/${c.maxMembers}`}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        {c.status === 0 ? (
          <>
            <MstcAmount wei={c.contribution} size="sm" className="text-foreground" />/round · pot <MstcAmount wei={pot} size="sm" className="text-foreground" />
          </>
        ) : c.status === 1 ? (
          <>
            Pot <MstcAmount wei={pot} size="sm" className="text-pot" /> · rounds of {formatDuration(c.roundDuration)}
          </>
        ) : (
          <>{c.maxMembers} rounds · {c.memberCount} members</>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-0.5" aria-label={`${c.memberCount} of ${c.maxMembers} members`}>
          {Array.from({ length: c.maxMembers }, (_, i) => (
            <span key={i} className={cn("h-2 w-2 rounded-full", i < c.memberCount ? "bg-primary" : "border border-muted-foreground/40")} />
          ))}
          <span className="ml-1">members</span>
        </span>
        {c.status === 0 && <span className="tnum">{fill.remaining > 0 ? `fills in ${formatClock(fill.remaining)}` : "join window closed"}</span>}
      </div>
      <Button asChild variant={c.status === 2 || c.status === 3 ? "outline" : "default"} className="mt-1 w-full">
        <Link href={`/circle/${c.id}`}>{cta}</Link>
      </Button>
    </Card>
  );
}
