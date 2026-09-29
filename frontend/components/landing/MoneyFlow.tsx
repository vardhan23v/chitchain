"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationFrame, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/components/motion/MotionPref";
import { Award, Coins, FileCode2, Gavel, Lock, PiggyBank, Trophy, Users, type LucideIcon } from "lucide-react";
import { formatMst } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live values that annotate the flow. Every field is optional; omit the prop for neutral copy.
 * - `potMst`: pot for the current round in wei (string or bigint), shown on the Pot node as "x MST".
 * - `members` / `maxMembers`: shown on the Members node as "x of y".
 * - `bestDiscountMst`: current best discount in wei, shown on the Auction node; `null` shows "No bid yet", omitted shows nothing.
 */
export interface MoneyFlowLive {
  potMst?: string | bigint | null;
  members?: number;
  maxMembers?: number;
  bestDiscountMst?: string | bigint | null;
}

/**
 * Signature money-flow visualization. Members → Collateral → Smart contract → Pot → Auction → Winner → Dividends → Reputation.
 * Horizontal from lg up, vertical below. Two particles travel the connector on a 6 s loop; they pause under reduced motion
 * and while the tab is hidden. Hover or focus a node to expand "What happens here?".
 *
 * Props: `live` (MoneyFlowLive, optional real values), `compact` (tighter padding for dashboard embeds), `className`.
 */
export interface MoneyFlowProps {
  live?: MoneyFlowLive;
  compact?: boolean;
  className?: string;
}

type Node = { key: string; label: string; text: string; detail: string; Icon: LucideIcon; tone: string };

const NODES: Node[] = [
  { key: "members", label: "Members", text: "People who save together.", detail: "A chit is a fixed group. Each member contributes the same amount every round.", Icon: Users, tone: "text-foreground" },
  { key: "collateral", label: "Collateral", text: "Locked on joining.", detail: "Collateral is sized by risk tier. It stays in the contract and covers a missed contribution.", Icon: Lock, tone: "text-warning" },
  { key: "contract", label: "Smart contract", text: "Holds every token.", detail: "No organizer wallet. Contributions, bids, payouts and penalties are enforced by code on MST Testnet.", Icon: FileCode2, tone: "text-primary" },
  { key: "pot", label: "Pot", text: "Contributions for this round.", detail: "The pot is the sum of contributions. It sits in the contract until the round settles.", Icon: PiggyBank, tone: "text-pot" },
  { key: "auction", label: "Auction", text: "Lowest payout wins.", detail: "Members who need money now bid a discount. The lowest accepted payout wins the pot.", Icon: Gavel, tone: "text-agent" },
  { key: "winner", label: "Winner", text: "Receives pot minus discount.", detail: "The winner withdraws the pot minus their discount and the platform fee. Payouts are pull-only.", Icon: Trophy, tone: "text-success" },
  { key: "dividends", label: "Dividends", text: "Discount shared back.", detail: "The winner's discount is split among the other members as a dividend on their next contribution.", Icon: Coins, tone: "text-pot" },
  { key: "reputation", label: "Reputation", text: "On-chain track record.", detail: "Paying on time and completing circles improves your on-chain record and lowers future collateral.", Icon: Award, tone: "text-foreground" },
];

const LOOP_MS = 6000;

function annotation(node: Node, live?: MoneyFlowLive): string | null {
  if (!live) return null;
  if (node.key === "pot" && live.potMst != null) return `${formatMst(live.potMst)} MST`;
  if (node.key === "members" && live.members != null && live.maxMembers != null) return `${live.members} of ${live.maxMembers}`;
  if (node.key === "auction" && live.bestDiscountMst !== undefined) return live.bestDiscountMst === null ? "No bid yet" : `Best discount ${formatMst(live.bestDiscountMst)} MST`;
  return null;
}

function useLg() {
  const [lg, setLg] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setLg(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return lg;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

/** Two dots that follow the connector path by path-length interpolation (works in every browser, no CSS motion path needed). */
function Particles({ pathRef, running }: { pathRef: React.RefObject<SVGPathElement>; running: boolean }) {
  const a = useRef<SVGCircleElement>(null);
  const b = useRef<SVGCircleElement>(null);
  const t = useRef(0);
  useAnimationFrame((_, delta) => {
    const path = pathRef.current;
    if (!running || !path) return;
    t.current = (t.current + delta) % LOOP_MS;
    const len = path.getTotalLength();
    if (!len) return;
    const place = (el: SVGCircleElement | null, frac: number) => {
      if (!el) return;
      const p = path.getPointAtLength(((frac % 1) + 1) % 1 * len);
      el.setAttribute("cx", String(p.x));
      el.setAttribute("cy", String(p.y));
    };
    const f = t.current / LOOP_MS;
    place(a.current, f);
    place(b.current, f + 0.5);
  });
  return (
    <>
      <circle ref={a} r="4" fill="hsl(var(--pot))" className={cn(!running && "opacity-0")} />
      <circle ref={b} r="3" fill="hsl(var(--primary))" className={cn(!running && "opacity-0")} />
    </>
  );
}

export function MoneyFlow({ live, compact, className }: MoneyFlowProps) {
  const reduce = useReducedMotion();
  const lg = useLg();
  const visible = usePageVisible();
  const wrap = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [open, setOpen] = useState<string | null>(null);
  // Scroll trace: a solid line draws over the dashed connector as the flow enters the viewport, and nodes switch on left to right.
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start 95%", "start 40%"] });
  const draw = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const [lit, setLit] = useState(NODES.length);
  useMotionValueEvent(draw, "change", (v) => setLit(Math.round(v * NODES.length)));
  const litCount = reduce ? NODES.length : lit;
  const running = !reduce && visible && litCount >= NODES.length;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Connector: through the icon centres. Horizontal: icons sit 24 px below the top of each column. Vertical: icons are a 48 px rail on the left.
  const n = NODES.length;
  const d = lg
    ? size.w
      ? `M ${size.w / n / 2} 24 L ${size.w - size.w / n / 2} 24`
      : ""
    : size.h
      ? `M 24 24 L 24 ${size.h - 24}`
      : "";

  return (
    <div className={cn("relative", className)}>
      <div ref={wrap} className={cn("relative grid gap-3 lg:grid-cols-8 lg:gap-2", compact ? "py-2" : "py-4")}>
        {d && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <path ref={pathRef} d={d} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 6" />
            {!reduce && <motion.path d={d} fill="none" stroke="hsl(var(--pot))" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" style={{ pathLength: draw }} />}
            <Particles pathRef={pathRef} running={running} />
          </svg>
        )}
        {NODES.map((node, i) => {
          const note = annotation(node, live);
          const isOpen = open === node.key;
          return (
            <motion.button
              layout
              type="button"
              key={node.key}
              onMouseEnter={() => setOpen(node.key)}
              onMouseLeave={() => setOpen((o) => (o === node.key ? null : o))}
              onFocus={() => setOpen(node.key)}
              onBlur={() => setOpen((o) => (o === node.key ? null : o))}
              onClick={() => setOpen((o) => (o === node.key ? null : node.key))}
              aria-expanded={isOpen}
              className={cn("relative flex items-start gap-3 rounded-xl text-left transition-opacity duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:flex-col lg:items-center lg:text-center", i >= litCount && "opacity-40")}
            >
              <span className={cn("relative z-[1] flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-surface2 transition-colors", isOpen && "border-white/20 bg-surface3", node.tone)}>
                <node.Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 lg:px-1">
                <span className="block text-[13px] font-semibold text-foreground">{node.label}</span>
                <span className="block text-[12px] leading-snug text-muted-foreground">{node.text}</span>
                {note && <span className={cn("tnum mt-1 block text-[12px] font-medium", node.tone)}>{note}</span>}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.span
                      key="detail"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="block overflow-hidden"
                    >
                      <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground/80">What happens here?</span>
                      <span className="block text-[12px] leading-snug text-foreground/90">{node.detail}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
