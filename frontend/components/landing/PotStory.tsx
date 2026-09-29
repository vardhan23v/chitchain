"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { formatMst } from "@/lib/format";

/** Real numbers from one circle that annotate the illustration. Omit for shapes only. */
export interface PotExample {
  potWei: bigint;
  contributionWei: bigint;
  maxMembers: number;
  maxDiscountBps: number;
  name: string;
}

const C = 160;
const R_RING = 112;
const R_POT = 70;

function seat(i: number, n: number) {
  const a = (-90 + (i * 360) / n) * (Math.PI / 180);
  return { x: C + R_RING * Math.cos(a), y: C + R_RING * Math.sin(a) };
}

function sectorPath(r: number, startDeg: number, sweepDeg: number): string {
  const a0 = ((startDeg - 90) * Math.PI) / 180;
  const a1 = ((startDeg + sweepDeg - 90) * Math.PI) / 180;
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${C} ${C} L ${C + r * Math.cos(a0)} ${C + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${C + r * Math.cos(a1)} ${C + r * Math.sin(a1)} Z`;
}

/**
 * One member seat on the contract ring, driven by the story progress p in [0, 1]:
 * 0.02–0.14 the dot appears, 0.15–0.21 its collateral tag, 0.27–0.49 a coin travels into the pot,
 * 0.55–0.78 a bid ring on some seats, 0.86–0.98 a dividend coin travels back out (the winner gets a trophy ring instead).
 */
function Seat({ i, n, p, winner }: { i: number; n: number; p: MotionValue<number>; winner: boolean }) {
  const s = seat(i, n);
  const f = i / n;
  const t0 = 0.02 + f * 0.12;
  const dot = useTransform(p, [t0, t0 + 0.05], [0, 1]);
  const lockT = 0.15 + f * 0.06;
  const lock = useTransform(p, [lockT, lockT + 0.04], [0, 1]);
  const c0 = 0.27 + f * 0.1;
  const cx = useTransform(p, [c0, c0 + 0.12], [s.x, C]);
  const cy = useTransform(p, [c0, c0 + 0.12], [s.y, C]);
  const cop = useTransform(p, [c0 - 0.005, c0, c0 + 0.11, c0 + 0.12], [0, 1, 1, 0]);
  const bidT = 0.55 + (i % 3) * 0.05;
  const bid = useTransform(p, [bidT, bidT + 0.05, 0.74, 0.78], [0, 1, 1, 0]);
  const d0 = 0.86 + f * 0.06;
  const dx = useTransform(p, [d0, d0 + 0.08], [C, s.x]);
  const dy = useTransform(p, [d0, d0 + 0.08], [C, s.y]);
  const dop = useTransform(p, [d0 - 0.005, d0, d0 + 0.07, d0 + 0.08], [0, 1, 1, 0]);
  const win = useTransform(p, [0.9, 0.95], [0, 1]);
  const bids = winner || i % 2 === 0;
  const origin = { transformBox: "fill-box" as const, transformOrigin: "center" };
  return (
    <g>
      <motion.circle cx={s.x} cy={s.y} r={7} fill="hsl(var(--primary))" style={{ scale: dot, ...origin }} />
      <motion.circle cx={s.x + 9} cy={s.y - 9} r={3.5} fill="hsl(var(--warning))" style={{ scale: lock, ...origin }} />
      <motion.g style={{ x: cx, y: cy, opacity: cop }}>
        <circle r={4} fill="hsl(var(--pot))" />
      </motion.g>
      {bids && <motion.circle cx={s.x} cy={s.y} r={13} fill="none" stroke="hsl(var(--agent))" strokeWidth={2} style={{ scale: bid, opacity: bid, ...origin }} />}
      {winner ? (
        <motion.circle cx={s.x} cy={s.y} r={14} fill="none" stroke="hsl(var(--success))" strokeWidth={2.5} style={{ scale: win, opacity: win, ...origin }} />
      ) : (
        <motion.g style={{ x: dx, y: dy, opacity: dop }}>
          <circle r={3} fill="hsl(var(--success))" />
        </motion.g>
      )}
    </g>
  );
}

/** The pot in the middle: fills as coins arrive (0.27–0.49), shows the discount wedge (0.52–0.78) and drains at payout (0.8–0.9). */
function Pot({ p, example, sweep }: { p: MotionValue<number>; example: PotExample | null; sweep: number }) {
  const fillIn = useTransform(p, [0.27, 0.49], [0, 1]);
  const drain = useTransform(p, [0.8, 0.9], [1, 0.15]);
  const level = useTransform([fillIn, drain], ([a, b]) => (a as number) * (b as number));
  const wedge = useTransform(p, [0.52, 0.6, 0.78, 0.82], [0, 1, 1, 0]);
  const ring = useTransform(p, [0, 0.08], [0.25, 1]);
  const amount = useRef<SVGTextElement>(null);

  useEffect(() => {
    const paint = (v: number) => {
      if (!amount.current) return;
      amount.current.textContent = example ? `${formatMst((example.potWei * BigInt(Math.round(v * 1000))) / 1000n)} MST` : "";
    };
    paint(level.get());
    return level.on("change", paint);
  }, [level, example]);

  return (
    <g>
      <motion.circle cx={C} cy={C} r={R_RING} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="3 4" style={{ opacity: ring }} />
      <defs>
        <clipPath id="pot-story-clip">
          <circle cx={C} cy={C} r={R_POT - 2} />
        </clipPath>
      </defs>
      <circle cx={C} cy={C} r={R_POT} fill="hsl(var(--surface-2))" stroke="rgba(255,255,255,0.12)" />
      <g clipPath="url(#pot-story-clip)">
        <motion.rect x={C - R_POT} y={C - R_POT} width={R_POT * 2} height={R_POT * 2} fill="hsl(var(--pot))" fillOpacity={0.28} style={{ scaleY: level, originY: 1, transformBox: "fill-box" }} />
      </g>
      <motion.path d={sectorPath(R_POT - 2, 0, sweep)} fill="hsl(var(--agent))" fillOpacity={0.45} style={{ scale: wedge, opacity: wedge, transformBox: "fill-box", transformOrigin: "center" }} />
      <text x={C} y={C - 6} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
        Pot
      </text>
      <text ref={amount} x={C} y={C + 14} textAnchor="middle" fontSize="15" fontWeight="600" fill="hsl(var(--pot))" className="tnum" />
    </g>
  );
}

/** The payout coin leaves the pot for the winner's seat (0.8–0.9). */
function Payout({ p, to }: { p: MotionValue<number>; to: { x: number; y: number } }) {
  const x = useTransform(p, [0.8, 0.9], [C, to.x]);
  const y = useTransform(p, [0.8, 0.9], [C, to.y]);
  const op = useTransform(p, [0.79, 0.8, 0.89, 0.9], [0, 1, 1, 0]);
  return (
    <motion.g style={{ x, y, opacity: op }}>
      <circle r={8} fill="hsl(var(--success))" />
    </motion.g>
  );
}

/**
 * Scroll-driven illustration of one chit round: a contract ring with member seats and the pot in the middle.
 * `progress` runs 0 → 1 over the four steps (Join, Contribute, Bid, Settle); see the ranges on Seat and Pot.
 */
export function PotStory({ progress, example, className }: { progress: MotionValue<number>; example: PotExample | null; className?: string }) {
  const n = Math.min(Math.max(example?.maxMembers ?? 5, 2), 8);
  const sweep = Math.max(20, Math.min(160, ((example?.maxDiscountBps ?? 2500) / 10000) * 360));
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      role="img"
      aria-label="How a chit round works: members join and lock collateral and contribute to the pot. The round's recipient accepts the full pot, or declines and members offer to take less. The winner is paid out and any discount is shared as dividends."
    >
      <Pot p={progress} example={example} sweep={sweep} />
      {Array.from({ length: n }, (_, i) => (
        <Seat key={`${n}-${i}`} i={i} n={n} p={progress} winner={i === 0} />
      ))}
      <Payout p={progress} to={seat(0, n)} />
    </svg>
  );
}
