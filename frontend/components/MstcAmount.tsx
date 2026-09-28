import { formatMst, formatMstFull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  wei: bigint | string | number | null | undefined;
  decimals?: number;
  className?: string;
  unitClassName?: string;
  size?: "display" | "lg" | "md" | "sm";
}

const SIZES = {
  display: "text-[44px] font-extrabold leading-none tracking-tight md:text-5xl",
  lg: "text-2xl font-bold leading-tight tracking-tight",
  md: "text-base font-semibold",
  sm: "text-sm font-medium",
};

/** DESIGN §2: `12.50 MST`, 2 decimals on screen, tabular-nums, full precision in aria-label + title. (File keeps its legacy name.) */
export function MstcAmount({ wei, decimals = 2, className, unitClassName, size = "md" }: Props) {
  const full = formatMstFull(wei as bigint | string);
  return (
    <span className={cn("tnum whitespace-nowrap", SIZES[size], className)} aria-label={`${full} MST`} title={`${full} MST`}>
      {formatMst(wei, decimals)}
      <span className={cn("ml-1 font-semibold text-muted-foreground", size === "display" ? "text-xl" : "text-[0.75em]", unitClassName)} aria-hidden>
        MST
      </span>
    </span>
  );
}

export const MstAmount = MstcAmount;
