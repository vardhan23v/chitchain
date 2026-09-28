"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Confetti-lite: 10 particles, 600 ms (DESIGN §10). No-op when reduced motion is preferred. */
export function ConfettiLite({ trigger }: { trigger: number }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!trigger || reduce) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 700);
    return () => clearTimeout(t);
  }, [trigger, reduce]);
  if (!show) return null;
  const colors = ["hsl(var(--pot))", "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--agent))"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-sm"
          style={{ background: colors[i % colors.length] }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos((i / 10) * Math.PI * 2) * 60, y: Math.sin((i / 10) * Math.PI * 2) * 60 - 20, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}
