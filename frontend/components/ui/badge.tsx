import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        "tier-unassessed": "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
        "tier-low": "border-success/30 bg-success/10 text-success",
        "tier-medium": "border-warning/30 bg-warning/10 text-warning",
        "tier-high": "border-danger/30 bg-danger/10 text-danger",
        "status-paid": "border-success/30 bg-success/10 text-success",
        "status-pending": "border-border bg-muted text-muted-foreground",
        "status-covered": "border-warning/30 bg-warning/10 text-warning",
        "status-partial": "border-danger/50 bg-transparent text-danger",
        "status-won": "border-primary/30 bg-primary/10 text-primary",
        "status-removed": "border-danger/30 bg-danger/10 text-danger",
        chain: "border-chain/30 bg-chain/10 text-chain",
        agent: "border-agent/30 bg-agent/10 text-agent",
        pot: "border-pot/30 bg-pot/10 text-pot",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
