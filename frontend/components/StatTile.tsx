import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

/** Tile anatomy: label row (label · badge · icon) → value → sub-line. Numbers are tabular. */
export function StatTile({ label, value, hint, loading, testnet, Icon, iconClassName, badge, className, valueClassName, children }: Props) {
  return (
    <Card className={cn("flex min-w-0 flex-col p-4 md:p-5", className)}>
      <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
        <span className="truncate">{label}</span>
        {badge}
        {testnet && <TestnetBadge size="xs" className="hidden sm:inline-flex" />}
        {Icon && <Icon className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground/70", iconClassName)} aria-hidden />}
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <div className={cn("tnum mt-1.5 min-w-0 truncate text-2xl font-bold leading-tight tracking-tight", valueClassName)}>{value}</div>}
      {hint && <div className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</div>}
      {children}
    </Card>
  );
}
