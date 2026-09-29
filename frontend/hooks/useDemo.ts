"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, type DemoNewCircleBody } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import type { DemoState, Health, UnderfundedWallet } from "@/lib/types";
import { toUnderfunded } from "@/components/UnderfundedBanner";

export function useDemo() {
  const state = usePolling<DemoState>(() => api.demoState(), POLL_API_MS, []);
  const [busy, setBusy] = useState<string | null>(null);
  /** Wallet list from the last 409 DEMO_UNDERFUNDED reply to POST /demo/new-circle (null until it happens). */
  const [underfunded, setUnderfunded] = useState<UnderfundedWallet[] | null>(null);
  // /health is optional context here: `demo.underfunded` / `demo.wallets` are absent on the old backend.
  const health = usePolling<Health | null>(() => api.health().catch(() => null), POLL_API_MS * 3, []);
  const healthUnderfunded: UnderfundedWallet[] = (() => {
    const d = health.data?.demo;
    if (!d) return [];
    const fromList = toUnderfunded(d.underfunded);
    if (fromList.length) return fromList;
    return toUnderfunded((d.wallets ?? []).filter((w) => w.underfunded));
  })();

  const act = async <T,>(key: string, fn: () => Promise<T>, ok: (r: T) => string): Promise<T | null> => {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(ok(r));
      await state.refetch();
      return r;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === "DEMO_UNDERFUNDED") {
        const body = (e.body ?? {}) as Record<string, unknown>;
        const list = toUnderfunded(body.wallets ?? body.underfunded ?? (body.details as Record<string, unknown> | undefined)?.wallets);
        setUnderfunded(list);
        toast.error("Demo wallets are underfunded. Top them up from the faucet before creating a circle.");
        return null;
      }
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
    newCircle: (body: DemoNewCircleBody) => {
      setUnderfunded(null);
      return act("new", () => api.demoNewCircle(body), (r) => `Demo circle #${r.circleId} created, all five wallets joined.`);
    },
    underfunded,
    healthUnderfunded,
    skip: (address: string, skip: boolean) => act(`skip:${address}`, () => api.demoSkip(address, skip), () => (skip ? "This wallet will skip payment this round." : "This wallet will pay this round.")),
    withdraw: (address: string, circleId: number) => act(`wd:${address}`, () => api.demoWithdraw(address, circleId), () => "Withdrawal sent."),
  };
}
