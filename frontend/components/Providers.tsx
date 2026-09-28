"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="bottom-right" richColors closeButton offset={16} toastOptions={{ classNames: { toast: "rounded-2xl border shadow-lg", title: "text-[13px] font-semibold", description: "text-xs" } }} />
        </TooltipProvider>
      </AuthProvider>
    </WalletProvider>
  );
}
