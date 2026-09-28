"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EASE } from "@/components/motion/Reveal";
import { MstcAmount } from "@/components/MstcAmount";
import { DemoBadge } from "@/components/TestnetBadge";
import { useCountdown } from "@/hooks/useCountdown";
import { formatClock, formatMst } from "@/lib/format";
import type { CircleSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Picks the circle worth showing first: newest active, else an open one still accepting members, else the newest finished one. */
export function pickFeatured(circles: CircleSummary[], now = Math.floor(Date.now() / 1000)): CircleSummary | null {
  const byId = [...circles].sort((a, b) => b.id - a.id);
  return (
    byId.find((c) => c.status === 1) ??
    byId.find((c) => c.status === 0 && c.joinDeadline > now) ??
    byId.find((c) => c.status === 2) ??
    byId[0] ??
    null
  );
}

/**
 * Hero object for the landing page: one real circle, drawn as the pot sitting inside the contract.
 * The ring is the contract; the dots on it are members; the number in the middle is what the contract holds this round.
 */
export function FeaturedCircle({ c }: { c: CircleSummary }) {
  const reduce = useReducedMotion();
  const active = c.status === 1;
  const open = c.status === 0;
  const live = active || open;
  const pot = BigInt(c.contribution) * BigInt(c.maxMembers);
  const join = useCountdown(c.joinDeadline, open);
  const round = useCountdown(c.roundDeadline, active);
  const n = Math.min(c.maxMembers, 20);
  const seats = Array.from({ length: n }, (_, i) => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    return { x: 100 + 82 * Math.cos(a), y: 100 + 82 * Math.sin(a), filled: i < c.memberCount };
  });
  const status = active ? `Round ${c.round} of ${c.maxMembers}` : open ? `${c.memberCount} of ${c.maxMembers} joined` : c.status === 2 ? "Completed" : "Cancelled";
  const clock = active ? `Round closes in ${formatClock(round.remaining)}` : open ? (join.remaining > 0 ? `Join window closes in ${formatClock(join.remaining)}` : "Join window closed") : `${c.maxMembers} rounds of ${formatMst(pot)} MST`;

  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`${c.name ?? `Circle #${c.id}`}: ${c.memberCount} of ${c.maxMembers} members, pot ${formatMst(pot)} MST`}>
        {/* Halo: the pot breathes (faster while a round is active). */}
        {!reduce && (
          <motion.circle
            cx="100"
            cy="100"
            r="66"
            fill="hsl(var(--pot))"
            style={{ transformOrigin: "100px 100px" }}
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: [0, 0.12, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: active ? 3.2 : 4.8, ease: "easeInOut", repeat: Infinity }}
          />
        )}
        {/* The contract ring and the members sitting on it turn together, slowly. */}
        <motion.g
          style={{ transformOrigin: "100px 100px" }}
          initial={{ rotate: 0 }}
          animate={reduce ? { rotate: 0 } : { rotate: 360 }}
          transition={reduce ? { duration: 0 } : { duration: 60, ease: "linear", repeat: Infinity, delay: 0.2 + n * 0.04 }}
        >
          {/* Invisible, symmetric bounds so the group's rotation origin is exactly the centre. */}
          <circle cx="100" cy="100" r="90" fill="none" stroke="none" />
          <circle cx="100" cy="100" r="82" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 4" />
          {seats.map((s, i) => (
            <motion.circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.filled ? 6 : 5}
              fill={s.filled ? "hsl(var(--primary))" : "rgba(255,255,255,0.8)"}
              stroke={s.filled ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              strokeOpacity={s.filled ? 1 : 0.5}
              strokeWidth="1.5"
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.2 + i * 0.04 }}
            />
          ))}
          {/* Contributions flow from each member into the pot, one seat after another. */}
          {live &&
            !reduce &&
            seats
              .filter((s) => s.filled)
              .map((s, i, arr) => (
                <motion.circle
                  key={`flow-${i}`}
                  r="2.2"
                  fill="hsl(var(--pot))"
                  initial={{ cx: s.x, cy: s.y, opacity: 0 }}
                  animate={{ cx: [s.x, 100], cy: [s.y, 100], opacity: [1, 0] }}
                  transition={{ duration: 1.6, ease: EASE, delay: 1 + i * 0.9, repeat: Infinity, repeatDelay: Math.max(0, arr.length * 0.9 - 1.6) }}
                />
              ))}
        </motion.g>
        <circle cx="100" cy="100" r="60" fill="rgba(255,255,255,0.7)" stroke="rgba(255,255,255,0.9)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs text-muted-foreground">{active ? "In the contract" : "Pot per round"}</span>
        <MstcAmount wei={pot} size="lg" className="text-pot" animate="fromZero" />
        <span className={cn("tnum mt-1 text-xs font-medium", active ? "text-primary" : "text-muted-foreground")}>{status}</span>
      </div>
      <div className="mt-2 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{c.name ?? `Circle #${c.id}`}</span>
          {c.isDemo && <DemoBadge />}
        </div>
        <span className="tnum text-xs text-muted-foreground">{clock}</span>
        <Button asChild size="sm" variant="outline" className="pointer-events-auto mt-1">
          <Link href={`/circle/${c.id}`}>{active ? "Watch this round" : open ? "Join the circle" : "View the summary"}</Link>
        </Button>
      </div>
    </div>
  );
}
