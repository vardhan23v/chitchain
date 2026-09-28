"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, LayoutDashboard, LifeBuoy, PlusCircle, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NetworkPill } from "@/components/NetworkPill";
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
  const isActive = (href: string) => (href === "/" ? path === "/" || path.startsWith("/circle/") : href !== "/login" && path.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 md:h-16">
          <Link href="/" className="flex items-center gap-2 rounded-lg text-primary" aria-label="ChitChain home">
            <Logo className="h-7 w-7" />
            <span className="text-[17px] font-bold tracking-tight text-foreground">ChitChain</span>
          </Link>
          <nav className="ml-3 hidden items-center gap-0.5 md:flex" aria-label="Main">
            {desktop.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <NetworkPill />
            <WalletMenu />
          </div>
        </div>
      </header>
      {/* Mobile bottom tab bar (DESIGN §5) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile">
        {mobile.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors", active ? "text-primary" : "text-muted-foreground")}
            >
              <span className={cn("rounded-full px-3 py-0.5 transition-colors", active && "bg-primary/10")}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
