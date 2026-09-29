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

/** How long we wait for a receipt before showing the "Taking longer than usual" state (audit 23.6). */
export const TX_WAIT_TIMEOUT_MS = 90_000;
export const TX_SLOW_TOAST = "Still waiting for the network. You can keep this open or check MSTScan.";

export interface TxState {
  stage: TxStage;
  hash: string | null;
  /** Plain-English failure message (never raw CALL_EXCEPTION / hex). */
  error: string | null;
  /** True once the receipt wait has passed TX_WAIT_TIMEOUT_MS; the wait itself keeps running in the background. */
  slow: boolean;
}

export interface TxOptions {
  /** e.g. "Contribution recorded on-chain" */
  success: string;
  /** Called after the tx is mined. */
  onMined?: (hash: string) => void | Promise<void>;
}

const IDLE: TxState = { stage: "idle", hash: null, error: null, slow: false };

/**
 * DESIGN §8 transaction UX with five surfaced stages:
 * Waiting for wallet → Signing → Submitted → Confirming → Confirmed (or Failed: <plain message>).
 * One sonner toast is updated in place; `state` drives the inline stepper. Never shows success before mined.
 * The receipt wait is raced against a 90 s timer: on timeout the stepper shows "Taking longer than usual" with
 * "Keep waiting" (restarts the timer) and "Dismiss" (clears the pending state; the page's polling picks up the result).
 */
export function useTx() {
  const [state, setState] = useState<TxState>(IDLE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Bumped per run and on dismiss so a stale receipt can never touch newer state. */
  const runId = useRef(0);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef<string | null>(null);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const clearSlowTimer = () => {
    if (slowTimer.current) clearTimeout(slowTimer.current);
    slowTimer.current = null;
  };

  const armSlowTimer = useCallback((id: number, hash: string) => {
    clearSlowTimer();
    slowTimer.current = setTimeout(() => {
      if (runId.current !== id) return;
      setState((s) => (s.stage === "submitted" || s.stage === "confirming" ? { ...s, stage: "confirming", slow: true } : s));
      if (toastId.current) toast.loading(TX_SLOW_TOAST, { id: toastId.current, description: createElement(TxToastLink, { hash }) });
    }, TX_WAIT_TIMEOUT_MS);
  }, []);

  const run = useCallback(
    async (send: () => Promise<ContractTransactionResponse>, opts: TxOptions): Promise<string | null> => {
      const my = ++runId.current;
      const id = `tx-${Date.now()}`;
      toastId.current = id;
      const live = () => runId.current === my;
      const set = (stage: TxStage, extra?: Partial<TxState>) => {
        if (live()) setState((s) => ({ ...s, stage, ...extra }));
      };
      clearTimers();
      clearSlowTimer();
      setState({ stage: "wallet", hash: null, error: null, slow: false });
      toast.loading(STAGE_LABEL.wallet + "…", { id, description: "Open BridgeKey to continue" });
      // The wallet prompt appears once the provider request goes out; after a beat we call it "Signing".
      later(700, () => {
        if (!live()) return;
        setState((s) => (s.stage === "wallet" ? { ...s, stage: "signing" } : s));
        toast.loading(STAGE_LABEL.signing + "…", { id, description: "Confirm in BridgeKey" });
      });
      let hash: string | null = null;
      try {
        const tx = await send();
        hash = tx.hash;
        clearTimers();
        set("submitted", { hash: tx.hash });
        toast.loading(STAGE_LABEL.submitted, { id, description: createElement(TxToastLink, { hash: tx.hash }) });
        later(800, () => {
          if (!live()) return;
          setState((s) => (s.stage === "submitted" ? { ...s, stage: "confirming" } : s));
          toast.loading(STAGE_LABEL.confirming + "…", { id, description: createElement(TxToastLink, { hash: tx.hash }) });
        });
        armSlowTimer(my, tx.hash);
        // The wait is never abandoned: the timer only changes what the UI says while it runs.
        const receipt = await tx.wait();
        clearTimers();
        if (!live()) {
          // Dismissed while waiting: the page's polling already reflects the result.
          toast.dismiss(id);
          return receipt && receipt.status === 1 ? tx.hash : null;
        }
        clearSlowTimer();
        if (!receipt || receipt.status !== 1) {
          set("failed", { error: "The transaction reverted on-chain.", slow: false });
          toast.error("The transaction reverted on-chain.", { id, description: createElement(TxToastLink, { hash: tx.hash }) });
          return null;
        }
        set("confirmed", { slow: false });
        toast.success(opts.success, { id, description: createElement(TxToastLink, { hash: tx.hash }) });
        await opts.onMined?.(tx.hash);
        return tx.hash;
      } catch (e) {
        clearTimers();
        if (!live()) {
          toast.dismiss(id);
          return null;
        }
        clearSlowTimer();
        const ui = parseTxError(e);
        set("failed", { error: ui.message, slow: false, hash });
        if (ui.neutral) toast(ui.message, { id });
        else toast.error(ui.message, { id });
        return null;
      } finally {
        if (live()) later(4000, () => setState((s) => (s.stage === "confirmed" || s.stage === "failed" ? IDLE : s)));
      }
    },
    [armSlowTimer]
  );

  /** "Keep waiting": hide the slow notice and restart the 90 s timer. The receipt wait was never interrupted. */
  const keepWaiting = useCallback(() => {
    setState((s) => {
      if (!s.slow || !s.hash) return s;
      armSlowTimer(runId.current, s.hash);
      if (toastId.current) toast.loading(STAGE_LABEL.confirming + "…", { id: toastId.current, description: createElement(TxToastLink, { hash: s.hash }) });
      return { ...s, slow: false };
    });
  }, [armSlowTimer]);

  /** "Dismiss": clear the pending state. The wait continues silently; the page's polling will pick up the result. */
  const dismiss = useCallback(() => {
    runId.current += 1;
    clearTimers();
    clearSlowTimer();
    if (toastId.current) toast.dismiss(toastId.current);
    toastId.current = null;
    setState(IDLE);
  }, []);

  const pending = state.stage === "wallet" || state.stage === "signing" || state.stage === "submitted" || state.stage === "confirming";
  return { run, pending, state, txUrl, keepWaiting, dismiss };
}
