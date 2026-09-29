"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/motion/CountUp";
import { revealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  Icon: LucideIcon;
  /** Icon tint, e.g. "text-pot". */
  tone?: string;
  /** A number counts up (2 decimals when `unit` is set); anything else renders as given. */
  value: ReactNode;
  /** Unit shown after a numeric value, e.g. "MST". */
  unit?: string;
  decimals?: number;
  /** One line under the number. */
  support?: ReactNode;
  /** Status chip in the header row. */
  chip?: ReactNode;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Dashboard stat card: icon + label, chip, 32 px tabular number with a 14 px muted unit, one support line.
 * Inside a RevealGroup the card joins the stagger.
 */
export function StatCard({ label, Icon, tone = "text-muted-foreground", value, unit, decimals, support, chip, loading, className, children }: Props) {
  const numeric = typeof value === "number" && Number.isFinite(value);
  return (
    <motion.div variants={revealItem} className={cn("card-hover flex min-w-0 flex-col rounded-2xl border border-white/[0.08] bg-surface p-4 shadow-card md:p-5", className)}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]", tone)} aria-hidden><Icon className="h-4 w-4" /></span>
        <span className="truncate">{label}</span>
        {chip && <span className="ml-auto shrink-0">{chip}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-28" />
      ) : (
        <div className={cn("tnum mt-3 flex min-w-0 items-baseline gap-1.5 text-[32px] font-semibold leading-none tracking-tight text-foreground md:text-[36px]", !numeric && "text-[28px] md:text-[32px]")}>
          <span className="min-w-0 truncate">{numeric ? <CountUp value={value} decimals={decimals ?? (unit ? 2 : 0)} fromZero /> : value}</span>
          {unit && numeric && <span className="text-[14px] font-medium text-muted-foreground">{unit}</span>}
        </div>
      )}
      {support && <div className="mt-2 text-[13px] leading-snug text-muted-foreground">{support}</div>}
      {children}
    </motion.div>
  );
}
