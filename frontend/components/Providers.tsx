"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="bottom-right" richColors closeButton toastOptions={{ classNames: { toast: "rounded-2xl" } }} />
      </TooltipProvider>
    </WalletProvider>
  );
}
