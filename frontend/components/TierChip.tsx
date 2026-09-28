import { HelpCircle, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TIER_LABEL } from "@/lib/labels";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

const META: Record<Tier, { variant: "tier-unassessed" | "tier-low" | "tier-medium" | "tier-high"; Icon: typeof Shield }> = {
  0: { variant: "tier-unassessed", Icon: HelpCircle },
  1: { variant: "tier-low", Icon: ShieldCheck },
  2: { variant: "tier-medium", Icon: Shield },
  3: { variant: "tier-high", Icon: ShieldAlert },
};

export function TierChip({ tier, className, short }: { tier: Tier; className?: string; short?: boolean }) {
  const { variant, Icon } = META[tier] ?? META[0];
  const label = TIER_LABEL[tier] ?? TIER_LABEL[0];
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{short ? label.split(" · ")[0] : label}</span>
    </Badge>
  );
}
