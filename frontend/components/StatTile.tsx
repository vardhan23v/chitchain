"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/motion/CountUp";
import { revealItem } from "@/components/motion/Reveal";
import { TestnetBadge } from "@/components/TestnetBadge";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  /** One muted sub-line under the value. */
  hint?: ReactNode;
  loading?: boolean;
  /** Show the subtle "Testnet" chip (use on tiles that display MST amounts). */
  testnet?: boolean;
  /** Optional icon in the top-right corner. */
  Icon?: LucideIcon;
  iconClassName?: string;
  /** Optional chip/badge shown next to the label. */
  badge?: ReactNode;
  className?: string;
  valueClassName?: string;
  children?: ReactNode;
}

/** Tile anatomy: label row (label, badge, icon), value, sub-line. Numbers are tabular; plain numeric values count up. Inside a RevealGroup the tile joins the stagger. */
export function StatTile({ label, value, hint, loading, testnet, Icon, iconClassName, badge, className, valueClassName, children }: Props) {
  const shown = typeof value === "number" && Number.isFinite(value) ? <CountUp value={value} fromZero /> : value;
  return (
    <motion.div variants={revealItem} className={cn("flex min-w-0 flex-col glass rounded-[22px] p-4 text-card-foreground md:p-5", className)}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {badge}
        {testnet && <TestnetBadge size="xs" className="hidden sm:inline-flex" />}
        {Icon && <Icon className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground/70", iconClassName)} aria-hidden />}
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <div className={cn("tnum mt-1.5 min-w-0 truncate text-[32px] font-semibold leading-tight tracking-tight", valueClassName)}>{shown}</div>}
      {hint && <div className="mt-1 text-[13px] leading-snug text-muted-foreground">{hint}</div>}
      {children}
    </motion.div>
  );
}
