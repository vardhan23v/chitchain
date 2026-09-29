"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { CHAIN_NAME } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";

/** Connection pill: pulsing green dot when on MST Testnet, red "Switch to MST" when on the wrong network. */
export function NetworkPill() {
  const { hasWallet, chainId, correctChain, switchNetwork } = useWallet();
  if (!hasWallet || chainId === null) {
    return (
      <span className="hidden h-8 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-muted-foreground sm:inline-flex">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/60" aria-hidden />
        {CHAIN_NAME} · Disconnected
      </span>
    );
  }
  if (correctChain) {
    return (
      <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-success/30 bg-success/15 px-3 text-xs font-medium text-success">
        <span className="status-dot bg-success" aria-hidden />
        {CHAIN_NAME}<span className="hidden sm:inline"> · Connected</span>
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="destructive"
      className="h-8 rounded-full px-3 text-xs"
      onClick={() => switchNetwork().catch((e) => toast.error(parseTxError(e).message))}
    >
      <span className="h-2 w-2 rounded-full bg-white" aria-hidden />
      Switch to MST
    </Button>
  );
}
