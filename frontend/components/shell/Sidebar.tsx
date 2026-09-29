"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, BookOpenText, ExternalLink, Gavel, KeyRound, LayoutGrid, LifeBuoy, LogOut, Orbit, ShieldCheck, Star, Wallet, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavItems } from "@/components/shell/MobileTabs";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { CHAIN_NAME, CONTRACT_ADDRESS, HAS_CONTRACT } from "@/lib/chain";
import { addrUrl, shortAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: LucideIcon };

function NavLink({ item, active }: { item: Item; active: boolean }) {
  const { href, label, Icon } = item;
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors xl:pl-4",
        "justify-center xl:justify-start",
        active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
      )}
    >
      {active && <motion.span layoutId="sidebar-active" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary" transition={{ duration: 0.25 }} aria-hidden />}
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
      <span className="hidden truncate xl:inline">{label}</span>
    </Link>
  );
  return (
    <li>
      {/* Below xl the label is hidden, so the tooltip carries it. */}
      <div className="xl:hidden">
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
        </Tooltip>
      </div>
      <div className="hidden xl:block">{link}</div>
    </li>
  );
}

/** Desktop sidebar: 240 px at xl, a 72 px icon rail between md and xl, hidden below md (MobileTabs takes over). */
export function Sidebar() {
  const { signedIn, home, isActive } = useNavItems();
  const auth = useAuth();
  const { hasWallet, account, chainId, correctChain } = useWallet();
  const member = signedIn && account ? `/member/${account}` : "/login";

  const main: Item[] = [
    { href: home, label: "Overview", Icon: LayoutGrid },
    { href: "/dashboard#circles", label: "My chits", Icon: Orbit },
    { href: "/#auctions", label: "Auctions", Icon: Gavel },
    { href: "/activity?type=bids", label: "My bids", Icon: Star },
    { href: `${member}${member === "/login" ? "" : "#risk"}`, label: "AI risk", Icon: ShieldCheck },
  ];
  const secondary: Item[] = [
    { href: "/activity", label: "Transactions", Icon: Activity },
    { href: `${member}${member === "/login" ? "" : "#reputation"}`, label: "Reputation", Icon: Star },
    { href: "/#how", label: "How it works", Icon: BookOpenText },
    { href: "/support", label: "Support", Icon: LifeBuoy },
  ];
  // Only one item per href family is marked active, so the sidebar shows a single indicator.
  const activeLabel = (() => {
    if (isActive("/activity")) return "Transactions";
    if (isActive("/support")) return "Support";
    if (isActive("/member")) return "AI risk";
    if (isActive("/dashboard") || isActive("/organizer") || isActive("/admin")) return "Overview";
    if (isActive("/")) return "Auctions";
    return null;
  })();

  const network = !hasWallet || chainId === null ? { label: "Disconnected", dot: "bg-muted-foreground/60", pulse: false } : correctChain ? { label: "Connected", dot: "bg-success", pulse: true } : { label: "Wrong network", dot: "bg-danger", pulse: false };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col border-r border-white/[0.08] bg-surface md:flex xl:w-60" aria-label="Main">
      <Link href="/" className="flex h-16 items-center justify-center gap-2.5 px-3 text-primary xl:justify-start xl:px-5" aria-label="ChitChain home">
        <Logo className="h-7 w-7" />
        <span className="hidden text-[17px] font-semibold tracking-tight text-foreground xl:inline">ChitChain</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-2 xl:px-3" aria-label="Sections">
        <ul className="space-y-1">{main.map((it) => <NavLink key={it.label} item={it} active={activeLabel === it.label} />)}</ul>
        <div className="mx-2 border-t border-white/[0.08]" />
        <ul className="space-y-1">{secondary.map((it) => <NavLink key={it.label} item={it} active={activeLabel === it.label} />)}</ul>
      </nav>
      <div className="border-t border-white/[0.08] p-3 text-[12px] text-muted-foreground xl:p-4">
        <div className="hidden space-y-2 xl:block">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            <span className="font-mono text-foreground">{account ? shortAddr(account) : "No wallet"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", network.dot, network.pulse && "status-dot")} aria-hidden />
            <span>{CHAIN_NAME}</span>
            <span className="text-muted-foreground/70">·</span>
            <span>{network.label}</span>
          </div>
          {HAS_CONTRACT ? (
            <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground" aria-label={`Contract ${CONTRACT_ADDRESS} on MSTScan`}>
              <span>Contract</span>
              <span className="font-mono">{shortAddr(CONTRACT_ADDRESS, 6, 4)}</span>
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : (
            <span>Contract not deployed yet</span>
          )}
          {signedIn ? (
            <button type="button" onClick={() => void auth.signOut()} className="flex items-center gap-1.5 rounded-md text-foreground hover:text-primary">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
            </button>
          ) : (
            <Link href="/login" className="flex items-center gap-1.5 rounded-md text-foreground hover:text-primary">
              <KeyRound className="h-3.5 w-3.5" aria-hidden /> Sign in
            </Link>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 xl:hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("h-2.5 w-2.5 rounded-full", network.dot, network.pulse && "status-dot")} aria-label={`${CHAIN_NAME}: ${network.label}`} />
            </TooltipTrigger>
            <TooltipContent side="right">{CHAIN_NAME} · {network.label}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              {signedIn ? (
                <button type="button" onClick={() => void auth.signOut()} className="rounded-md p-1 text-foreground hover:text-primary" aria-label="Sign out"><LogOut className="h-4 w-4" aria-hidden /></button>
              ) : (
                <Link href="/login" className="rounded-md p-1 text-foreground hover:text-primary" aria-label="Sign in"><KeyRound className="h-4 w-4" aria-hidden /></Link>
              )}
            </TooltipTrigger>
            <TooltipContent side="right">{signedIn ? "Sign out" : "Sign in"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
