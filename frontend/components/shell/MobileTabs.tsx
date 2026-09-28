"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, LayoutDashboard, PlusCircle, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; Icon: typeof CircleDot };

/** Role-aware nav targets shared by the mobile tab bar and the desktop rail. */
export function useNavItems() {
  const path = usePathname();
  const { account } = useWallet();
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  // Role home: /dashboard, /organizer or /admin. Anonymous users go to /login.
  const dashboard: NavItem = { href: signedIn ? auth.home : "/login", label: "Dashboard", Icon: LayoutDashboard };
  const profileHref = signedIn && account ? `/member/${account}` : "/login";
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/circle/") : href !== "/login" && path.startsWith(href.split("/").slice(0, 2).join("/")));
  return { signedIn, dashboard, profileHref, isActive };
}

/** Mobile bottom tab bar (DESIGN §5). Desktop uses the icon rail instead. */
export function MobileTabs() {
  const { dashboard, profileHref, isActive } = useNavItems();
  const mobile: NavItem[] = [{ href: "/", label: "Circles", Icon: CircleDot }, dashboard, { href: "/create", label: "Create", Icon: PlusCircle }, { href: profileHref, label: "Profile", Icon: User }];
  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 rounded-t-3xl border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
      {mobile.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}
          >
            <span className={cn("rounded-full px-3 py-0.5 transition-colors", active && "bg-primary text-primary-foreground")}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
