import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TestnetBadge } from "@/components/TestnetBadge";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  /** Show the amber "MST TESTNET" chip (use on tiles that display MST amounts). */
  testnet?: boolean;
  className?: string;
  children?: ReactNode;
}

export function StatTile({ label, value, hint, loading, testnet, className, children }: Props) {
  return (
    <Card className={cn("rounded-2xl p-4 md:p-5", className)}>
      <div className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted-foreground">
        <span>{label}</span>
        {testnet && <TestnetBadge size="xs" />}
      </div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <div className="tnum mt-1 text-2xl font-bold">{value}</div>}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      {children}
    </Card>
  );
}
