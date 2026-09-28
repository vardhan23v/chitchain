import { CheckCircle2, Circle, Flag, PauseCircle, PlayCircle, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<AgentStatus, { label: string; cls: string; Icon: LucideIcon; pulse?: boolean }> = {
  ACTIVE: { label: "Active", cls: "border-success/30 bg-success/10 text-success", Icon: PlayCircle, pulse: true },
  PAUSED: { label: "Paused", cls: "border-warning/30 bg-warning/10 text-warning", Icon: PauseCircle },
  STOPPED: { label: "Stopped", cls: "border-border bg-muted text-muted-foreground", Icon: Circle },
  DONE: { label: "Done", cls: "border-primary/30 bg-primary/10 text-primary", Icon: Flag },
  ERROR: { label: "Error", cls: "border-danger/30 bg-danger/10 text-danger", Icon: XCircle },
};

/** Agent status chip: icon + text + colour, never colour alone. */
export function AiStatusPill({ status, className }: { status: AgentStatus; className?: string }) {
  const m = META[status] ?? META.STOPPED;
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", m.cls, className)}>
      {m.pulse ? (
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      ) : (
        <m.Icon className="h-3 w-3" aria-hidden />
      )}
      {m.label}
    </Badge>
  );
}

export function RiskPassedChip({ passed = true }: { passed?: boolean }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", passed ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger")}>
      {passed ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <XCircle className="h-3 w-3" aria-hidden />}
      Risk guard {passed ? "passed" : "blocked"}
    </Badge>
  );
}
