import { ExternalLink } from "lucide-react";
import { shortAddr, txUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TxLink({ hash, label, className }: { hash: string; label?: string; className?: string }) {
  return (
    <a
      href={txUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1 font-mono text-[13px] text-chain hover:underline", className)}
      aria-label={`View transaction ${hash} on MSTScan`}
      onClick={(e) => e.stopPropagation()}
    >
      {label ?? shortAddr(hash, 8, 6)}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}

/** Compact variant for toast descriptions. */
export function TxToastLink({ hash }: { hash: string }) {
  return <TxLink hash={hash} label="View on MSTScan" className="text-xs" />;
}
