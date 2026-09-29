"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { NetworkPill } from "@/components/NetworkPill";
import { WalletMenu } from "@/components/WalletMenu";
import { pageTitle } from "@/lib/routes";

/** 64 px header: page title (wordmark on mobile), network pill, notifications, wallet. */
export function TopHeader() {
  const path = usePathname();
  const title = pageTitle(path);
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-lg text-primary md:hidden" aria-label="ChitChain home">
          <Logo className="h-7 w-7" />
          <span className="text-[17px] font-semibold tracking-tight text-foreground">ChitChain</span>
        </Link>
        <h2 className="hidden text-[15px] font-semibold tracking-tight text-foreground md:block">{title}</h2>
        <div className="ml-auto flex items-center gap-2">
          <NetworkPill />
          <Button variant="secondary" size="icon" className="h-8 w-8" aria-label="Notifications" asChild>
            <Link href="/activity"><Bell aria-hidden /></Link>
          </Button>
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}
