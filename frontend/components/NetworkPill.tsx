"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { CHAIN_NAME } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";

/** DESIGN §5: green dot = MST testnet, red = wrong network → "Switch to MST" button. */
export function NetworkPill() {
  const { hasWallet, chainId, correctChain, switchNetwork } = useWallet();
  if (!hasWallet || chainId === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" aria-hidden />
        {CHAIN_NAME}
      </span>
    );
  }
  if (correctChain) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        {CHAIN_NAME}
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="destructive"
      className="h-7 rounded-full px-3 text-xs"
      onClick={() => switchNetwork().catch((e) => toast.error(parseTxError(e).message))}
    >
      <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
      Switch to MST
    </Button>
  );
}
