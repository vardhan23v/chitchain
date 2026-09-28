"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDot, PlusCircle, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NetworkPill } from "@/components/NetworkPill";
import { WalletMenu } from "@/components/WalletMenu";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Circles", Icon: CircleDot },
  { href: "/create", label: "Create", Icon: PlusCircle },
] as const;

export function NavBar() {
  const path = usePathname();
  const { account } = useWallet();
  const profileHref = account ? `/member/${account}` : "/member/me";
  const items = [...NAV, { href: profileHref, label: "Profile", Icon: User }];
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href.split("/").slice(0, 2).join("/")));

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Logo />
            <span className="text-foreground">ChitChain</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map(({ href, label }) => (
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
            <NetworkPill />
            <WalletMenu />
          </div>
        </div>
      </header>
      {/* Mobile bottom tab bar (DESIGN §5) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Mobile">
        {items.map(({ href, label, Icon }) => (
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
