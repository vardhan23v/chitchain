import type { ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "chain" | "warning" | "danger" | "success" | "agent";
const TONES: Record<Tone, { box: string; icon: string }> = {
  info: { box: "border-border bg-muted/40", icon: "text-muted-foreground" },
  chain: { box: "border-chain/25 bg-chain/5", icon: "text-chain" },
  warning: { box: "border-warning/30 bg-warning/5", icon: "text-warning" },
  danger: { box: "border-danger/30 bg-danger/5", icon: "text-danger" },
  success: { box: "border-success/30 bg-success/5", icon: "text-success" },
  agent: { box: "border-agent/30 bg-agent/5", icon: "text-agent" },
};

/** Muted inline notice: icon + one or two lines of text. Used for "no withdraw controls", security notes, etc. */
export function InfoBanner({ Icon = Info, tone = "info", children, className, role }: { Icon?: LucideIcon; tone?: Tone; children: ReactNode; className?: string; role?: string }) {
  const t = TONES[tone];
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] leading-snug text-muted-foreground", t.box, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
