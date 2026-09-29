"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  /** Maximum lean in px. */
  max?: number;
  /** Fraction of the pointer offset applied. */
  strength?: number;
}

/** The child (a button) leans toward the mouse by up to `max` px and springs back on leave. Mouse only; static when animations are off. */
export function Magnetic({ children, className, max = 6, strength = 0.28 }: Props) {
  const ok = useMotionOK();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 20, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 300, damping: 20, mass: 0.5 });

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ok || e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const dx = (e.clientX - (r.left + r.width / 2)) * strength;
    const dy = (e.clientY - (r.top + r.height / 2)) * strength;
    x.set(Math.max(-max, Math.min(max, dx)));
    y.set(Math.max(-max, Math.min(max, dy)));
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} className={cn("inline-flex", className)} style={ok ? { x: sx, y: sy } : undefined} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
    </motion.div>
  );
}
