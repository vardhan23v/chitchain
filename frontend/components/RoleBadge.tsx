import { Shield, UserRound, Users, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ROLE_META: Record<Role, { label: string; tip: string; Icon: LucideIcon; cls: string }> = {
  MEMBER: { label: "Member", tip: "Participates in a chit circle", Icon: UserRound, cls: "border-primary/30 bg-primary/10 text-primary" },
  ORGANIZER: { label: "Circle organizer", tip: "Manages my chit circle", Icon: Users, cls: "border-pot/40 bg-pot/10 text-pot" },
  ADMIN: { label: "Platform admin", tip: "Manages the ChitChain platform", Icon: Shield, cls: "border-agent/40 bg-agent/10 text-agent" },
};

/** MEMBER / CIRCLE ORGANIZER / PLATFORM ADMIN chip with a one-line tooltip. Roles only gate website actions, never funds. */
export function RoleBadge({ role, className, size = "sm" }: { role: Role; className?: string; size?: "xs" | "sm" }) {
  const m = ROLE_META[role] ?? ROLE_META.MEMBER;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex shrink-0 cursor-default items-center gap-1 whitespace-nowrap rounded-full border font-semibold uppercase tracking-wider",
            size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
            m.cls,
            className
          )}
          aria-label={`${m.label}: ${m.tip}`}
        >
          <m.Icon className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
          {m.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.tip}</TooltipContent>
    </Tooltip>
  );
}
