"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, CircleDot, Gavel, LayoutGrid, Orbit, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; Icon: typeof CircleDot };

/** Role-aware nav targets shared by the mobile tab bar and the sidebar. */
export function useNavItems() {
  const path = usePathname();
  const { account } = useWallet();
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  // Role home: /dashboard, /organizer or /admin. Anonymous users go to /login.
  const home = signedIn ? auth.home : "/login";
  const dashboard: NavItem = { href: home, label: "Overview", Icon: LayoutGrid };
  const profileHref = signedIn && account ? `/member/${account}` : "/login";
  const isActive = (href: string) => {
    const base = href.split(/[#?]/)[0];
    if (base === "/") return path === "/";
    if (base === "/login") return path === "/login";
    return path.startsWith(base.split("/").slice(0, 2).join("/"));
  };
  return { signedIn, home, dashboard, profileHref, isActive, path };
}

/** Mobile bottom tab bar: five tabs on a dark surface, red indicator on the active one. Desktop uses the sidebar. */
export function MobileTabs() {
  const { home, profileHref, isActive } = useNavItems();
  const tabs: NavItem[] = [
    { href: home, label: "Overview", Icon: LayoutGrid },
    { href: "/dashboard#circles", label: "Chits", Icon: Orbit },
    { href: "/#auctions", label: "Auctions", Icon: Gavel },
    { href: "/activity", label: "Activity", Icon: Activity },
    { href: profileHref, label: "Profile", Icon: UserRound },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.08] bg-surface pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
      {tabs.map(({ href, label, Icon }) => {
        const active = isActive(href) && !(label === "Auctions" && isActive("/dashboard"));
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground")}
          >
            {active && <motion.span layoutId="mobile-tab" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" transition={{ duration: 0.25 }} aria-hidden />}
            <Icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
