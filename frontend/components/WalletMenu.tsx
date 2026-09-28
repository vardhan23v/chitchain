"use client";

import Link from "next/link";
import { ChevronDown, Copy, ExternalLink, History, KeyRound, LayoutDashboard, LifeBuoy, Lock, LogOut, Shield, User, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/RoleBadge";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useWallet } from "@/hooks/useWallet";
import { BRIDGEKEY_URL, FAUCET_URL } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";
import { addrUrl, formatMst, shortAddr } from "@/lib/format";

const Item = ({ href, Icon, label }: { href: string; Icon: typeof User; label: string }) => (
  <DropdownMenuItem asChild>
    <Link href={href}><Icon className="mr-2 h-4 w-4" aria-hidden /> {label}</Link>
  </DropdownMenuItem>
);

export function WalletMenu() {
  const { hasWallet, account, connect, connecting } = useWallet();
  const auth = useAuth();
  const balance = useBalance(account);
  const signedIn = auth.status === "authenticated" && !!auth.user;

  if (!hasWallet) {
    return (
      <Button asChild size="sm" variant="outline">
        <a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer"><Wallet aria-hidden /> Install BridgeKey</a>
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
        <Button size="sm" variant="outline" className="gap-1.5">
          <span className="font-mono">{auth.user?.displayName || shortAddr(account)}</span>
          {signedIn && auth.user && <RoleBadge role={auth.user.role} size="xs" className="hidden sm:inline-flex" />}
          <ChevronDown className="h-3 w-3" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{auth.user?.displayName || shortAddr(account)}</span>
            {signedIn && auth.user ? <RoleBadge role={auth.user.role} size="xs" /> : <span className="text-[10px] font-normal text-muted-foreground">not signed in</span>}
          </div>
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
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(account).then(() => toast("Address copied"))}>
          <Copy className="mr-2 h-4 w-4" aria-hidden /> Copy address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={addrUrl(account)} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden /> View on MSTScan</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {signedIn ? (
          <>
            <Item href="/dashboard" Icon={LayoutDashboard} label="My dashboard" />
            {auth.isOrganizer && <Item href="/organizer" Icon={Users} label="Organizer dashboard" />}
            {auth.isAdmin && <Item href="/admin" Icon={Shield} label="Admin dashboard" />}
            <Item href={`/member/${account}`} Icon={User} label="My profile" />
            <Item href="/activity" Icon={History} label="Transaction history" />
            <Item href="/collateral" Icon={Lock} label="My collateral" />
            <Item href="/support" Icon={LifeBuoy} label="Support" />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void auth.signOut()}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden /> Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <Item href="/login" Icon={KeyRound} label="Sign in" />
            <Item href={`/member/${account}`} Icon={User} label="My profile" />
            <Item href="/support" Icon={LifeBuoy} label="Support" />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
