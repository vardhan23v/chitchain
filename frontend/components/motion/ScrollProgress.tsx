"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";

/**
 * 2 px red reading-progress bar along the top edge of the sticky header (so it spans exactly the content area, to the right of the sidebar).
 * Positioned absolutely inside the header: the header's backdrop blur would make a fixed element resolve against it anyway.
 * Hidden when the page does not scroll or animations are off.
 */
export function ScrollProgress() {
  const ok = useMotionOK();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.4 });
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const check = () => setScrollable(document.documentElement.scrollHeight > window.innerHeight + 80);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.documentElement);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  if (!ok || !scrollable) return null;
  return <motion.div aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 z-50 h-0.5 origin-left bg-primary" style={{ scaleX }} />;
}
