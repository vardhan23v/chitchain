"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <Toaster position="bottom-right" richColors closeButton offset={16} toastOptions={{ classNames: { toast: "rounded-2xl border-white/70 shadow-[0_8px_30px_-12px_rgba(46,74,125,0.35)] backdrop-blur-xl", title: "text-[13px] font-semibold", description: "text-xs" } }} />
        </TooltipProvider>
      </AuthProvider>
    </WalletProvider>
  );
}
