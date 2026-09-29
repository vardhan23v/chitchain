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
    (discount: bigint) => run(async () => (await getSignerContract()).placeBid(id, discount), { success: "Bid placed.", onMined: after }),
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
  /** Settle from the connected wallet; if no wallet, ask the backend keeper. */
  const settle = useCallback(
    async (hasWallet: boolean) => {
      if (hasWallet) return run(async () => (await getSignerContract()).settleRound(id), { success: "Round settled.", onMined: after });
      try {
        const r = await api.settle(id);
        toast.success("Round settled by the keeper.", { description: r.txHash });
        await after();
        return r.txHash;
      } catch (e) {
        toast.error(parseTxError(e).message);
        return null;
      }
    },
    [id, run, after]
  );

  return { pending, tx, keepWaiting, dismiss, join, contribute, bid, withdraw, leave, cancel, settle };
}
