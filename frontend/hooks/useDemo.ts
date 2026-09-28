"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { DemoState } from "@/lib/types";

export function useDemo() {
  const state = usePolling<DemoState>(() => api.demoState(), POLL_API_MS, []);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async <T,>(key: string, fn: () => Promise<T>, ok: (r: T) => string): Promise<T | null> => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(ok(r));
      await state.refetch();
      return r;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setBusy(null);
    }
  };

  return {
    ...state,
    busy,
    fund: () => act("fund", api.demoFund, (r) => `Funded — ${r.txHashes.length} txs`),
    assessAll: () => act("assess", api.demoAssessAll, (r) => `Assessed ${r.results.length} wallets on-chain`),
    newCircle: () => act("new", () => api.demoNewCircle({ roundDuration: 30 }), (r) => `Circle #${r.circleId} created and all 5 wallets joined`),
    skip: (address: string, skip: boolean) => act(`skip:${address}`, () => api.demoSkip(address, skip), () => (skip ? "Will skip payment this round" : "Will pay this round")),
    withdraw: (address: string, circleId: number) => act(`wd:${address}`, () => api.demoWithdraw(address, circleId), () => "Withdraw sent"),
  };
}
