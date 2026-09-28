import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

export function StatTile({ label, value, hint, loading }: { label: string; value: ReactNode; hint?: string; loading?: boolean }) {
  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <div className="tnum mt-1 text-2xl font-bold">{value}</div>}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}
