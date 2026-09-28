import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Connect", "Sign", "Enter"] as const;

/** Three-step feel for the login card: Connect → Sign → Enter. `current` is 0-based; steps before it are done. */
export function LoginStepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Sign-in steps">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className={cn("flex items-center gap-1.5 text-xs font-semibold", active ? "text-primary" : done ? "text-success" : "text-muted-foreground")} aria-current={active ? "step" : undefined}>
              <span className={cn("tnum flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", active && "border-primary bg-primary text-primary-foreground", done && "border-success bg-success text-success-foreground", !active && !done && "border-border")} aria-hidden>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {s}
            </span>
            {i < STEPS.length - 1 && <span className={cn("h-px flex-1", done ? "bg-success/50" : "bg-border")} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
