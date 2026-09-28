"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getInjected, isCorrectChain, readAccounts, readChainId, requestAccounts, subscribe, switchToMst } from "@/lib/wallet";

export interface WalletState {
  hasWallet: boolean;
  account: string | null;
  chainId: number | null;
  correctChain: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState | null>(null);
const DISCONNECT_KEY = "chitchain:disconnected";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [hasWallet, setHasWallet] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const eth = getInjected();
    setHasWallet(!!eth);
    if (!eth) return;
    const manuallyDisconnected = typeof localStorage !== "undefined" && localStorage.getItem(DISCONNECT_KEY) === "1";
    readChainId().then(setChainId).catch(() => setChainId(null));
    if (!manuallyDisconnected) readAccounts().then((a) => setAccount(a[0] ?? null)).catch(() => {});
    return subscribe({
      onAccounts: (a) => setAccount(a[0] ?? null),
      onChain: (id) => setChainId(id),
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const a = await requestAccounts();
      localStorage.removeItem(DISCONNECT_KEY);
      setAccount(a[0] ?? null);
      setChainId(await readChainId());
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem(DISCONNECT_KEY, "1");
    setAccount(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    await switchToMst();
    setChainId(await readChainId());
  }, []);

  const value = useMemo<WalletState>(
    () => ({ hasWallet, account, chainId, correctChain: isCorrectChain(chainId), connecting, connect, disconnect, switchNetwork }),
    [hasWallet, account, chainId, connecting, connect, disconnect, switchNetwork]
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
