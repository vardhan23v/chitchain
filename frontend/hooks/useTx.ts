"use client";

import { createElement, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { ContractTransactionResponse } from "ethers";
import { parseTxError } from "@/lib/errors";
import { txUrl } from "@/lib/format";
import { TxToastLink } from "@/components/TxLink";

export type TxStage = "idle" | "wallet" | "signing" | "submitted" | "confirming" | "confirmed" | "failed";

export const TX_STAGES: { key: TxStage; label: string }[] = [
  { key: "wallet", label: "Waiting for wallet" },
  { key: "signing", label: "Signing" },
  { key: "submitted", label: "Submitted" },
  { key: "confirming", label: "Confirming" },
  { key: "confirmed", label: "Confirmed" },
];

export const STAGE_LABEL: Record<TxStage, string> = {
  idle: "",
  wallet: "Waiting for wallet",
  signing: "Signing",
  submitted: "Submitted",
  confirming: "Confirming",
  confirmed: "Confirmed",
  failed: "Failed",
};

export interface TxState {
  stage: TxStage;
  hash: string | null;
  /** Plain-English failure message (never raw CALL_EXCEPTION / hex). */
  error: string | null;
}

export interface TxOptions {
  /** e.g. "Contribution recorded on-chain" */
  success: string;
  /** Called after the tx is mined. */
  onMined?: (hash: string) => void | Promise<void>;
}

/**
 * DESIGN §8 transaction UX with five surfaced stages:
 * Waiting for wallet → Signing → Submitted → Confirming → Confirmed (or Failed: <plain message>).
 * One sonner toast is updated in place; `state` drives the inline stepper. Never shows success before mined.
 */
export function useTx() {
  const [state, setState] = useState<TxState>({ stage: "idle", hash: null, error: null });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const run = useCallback(async (send: () => Promise<ContractTransactionResponse>, opts: TxOptions): Promise<string | null> => {
    const id = `tx-${Date.now()}`;
    const set = (stage: TxStage, extra?: Partial<TxState>) => setState((s) => ({ ...s, stage, ...extra }));
    setState({ stage: "wallet", hash: null, error: null });
    toast.loading(STAGE_LABEL.wallet + "…", { id, description: "Open BridgeKey to continue" });
    // The wallet prompt appears once the provider request goes out; after a beat we call it "Signing".
    later(700, () => {
      setState((s) => (s.stage === "wallet" ? { ...s, stage: "signing" } : s));
      toast.loading(STAGE_LABEL.signing + "…", { id, description: "Confirm in BridgeKey" });
    });
    try {
      const tx = await send();
      clearTimers();
      set("submitted", { hash: tx.hash });
      toast.loading(STAGE_LABEL.submitted, { id, description: createElement(TxToastLink, { hash: tx.hash }) });
      later(800, () => {
        setState((s) => (s.stage === "submitted" ? { ...s, stage: "confirming" } : s));
        toast.loading(STAGE_LABEL.confirming + "…", { id, description: createElement(TxToastLink, { hash: tx.hash }) });
      });
      const receipt = await tx.wait();
      clearTimers();
      if (!receipt || receipt.status !== 1) {
        set("failed", { error: "The transaction reverted on-chain." });
        toast.error("The transaction reverted on-chain.", { id, description: createElement(TxToastLink, { hash: tx.hash }) });
        return null;
      }
      set("confirmed");
      toast.success(opts.success, { id, description: createElement(TxToastLink, { hash: tx.hash }) });
      await opts.onMined?.(tx.hash);
      return tx.hash;
    } catch (e) {
      clearTimers();
      const ui = parseTxError(e);
      set("failed", { error: ui.message });
      if (ui.neutral) toast(ui.message, { id });
      else toast.error(ui.message, { id });
      return null;
    } finally {
      later(4000, () => setState((s) => (s.stage === "confirmed" || s.stage === "failed" ? { stage: "idle", hash: null, error: null } : s)));
    }
  }, []);

  const pending = state.stage === "wallet" || state.stage === "signing" || state.stage === "submitted" || state.stage === "confirming";
  return { run, pending, state, txUrl };
}
