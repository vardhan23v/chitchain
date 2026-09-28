"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { addrUrl, shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AddressPill({ address, className, copy = true }: { address: string; className?: string; copy?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[13px]", className)}>
      <a href={addrUrl(address)} target="_blank" rel="noopener noreferrer" className="hover:underline" aria-label={`Address ${address} on MSTScan`}>
        {shortAddr(address)}
      </a>
      <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden />
      {copy && (
        <button
          type="button"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Copy address"
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            toast("Address copied");
          }}
        >
          <Copy className="h-3 w-3" aria-hidden />
        </button>
      )}
    </span>
  );
}
