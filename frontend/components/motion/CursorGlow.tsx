"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMotionOK } from "@/components/motion/MotionPref";

const SIZE = 560;

/**
 * The page glow follows the pointer with a lazy spring. Mouse-and-trackpad devices only; nothing under reduced motion.
 * Sits at z-index -1 above the fixed grid texture and below every card, so it only tints the background.
 */
export function CursorGlow() {
  const ok = useMotionOK();
  const x = useMotionValue(-SIZE);
  const y = useMotionValue(-SIZE);
  const sx = useSpring(x, { stiffness: 40, damping: 18, mass: 0.8 });
  const sy = useSpring(y, { stiffness: 40, damping: 18, mass: 0.8 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ok) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setActive(true);
    };
    const leave = () => setActive(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [ok, x, y]);

  if (!ok) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed rounded-full"
      style={{
        left: -SIZE / 2,
        top: -SIZE / 2,
        width: SIZE,
        height: SIZE,
        zIndex: -1,
        x: sx,
        y: sy,
        opacity: active ? 1 : 0,
        transition: "opacity 700ms ease",
        background: "radial-gradient(closest-side, rgba(215,38,61,0.11), rgba(56,189,248,0.04) 55%, rgba(0,0,0,0) 100%)",
      }}
    />
  );
}
