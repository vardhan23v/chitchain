"use client";

import Link from "next/link";
import { ChevronDown, Copy, ExternalLink, History, Lock, LogOut, User, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { BRIDGEKEY_URL, FAUCET_URL } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";
import { addrUrl, formatMst, shortAddr } from "@/lib/format";

export function WalletMenu() {
  const { hasWallet, account, connect, connecting, disconnect } = useWallet();
  const balance = useBalance(account);

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
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-1">
          <div className="text-[11px] font-normal text-muted-foreground">Balance</div>
          <div className="flex items-center justify-between gap-2">
            <span className="tnum text-sm font-semibold">{balance === null ? "…" : `${formatMst(balance, 4)} MST`}</span>
            <TestnetBadge size="xs" />
          </div>
          {balance !== null && balance === 0n && (
            <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-[11px] font-normal text-primary hover:underline">Get test MST from the faucet</a>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
        <DropdownMenuItem asChild>
          <Link href="/activity">
            <History className="mr-2 h-4 w-4" aria-hidden /> Transaction history
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/collateral">
            <Lock className="mr-2 h-4 w-4" aria-hidden /> My collateral
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
