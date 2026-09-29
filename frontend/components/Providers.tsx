"use client";

import { UsernameGate } from "@/components/profile/UsernameGate";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionPrefProvider } from "@/components/motion/MotionPref";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
            <UsernameGate />
        <TooltipProvider delayDuration={200}>
          <MotionPrefProvider>{children}</MotionPrefProvider>
          <Toaster position="bottom-right" theme="dark" richColors closeButton offset={16} toastOptions={{ classNames: { toast: "rounded-2xl border-white/10 bg-surface2 text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]", title: "text-[13px] font-semibold", description: "text-xs" } }} />
        </TooltipProvider>
      </AuthProvider>
    </WalletProvider>
  );
}
