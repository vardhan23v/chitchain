"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { useMotionOK } from "@/components/motion/MotionPref";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}

/**
 * Cards inside (class `spotlight`) get a pointer-tracked highlight on their 1 px border, like a torch passing over the grid.
 * One pointer listener per group, one rAF per move; nothing on touch devices or when animations are off. The paint lives in globals.css.
 */
export function SpotlightGroup({ children, className, as = "div" }: Props) {
  const ok = useMotionOK();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !ok || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let last: { x: number; y: number } | null = null;
    const paint = () => {
      raf = 0;
      if (!last) return;
      for (const el of root.querySelectorAll<HTMLElement>(".spotlight")) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${last.x - r.left}px`);
        el.style.setProperty("--my", `${last.y - r.top}px`);
      }
    };
    const move = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(paint);
    };
    root.addEventListener("pointermove", move, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ok]);

  const Tag = as;
  return (
    <Tag ref={ref as RefObject<HTMLDivElement>} className={cn(ok && "spotlight-group", className)}>
      {children}
    </Tag>
  );
}
