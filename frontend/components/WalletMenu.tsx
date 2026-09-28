"use client";

import Link from "next/link";
import { ChevronDown, Copy, ExternalLink, LogOut, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useWallet } from "@/hooks/useWallet";
import { BRIDGEKEY_URL } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";
import { addrUrl, shortAddr } from "@/lib/format";

export function WalletMenu() {
  const { hasWallet, account, connect, connecting, disconnect } = useWallet();

  if (!hasWallet) {
    return (
      <Button asChild size="sm" variant="outline">
        <a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer">
          <Wallet aria-hidden /> Install BridgeKey
        </a>
      </Button>
    );
  }
  if (!account) {
    return (
      <Button size="sm" onClick={() => connect().catch((e) => toast.error(parseTxError(e).message))} disabled={connecting}>
        <Wallet aria-hidden /> {connecting ? "Connecting…" : "Connect BridgeKey"}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="font-mono">
          {shortAddr(account)} <ChevronDown className="h-3 w-3" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={async () => {
            await navigator.clipboard.writeText(account);
            toast("Address copied");
          }}
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={addrUrl(account)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden /> View on MSTScan
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/member/${account}`}>
            <User className="mr-2 h-4 w-4" aria-hidden /> My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
