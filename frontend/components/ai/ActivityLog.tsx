"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Ban, Bot, CheckCircle2, Eye, Flag, Gavel, Info, Loader2, PauseCircle, RefreshCw, ShieldCheck, ShieldX, Square, Swords, XCircle, type LucideIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EASE } from "@/components/motion/Reveal";
import { TxLink } from "@/components/TxLink";
import { MAX_EVENTS, type Transport } from "@/hooks/useBidAgent";
import type { AgentEvent, AgentEventKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND: Record<AgentEventKind, { Icon: LucideIcon; color: string }> = {
  REFRESH: { Icon: RefreshCw, color: "text-muted-foreground" },
  BID_SEEN: { Icon: Eye, color: "text-primary" },
  EVALUATED: { Icon: Bot, color: "text-agent" },
  DECISION: { Icon: Gavel, color: "text-agent" },
  RISK_PASSED: { Icon: ShieldCheck, color: "text-success" },
  RISK_BLOCKED: { Icon: ShieldX, color: "text-warning" },
  TX_SUBMITTED: { Icon: Loader2, color: "text-chain" },
  TX_CONFIRMED: { Icon: CheckCircle2, color: "text-success" },
  TX_FAILED: { Icon: XCircle, color: "text-danger" },
  PAUSED: { Icon: PauseCircle, color: "text-warning" },
  STOPPED: { Icon: Square, color: "text-muted-foreground" },
  DONE: { Icon: Flag, color: "text-primary" },
  RIVAL_BID: { Icon: Swords, color: "text-pot" },
  INFO: { Icon: Info, color: "text-muted-foreground" },
};

export function clockTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface Props {
  /** Ascending by id; rendered newest first. */
  events: AgentEvent[];
  transport: Transport;
  loading?: boolean;
  className?: string;
}

/** Live activity: newest first, monospace timestamps, tx links, fresh rows slide in (same rule as the room feed). */
export function ActivityLog({ events, transport, loading, className }: Props) {
  const rows = events.slice(-MAX_EVENTS).reverse();
  // Ids present in the first batch render at rest; anything that arrives later slides in.
  const seen = useRef<Set<number> | null>(null);
  if (seen.current === null && !loading) seen.current = new Set(rows.map((e) => e.id));
  const isFresh = (id: number) => seen.current !== null && !seen.current.has(id);
  useEffect(() => {
    if (!seen.current) return;
    for (const e of rows) seen.current.add(e.id);
  });

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-agent" aria-hidden />
        <h3 className="text-[15px] font-semibold leading-tight">Activity</h3>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {transport === "sse" ? (
            <>
              <span className="relative flex h-2 w-2" aria-hidden><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              Live
            </>
          ) : transport === "polling" ? (
            <>
              <RefreshCw className="h-3 w-3" aria-hidden /> Refreshing every 3 s
            </>
          ) : null}
        </span>
      </div>
      <ScrollArea className="mt-2 h-[300px] rounded-xl border border-white/[0.08] bg-white/[0.03] md:h-[360px]">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{loading ? "Loading activity" : "Waiting for the first evaluation."}</p>
        ) : (
          <ul className="space-y-0.5 p-1.5 pr-3" aria-live="polite" aria-relevant="additions">
            <AnimatePresence initial={false}>
              {rows.map((e) => <Row key={e.id} e={e} fresh={isFresh(e.id)} />)}
            </AnimatePresence>
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

function Row({ e, fresh }: { e: AgentEvent; fresh: boolean }) {
  const meta = KIND[e.kind] ?? KIND.INFO;
  const tx = e.data?.txHash;
  const emphasis = e.kind === "TX_CONFIRMED" || e.kind === "DECISION" || e.kind === "RIVAL_BID";
  return (
    <motion.li
      layout="position"
      initial={fresh ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("flex items-start gap-2.5 rounded-xl px-2 py-2 text-[13px] leading-snug", e.kind === "TX_FAILED" && "bg-danger/[0.06]", e.kind === "TX_CONFIRMED" && "bg-success/[0.06]")}
    >
      <span className="tnum mt-0.5 shrink-0 font-mono text-[11px] text-muted-foreground" aria-label={new Date(e.ts * 1000).toLocaleString()}>{clockTime(e.ts)}</span>
      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", meta.color)} style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }} aria-hidden>
        <meta.Icon className={cn("h-3 w-3", e.kind === "TX_SUBMITTED" && "animate-spin")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn(emphasis && "font-medium")}>
          {e.text}
          {e.data?.demoRival && <span className="ml-1.5 rounded-full border border-pot/30 bg-pot/10 px-1.5 text-[10px] font-semibold text-pot">Demo rival</span>}
        </div>
        {e.reason && <div className="mt-0.5 text-[12px] text-muted-foreground">{e.reason}</div>}
        {tx && <TxLink hash={tx} className="mt-0.5 text-[12px]" />}
      </div>
    </motion.li>
  );
}

/** Kind icon for reuse in the status line. */
export function kindIcon(kind: AgentEventKind): { Icon: LucideIcon; color: string } {
  return KIND[kind] ?? { Icon: Ban, color: "text-muted-foreground" };
}
