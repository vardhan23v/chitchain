"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useTx } from "@/hooks/useTx";
import { api } from "@/lib/api";
import { getSignerContract } from "@/lib/contract";
import { parseTxError } from "@/lib/errors";

/** All write actions for a circle room, each following the DESIGN §8 tx flow. */
export function useRoomActions(id: number, refetch: () => Promise<void>) {
  const { run, pending, state: tx, keepWaiting, dismiss } = useTx();
  const after = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const join = useCallback(
    (value: bigint) => run(async () => (await getSignerContract()).join(id, { value }), { success: "Joined the circle. Your collateral is locked in the contract.", onMined: after }),
    [id, run, after]
  );
  const contribute = useCallback(
    (value: bigint) => run(async () => (await getSignerContract()).contribute(id, { value }), { success: "Contributed to this round.", onMined: after }),
    [id, run, after]
  );
  const bid = useCallback(
    (discount: bigint) => run(async () => (await getSignerContract()).placeBid(id, discount), { success: "Bid placed. Your payout offer is on-chain.", onMined: after }),
    [id, run, after]
  );
  /** The round's recipient takes the full pot: settles the round on-chain, no auction. */
  const accept = useCallback(
    () => run(async () => (await getSignerContract()).acceptFullPot(id), { success: "Full pot accepted. Your payout is claimable.", onMined: after }),
    [id, run, after]
  );
  /** The round's recipient declines the full pot: the auction opens on-chain. */
  const decline = useCallback(
    () => run(async () => (await getSignerContract()).declineFullPot(id), { success: "Full pot declined. The auction is open.", onMined: after }),
    [id, run, after]
  );
  const withdraw = useCallback(
    () => run(async () => (await getSignerContract()).withdraw(id), { success: "Withdrawn to your wallet.", onMined: after }),
    [id, run, after]
  );
  const leave = useCallback(
    () => run(async () => (await getSignerContract()).leave(id), { success: "Left the circle. Your collateral is claimable.", onMined: after }),
    [id, run, after]
  );
  const cancel = useCallback(
    () => run(async () => (await getSignerContract()).cancel(id), { success: "Circle cancelled. Your collateral is claimable.", onMined: after }),
    [id, run, after]
  );
  /**
   * Move the round on once its window passed: close contributions (misses covered from collateral) or settle the round.
   * From the connected wallet when there is one; otherwise the backend keeper sends it.
   */
  const settle = useCallback(
    async (hasWallet: boolean, step: "closeContributions" | "settleRound" = "settleRound") => {
      const done = step === "closeContributions" ? "Contributions closed. The recipient can now decide." : "Round settled.";
      if (hasWallet) return run(async () => (await getSignerContract())[step](id), { success: done, onMined: after });
      try {
        const r = await api.settle(id);
        toast.success(r.step === "closeContributions" ? "Contributions closed by the keeper." : "Round settled by the keeper.", { description: r.txHash });
        await after();
        return r.txHash;
      } catch (e) {
        toast.error(parseTxError(e).message);
        return null;
      }
    },
    [id, run, after]
  );

  return { pending, tx, keepWaiting, dismiss, join, contribute, bid, accept, decline, withdraw, leave, cancel, settle };
}
