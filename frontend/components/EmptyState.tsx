import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Dashed empty state with a soft icon disc, one line of copy and an optional CTA. */
export function EmptyState({ Icon, title, text, action, className, tone = "text-primary bg-primary/10" }: { Icon: LucideIcon; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string; tone?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 glass rounded-[22px] border-dashed border-primary/25 px-6 py-10 text-center", className)}>
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-full", tone)} aria-hidden>
        <Icon className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
