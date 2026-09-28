import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  /** Unit suffix rendered inside the input on the right: "MST", "%", "s". */
  suffix?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, suffix, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px]">{label}</Label>
      {suffix ? (
        <div className="relative [&>input]:pr-14">
          {children}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground" aria-hidden>{suffix}</span>
        </div>
      ) : (
        children
      )}
      {hint && !error && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

/** Section header inside the create form: icon + small-caps title + one-line description. */
export function FormSection({ Icon, title, text, children, first }: { Icon: LucideIcon; title: string; text?: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={cn("space-y-4", !first && "border-t pt-6")} aria-label={title}>
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden><Icon className="h-3.5 w-3.5" /></span>
        <div>
          <h2 className="text-[15px] font-semibold leading-7">{title}</h2>
          {text && <p className="-mt-1 text-xs text-muted-foreground">{text}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Slider with the live value on the right and min/max under it. */
export function SliderRow({ label, value, min, max, children, error, hint, htmlFor }: { label: string; value: string; min: string; max: string; children: ReactNode; error?: string; hint?: string; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-[13px]">{label}</Label>
        <span className="tnum rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{value}</span>
      </div>
      <div className="px-1 pt-1">{children}</div>
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>{min}</span><span>{max}</span></div>
      {hint && !error && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
