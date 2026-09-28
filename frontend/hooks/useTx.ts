"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ContractTransactionResponse } from "ethers";
import { parseTxError } from "@/lib/errors";
import { txUrl } from "@/lib/format";
import { createElement } from "react";
import { TxToastLink } from "@/components/TxLink";

export interface TxOptions {
  /** e.g. "Contribution recorded on-chain" */
  success: string;
  /** Called after the tx is mined. */
  onMined?: (hash: string) => void | Promise<void>;
}

/**
 * DESIGN §8: loading "Confirm in BridgeKey…" → "Submitted" toast with link → wait() → success toast with link.
 * Never shows success before the tx is mined.
 */
export function useTx() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async (send: () => Promise<ContractTransactionResponse>, opts: TxOptions): Promise<string | null> => {
    setPending(true);
    const loadingId = toast.loading("Confirm in BridgeKey…");
    try {
      const tx = await send();
      toast.dismiss(loadingId);
      const minedId = toast.loading("Submitted — waiting for confirmation", {
        description: createElement(TxToastLink, { hash: tx.hash }),
      });
      const receipt = await tx.wait();
      toast.dismiss(minedId);
      if (!receipt || receipt.status !== 1) {
        toast.error("Transaction reverted", { description: createElement(TxToastLink, { hash: tx.hash }) });
        return null;
      }
      toast.success(opts.success, { description: createElement(TxToastLink, { hash: tx.hash }) });
      await opts.onMined?.(tx.hash);
      return tx.hash;
    } catch (e) {
      toast.dismiss(loadingId);
      const ui = parseTxError(e);
      if (ui.neutral) toast(ui.message);
      else toast.error(ui.message);
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, txUrl };
}
