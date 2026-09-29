"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion/Reveal";
import { useMotionOK } from "@/components/motion/MotionPref";

interface Props {
  text: string;
  className?: string;
  /** Seconds before the first word starts. */
  delay?: number;
  /** Seconds between words. */
  stagger?: number;
}

/** Headline reveal: each word rises out of its own clipped line. Screen readers get the plain sentence; plain text when animations are off. */
export function SplitText({ text, className, delay = 0, stagger = 0.05 }: Props) {
  const ok = useMotionOK();
  if (!ok) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
          <motion.span className="inline-block" initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: EASE, delay: delay + i * stagger }}>
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
