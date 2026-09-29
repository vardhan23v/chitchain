"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";

/** 2 px red reading-progress bar along the top of the viewport (to the right of the sidebar). Hidden when the page does not scroll or animations are off. */
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
  return <motion.div aria-hidden className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-0.5 origin-left bg-primary md:left-[72px] xl:left-60" style={{ scaleX }} />;
}
