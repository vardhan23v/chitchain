"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { renderFeedEvent } from "@/components/FeedItem";
import { useMotionOK } from "@/components/motion/MotionPref";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { timeAgo } from "@/lib/format";
import type { FeedEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Ticker of the newest real on-chain events across every circle. Scrolls continuously and pauses on hover;
 * a static row when animations are off. Renders nothing when the feed is empty or unavailable.
 */
export function LiveTicker({ className }: { className?: string }) {
  const ok = useMotionOK();
  const feed = usePolling<FeedEvent[]>(() => api.feed({ limit: 16 }).then((r) => r.events), POLL_API_MS * 3, []);
  const events = feed.data ?? [];

  if (feed.loading && !feed.data) return <Skeleton className={cn("h-9 w-full rounded-full", className)} />;
  if (events.length === 0) return null;

  const now = Date.now();
  const items = events.map((e) => ({ e, r: renderFeedEvent(e, {}) }));
  const row = (suffix: string, hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-2 pr-2" aria-hidden={hidden || undefined}>
      {items.map(({ e, r }) => (
        <li key={`${e.id}-${suffix}`} className="shrink-0">
          <Link
            href={e.circleId ? `/circle/${e.circleId}` : "/activity"}
            tabIndex={hidden ? -1 : undefined}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-surface px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
          >
            <r.Icon className={cn("h-3.5 w-3.5 shrink-0", r.color)} aria-hidden />
            <span className="whitespace-nowrap text-foreground">{r.text}</span>
            <span className="tnum whitespace-nowrap">{timeAgo(e.ts, now)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Latest on-chain events" className={cn("flex items-center gap-3", className)}>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
        <Radio className="h-3 w-3" aria-hidden /> Live
      </span>
      <div className="ticker-mask relative min-w-0 flex-1 overflow-hidden">
        <div className={cn("flex", ok && "ticker-track")} style={ok ? { animationDuration: `${Math.max(36, items.length * 4)}s` } : undefined}>
          {row("a", false)}
          {ok && row("b", true)}
        </div>
      </div>
    </section>
  );
}
