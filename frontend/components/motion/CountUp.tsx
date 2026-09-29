"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { useReducedMotion } from "@/components/motion/MotionPref";
import { formatUnits } from "ethers";
import { EASE } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  /** Formats the in-flight number; defaults to en-IN with `decimals` fraction digits. */
  format?: (n: number) => string;
  decimals?: number;
  /** Count from 0 on first mount (hero / stat tiles). Otherwise the first render is at rest. */
  fromZero?: boolean;
  className?: string;
}

const defaultFormat = (decimals: number) => (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** Tweens a number from its previous value to the next one (0.45 s). No-op under reduced motion. */
export function CountUp({ value, format, decimals = 0, fromZero = false, className }: Props) {
  const reduce = useReducedMotion();
  const fmt = format ?? defaultFormat(decimals);
  const [shown, setShown] = useState(fromZero ? 0 : value);
  const prev = useRef(fromZero ? 0 : value);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    if (reduce || prev.current === value) {
      prev.current = value;
      setShown(value);
      return;
    }
    const from = prev.current;
    prev.current = value;
    const controls = animate(from, value, { duration: 0.45, ease: EASE, onUpdate: (v) => setShown(v) });
    return () => controls.stop();
  }, [value, reduce]);

  return <span className={cn("tnum", className)}>{fmt(Number.isFinite(shown) ? shown : value)}</span>;
}

/** Wei → MST number (2 decimals on screen). */
export function mstNumber(wei: bigint | string | number | null | undefined): number {
  if (wei === null || wei === undefined || wei === "") return 0;
  try {
    return Number(formatUnits(typeof wei === "bigint" ? wei : BigInt(String(wei)), 18));
  } catch {
    return 0;
  }
}

/** CountUp for an MST amount given in wei. */
export function CountUpMst({ wei, decimals = 2, fromZero, className }: { wei: bigint | string | number | null | undefined; decimals?: number; fromZero?: boolean; className?: string }) {
  return <CountUp value={mstNumber(wei)} decimals={decimals} fromZero={fromZero} className={className} />;
}
