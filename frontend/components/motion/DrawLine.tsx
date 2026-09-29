"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "div" | "ol" | "ul";
  /** Tailwind background class for the drawn part of the rail. */
  color?: string;
}

/** A vertical rail on the left edge that draws itself as the list scrolls through the viewport. Fully drawn when animations are off. */
export function DrawLine({ children, className, as = "div", color = "bg-white/[0.2]" }: Props) {
  const ok = useMotionOK();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 60%"] });
  const M = (as === "ol" ? motion.ol : as === "ul" ? motion.ul : motion.div) as typeof motion.div;
  return (
    <M ref={ref} className={cn("relative", className)}>
      <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-0 w-px bg-white/[0.07]" />
      <motion.span aria-hidden className={cn("pointer-events-none absolute bottom-0 left-0 top-0 w-px origin-top", color)} style={ok ? { scaleY: scrollYProgress } : undefined} />
      {children}
    </M>
  );
}
