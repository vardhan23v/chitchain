import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TxRowStatus = "confirmed" | "pending" | "confirming" | "failed";

const META: Record<TxRowStatus, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "border-success/30 bg-success/[0.12] text-success" },
  pending: { label: "Pending", cls: "border-warning/30 bg-warning/[0.12] text-warning" },
  confirming: { label: "Confirming", cls: "border-pot/30 bg-pot/[0.12] text-pot" },
  failed: { label: "Failed", cls: "border-danger/30 bg-danger/[0.12] text-danger" },
};

/** Transaction status chip: icon + text + colour, never colour alone. Indexed rows are always confirmed; live rows come from TxState. */
export function TransactionStatus({ status, className }: { status: TxRowStatus; className?: string }) {
  const m = META[status];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", m.cls, className)}>
      {status === "confirmed" ? <Check className="h-3 w-3" aria-hidden /> : status === "failed" ? <X className="h-3 w-3" aria-hidden /> : <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {m.label}
    </span>
  );
}
