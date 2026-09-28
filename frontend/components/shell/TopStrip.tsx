"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { NetworkPill } from "@/components/NetworkPill";
import { WalletMenu } from "@/components/WalletMenu";

/** Slim strip above the content: wordmark on mobile (the rail carries the mark on desktop), network pill, refresh, wallet. */
export function TopStrip() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-[#EEF3FA]/95 via-[#EEF3FA]/70 to-transparent backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 md:h-16 md:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-lg text-primary md:hidden" aria-label="ChitChain home">
          <Logo className="h-7 w-7" />
          <span className="text-[17px] font-bold tracking-tight text-foreground">ChitChain</span>
        </Link>
        <span className="hidden text-[15px] font-semibold tracking-tight text-foreground md:inline">ChitChain</span>
        <div className="ml-auto flex items-center gap-2">
          <NetworkPill />
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Refresh" onClick={() => router.refresh()}>
            <RefreshCw aria-hidden />
          </Button>
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}
