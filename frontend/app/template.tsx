"use client";

import { motion } from "framer-motion";
import { EASE } from "@/components/motion/Reveal";

/** Page transition: fade + 8 px rise, 250 ms. MotionConfig reducedMotion="user" in Providers drops the transform under reduced motion. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
      {children}
    </motion.div>
  );
}
