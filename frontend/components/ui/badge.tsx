import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-white/10 bg-white/[0.06] text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-white/10 text-foreground",
        "tier-unassessed": "border-white/10 bg-white/[0.06] text-muted-foreground",
        "tier-low": "border-success/30 bg-success/15 text-success",
        "tier-medium": "border-warning/30 bg-warning/15 text-warning",
        "tier-high": "border-danger/30 bg-danger/15 text-danger",
        "status-paid": "border-success/30 bg-success/15 text-success",
        "status-pending": "border-white/10 bg-white/[0.06] text-muted-foreground",
        "status-covered": "border-warning/30 bg-warning/15 text-warning",
        "status-partial": "border-danger/50 bg-transparent text-danger",
        "status-won": "border-primary/30 bg-primary/15 text-primary",
        "status-removed": "border-danger/30 bg-danger/15 text-danger",
        chain: "border-chain/30 bg-chain/15 text-chain",
        agent: "border-agent/30 bg-agent/15 text-agent",
        pot: "border-pot/30 bg-pot/15 text-pot",
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
