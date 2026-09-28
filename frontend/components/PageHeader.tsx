import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Short sentence-case line above the title, e.g. "My dashboard". */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Chips / buttons, right-aligned on desktop and wrapped under the title on mobile. */
  actions?: ReactNode;
  /** Optional link rendered above the eyebrow (e.g. "← My circles"). */
  back?: ReactNode;
  className?: string;
}

/** One page-header pattern for every page: meta line + H1 + one-line description, badges right-aligned. */
export function PageHeader({ eyebrow, title, description, actions, back, className }: Props) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        {back}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="min-w-0 break-words">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground md:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:pb-0.5">{actions}</div>}
    </header>
  );
}

/** Section heading (DESIGN §4 H2, sentence case) with an optional icon and trailing content (counts, filters). */
export function SectionTitle({ Icon, children, trailing, className, tone }: { Icon?: React.ComponentType<{ className?: string }>; children: ReactNode; trailing?: ReactNode; className?: string; tone?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Icon && <Icon className={cn("h-4 w-4", tone ?? "text-muted-foreground")} aria-hidden />}
      <h2 className="text-[17px] font-semibold leading-tight tracking-tight md:text-lg">{children}</h2>
      {trailing && <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">{trailing}</span>}
    </div>
  );
}
