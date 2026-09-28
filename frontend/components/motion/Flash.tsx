"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

interface Props {
  /** Flashes whenever this changes after the first render. */
  value: unknown;
  children: ReactNode;
  className?: string;
  /** Tint class for the overlay (default primary at 10 %). */
  tint?: string;
}

/**
 * Brief background tint (overlay fades 1 → 0 in 0.5 s) when `value` changes.
 * Opacity only, no layout change. No-op under reduced motion.
 */
export function Flash({ value, children, className, tint = "bg-primary/10" }: Props) {
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    if (!reduce) setTick((n) => n + 1);
  }, [value, reduce]);

  return (
    <span className={cn("relative", className)}>
      {tick > 0 && (
        <motion.span
          key={tick}
          aria-hidden
          className={cn("pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-lg", tint)}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      )}
      <span className="relative">{children}</span>
    </span>
  );
}
