"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

/** One easing for every motion in the app (DESIGN §10). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + 12 px rise. Children of a RevealGroup pick this up automatically. */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const groupVariants = (stagger: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: 0 } },
});

const VIEWPORT = { once: true, margin: "-10% 0px" } as const;

type Tag = "div" | "section" | "ul" | "ol" | "li" | "span" | "header";
const TAGS = { div: motion.div, section: motion.section, ul: motion.ul, ol: motion.ol, li: motion.li, span: motion.span, header: motion.header } as const;

interface BaseProps {
  children?: ReactNode;
  className?: string;
  as?: Tag;
  "aria-label"?: string;
  id?: string;
}

/** Single element that reveals once when scrolled into view. */
export function Reveal({ children, className, as = "div", ...rest }: BaseProps) {
  const M = TAGS[as];
  return (
    <M className={className} variants={revealItem} initial="hidden" whileInView="show" viewport={VIEWPORT} {...rest}>
      {children}
    </M>
  );
}

interface GroupProps extends BaseProps {
  /** "view": stagger once when scrolled into view. "load": stagger on mount (above the fold). */
  mode?: "view" | "load";
  /** Seconds between children (default 0.06). */
  stagger?: number;
}

/** Parent that staggers its RevealItem children as one moment. */
export function RevealGroup({ children, className, as = "div", mode = "view", stagger = 0.06, ...rest }: GroupProps) {
  const M = TAGS[as];
  const inView = mode === "view";
  return (
    <M
      className={className}
      variants={groupVariants(stagger)}
      initial="hidden"
      animate={inView ? undefined : "show"}
      whileInView={inView ? "show" : undefined}
      viewport={inView ? VIEWPORT : undefined}
      {...rest}
    >
      {children}
    </M>
  );
}

/** Child of a RevealGroup. Inherits the group's timing, renders at rest outside one. */
export function RevealItem({ children, className, as = "div", ...rest }: BaseProps) {
  const M = TAGS[as];
  return (
    <M className={className} variants={revealItem} {...rest}>
      {children}
    </M>
  );
}
