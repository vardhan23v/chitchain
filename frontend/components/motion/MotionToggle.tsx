"use client";

import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMotionPref, type MotionPref } from "@/components/motion/MotionPref";
import { cn } from "@/lib/utils";

const NEXT: Record<MotionPref, MotionPref> = { system: "on", on: "off", off: "system" };
const LABEL: Record<MotionPref, string> = { system: "System", on: "On", off: "Off" };

/** Cycles the site animation preference: System, On, Off. `row` for the sidebar, `pill` for the footer, `icon` for the collapsed rail. */
export function MotionToggle({ variant = "pill", className }: { variant?: "row" | "pill" | "icon"; className?: string }) {
  const { pref, setPref, systemReduce } = useMotionPref();
  const state = pref === "system" && systemReduce ? "System (reduced)" : LABEL[pref];
  const label = `Animations: ${state}`;
  const onClick = () => setPref(NEXT[pref]);

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" onClick={onClick} className={cn("rounded-md p-1 text-foreground hover:text-primary", className)} aria-label={`${label}. Click to change.`}>
            <Sparkles className={cn("h-4 w-4", pref === "off" && "opacity-40")} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}. Click to change.`}
      className={cn(
        variant === "pill"
          ? "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          : "flex items-center gap-1.5 rounded-md text-foreground hover:text-primary",
        className,
      )}
    >
      <Sparkles className={cn("h-3.5 w-3.5", pref === "off" && "opacity-40")} aria-hidden />
      <span>Animations</span>
      <span className={cn("tnum", variant === "pill" ? "text-foreground" : "text-muted-foreground")}>{state}</span>
    </button>
  );
}
