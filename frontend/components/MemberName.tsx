import { cn } from "@/lib/utils";
import { nameOf } from "@/lib/labels";
import { shortAddr } from "@/lib/format";

/**
 * A member's display name (username, else "Demo A", else the short address) with the short wallet address beside it,
 * so the name can always be verified against the on-chain identity.
 */
export function MemberName({ m, className, stacked }: { m: { username?: string | null; label?: string | null; address: string }; className?: string; stacked?: boolean }) {
  const name = nameOf(m);
  const short = shortAddr(m.address);
  const showAddr = name !== short;
  return (
    <span className={cn("min-w-0", stacked ? "flex flex-col" : "inline-flex items-baseline gap-1.5", className)} title={m.address}>
      <span className="truncate font-medium text-foreground">{name}</span>
      {showAddr && <span className="truncate font-mono text-[11px] text-muted-foreground">{short}</span>}
    </span>
  );
}
