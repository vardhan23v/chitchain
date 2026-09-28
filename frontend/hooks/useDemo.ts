"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, type DemoNewCircleBody } from "@/lib/api";
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
      toast.error(e instanceof Error ? e.message : "The request failed.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  return {
    ...state,
    busy,
    fund: () => act("fund", api.demoFund, (r) => `Funded demo wallets, ${r.txHashes.length} transactions.`),
    assessAll: () => act("assess", api.demoAssessAll, (r) => `Assessed ${r.results.length} wallets.`),
    newCircle: (body: DemoNewCircleBody) => act("new", () => api.demoNewCircle(body), (r) => `Demo circle #${r.circleId} created, all five wallets joined.`),
    skip: (address: string, skip: boolean) => act(`skip:${address}`, () => api.demoSkip(address, skip), () => (skip ? "This wallet will skip payment this round." : "This wallet will pay this round.")),
    withdraw: (address: string, circleId: number) => act(`wd:${address}`, () => api.demoWithdraw(address, circleId), () => "Withdrawal sent."),
  };
}
