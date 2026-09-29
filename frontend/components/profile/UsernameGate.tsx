"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UsernameForm } from "@/components/profile/UsernameForm";
import { useAuth } from "@/hooks/useAuth";
import { isEvmAddress } from "@/lib/types";
import { shortAddr } from "@/lib/format";

/**
 * First-time profile setup: after a wallet signs in, if the wallet has no username, ask for one. Can be put off for
 * this visit; it asks again next time. Password-admin sessions have no wallet and are never asked.
 */
export function UsernameGate() {
  const auth = useAuth();
  const [later, setLater] = useState(false);
  const addr = auth.user?.walletAddress ?? "";
  const needs = auth.ready && auth.status === "authenticated" && isEvmAddress(addr) && !auth.user?.username && !later;
  return (
    <Dialog open={needs} onOpenChange={(o) => { if (!o) setLater(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to ChitChain</DialogTitle>
          <DialogDescription>
            Choose a username so other members see a name instead of <span className="font-mono">{shortAddr(addr)}</span>. Your wallet address stays your on-chain identity and is always shown next to it.
          </DialogDescription>
        </DialogHeader>
        <UsernameForm autoFocus submitLabel="Create profile" />
      </DialogContent>
    </Dialog>
  );
}
