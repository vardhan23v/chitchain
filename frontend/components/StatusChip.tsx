import { CheckCircle2, Circle, ShieldAlert, ShieldHalf, Trophy, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CONTRIBUTION_STATUS_LABEL, DEFAULT_STATUS_LABEL } from "@/lib/labels";
import type { ContributionStatus, DefaultStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<ContributionStatus, { variant: "status-paid" | "status-pending" | "status-covered" | "status-partial" | "status-removed"; Icon: typeof Circle }> = {
  PAID: { variant: "status-paid", Icon: CheckCircle2 },
  PENDING: { variant: "status-pending", Icon: Circle },
  COVERED_BY_COLLATERAL: { variant: "status-covered", Icon: ShieldHalf },
  PARTIALLY_COVERED: { variant: "status-partial", Icon: ShieldAlert },
  DEFAULTED: { variant: "status-removed", Icon: XCircle },
};

/** Round status chip from `contributionStatus` (icon + text + colour, never colour alone). */
export function ContributionChip({ status, className }: { status: ContributionStatus; className?: string }) {
  const { variant, Icon } = META[status] ?? META.PENDING;
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap uppercase tracking-wide", className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {CONTRIBUTION_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function WonChip({ round, className }: { round?: number | null; className?: string }) {
  return (
    <Badge variant="status-won" className={cn("whitespace-nowrap uppercase tracking-wide", className)}>
      <Trophy className="h-3 w-3" aria-hidden />
      Won{round ? ` R${round}` : ""}
    </Badge>
  );
}

export function DefaultStatusChip({ status, className }: { status: DefaultStatus; className?: string }) {
  const partial = status === "PARTIALLY_COVERED";
  return (
    <Badge variant={partial ? "status-partial" : "status-covered"} className={cn("whitespace-nowrap uppercase tracking-wide", className)}>
      {partial ? <ShieldAlert className="h-3 w-3" aria-hidden /> : <ShieldHalf className="h-3 w-3" aria-hidden />}
      {DEFAULT_STATUS_LABEL[status]}
    </Badge>
  );
}
