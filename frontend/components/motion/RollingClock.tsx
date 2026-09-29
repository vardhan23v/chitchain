"use client";

import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "@/components/motion/Reveal";
import { useMotionOK } from "@/components/motion/MotionPref";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

/** mm:ss where each digit rolls up when it changes, odometer style. Plain text when animations are off. */
export function RollingClock({ seconds, className }: { seconds: number; className?: string }) {
  const ok = useMotionOK();
  const text = formatClock(seconds);
  if (!ok) return <span className={cn("tnum", className)}>{text}</span>;
  return (
    <span className={cn("tnum inline-flex leading-[1.2]", className)} role="timer" aria-label={text}>
      {text.split("").map((ch, i) =>
        ch === ":" ? (
          <span key={`c${i}`} aria-hidden>
            :
          </span>
        ) : (
          <span key={`d${i}`} className="relative inline-block h-[1.2em] w-[0.62em] overflow-hidden text-center" aria-hidden>
            <AnimatePresence initial={false}>
              <motion.span
                key={ch}
                className="absolute inset-0 block"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-100%", opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {ch}
              </motion.span>
            </AnimatePresence>
          </span>
        ),
      )}
    </span>
  );
}
