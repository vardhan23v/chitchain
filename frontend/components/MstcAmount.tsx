import { formatMstc, formatMstcFull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  wei: bigint | string | number | null | undefined;
  decimals?: number;
  className?: string;
  unitClassName?: string;
  size?: "display" | "lg" | "md" | "sm";
}

const SIZES = { display: "text-5xl font-extrabold", lg: "text-2xl font-bold", md: "text-base font-semibold", sm: "text-sm font-medium" };

/** DESIGN §2: `12.50 MSTC`, tabular-nums, aria-label with full precision. */
export function MstcAmount({ wei, decimals = 2, className, unitClassName, size = "md" }: Props) {
  const full = formatMstcFull(wei as bigint | string);
  return (
    <span className={cn("tnum whitespace-nowrap", SIZES[size], className)} aria-label={`${full} MSTC`}>
      {formatMstc(wei, decimals)}
      <span className={cn("ml-1 font-medium text-muted-foreground", size === "display" ? "text-xl" : "text-[0.8em]", unitClassName)} aria-hidden>
        MSTC
      </span>
    </span>
  );
}
