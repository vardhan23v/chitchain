"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";

interface Props {
  children: ReactNode;
  className?: string;
  /** Pixels of travel between entering at the bottom and leaving at the top of the viewport (moves against the scroll). */
  distance?: number;
  /** Fade to this opacity while the element leaves through the top; omit for no fade. */
  fadeTo?: number;
}

/** Scroll-linked drift: the block moves slightly faster than the page and can fade as it leaves. Static when animations are off. */
export function Parallax({ children, className, distance = 32, fadeTo }: Props) {
  const ok = useMotionOK();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const opacity = useTransform(scrollYProgress, [0.55, 1], [1, fadeTo ?? 1]);
  return (
    <motion.div ref={ref} className={className} style={ok ? { y, opacity } : undefined}>
      {children}
    </motion.div>
  );
}
