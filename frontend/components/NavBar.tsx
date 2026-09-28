"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, LayoutDashboard, LifeBuoy, PlusCircle, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NetworkPill } from "@/components/NetworkPill";
import { TestnetBadge } from "@/components/TestnetBadge";
import { WalletMenu } from "@/components/WalletMenu";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: typeof CircleDot };

export function NavBar() {
  const path = usePathname();
  const { account } = useWallet();
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  // Role home: /dashboard, /organizer or /admin. Anonymous users go to /login.
  const dashboard: Item = { href: signedIn ? auth.home : "/login", label: "Dashboard", Icon: LayoutDashboard };
  const profileHref = signedIn && account ? `/member/${account}` : "/login";
  const desktop: Item[] = [
    { href: "/", label: "Circles", Icon: CircleDot },
    ...(signedIn ? [dashboard] : []),
    { href: "/create", label: "Create", Icon: PlusCircle },
    { href: "/support", label: "Support", Icon: LifeBuoy },
  ];
  const mobile: Item[] = [{ href: "/", label: "Circles", Icon: CircleDot }, dashboard, { href: "/create", label: "Create", Icon: PlusCircle }, { href: profileHref, label: "Profile", Icon: User }];
  const isActive = (href: string) => (href === "/" ? path === "/" : href !== "/login" && path.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Logo />
            <span className="text-foreground">ChitChain</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {desktop.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive(href) && "bg-accent text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <TestnetBadge className="hidden sm:inline-flex" />
            <NetworkPill />
            <WalletMenu />
          </div>
        </div>
      </header>
      {/* Mobile bottom tab bar (DESIGN §5) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Mobile">
        {mobile.map(({ href, label, Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
              isActive(href) && "text-primary"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
