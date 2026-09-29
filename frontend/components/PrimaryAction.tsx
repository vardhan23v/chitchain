"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceShortfall } from "@/components/BalanceShortfall";
import { JoinDialog } from "@/components/JoinDialog";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import { useBalanceCheck } from "@/hooks/useBalance";
import type { WalletState } from "@/hooks/useWallet";
import { BRIDGEKEY_URL } from "@/lib/chain";
import { formatMst } from "@/lib/format";
import type { CircleSummary, MemberInfo, RoundPhase, Tier } from "@/lib/types";

export interface PrimaryActionProps {
  wallet: WalletState;
  circle: CircleSummary;
  me: MemberInfo | null;
  viewerRequired: bigint | null;
  viewerTier: Tier | null;
  pending: boolean;
  hasContract: boolean;
  /** Client-side round phase (contribution | bidding | settling). */
  phase?: RoundPhase;
  on: {
    join: () => void;
    contribute: () => void;
    withdraw: () => void;
    focusBid: () => void;
    leave: () => void;
    cancel: () => void;
  };
}

/** DESIGN §6.3 primary-action state table: one clear CTA at a time. */
export function PrimaryAction({ wallet, circle, me, viewerRequired, viewerTier, pending, hasContract, phase = "contribution", on }: PrimaryActionProps) {
  const cls = "w-full md:w-auto md:min-w-[220px]";
  // Pre-send balance check for the contribution (audit 1.8); only runs while a contribution is actually due.
  const contributeDue = circle.status === 1 && !!me?.joined && !me.paidThisRound && phase === "contribution" && BigInt(me?.claimable ?? "0") === 0n && !me?.removed;
  const contributeCheck = useBalanceCheck(contributeDue ? BigInt(circle.contribution) : null, wallet.account, wallet.correctChain);
  if (!hasContract) return <Button size="lg" className={cls} disabled>Contract not deployed</Button>;
  if (!wallet.hasWallet) return <Button size="lg" className={cls} asChild><a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer">Install BridgeKey</a></Button>;
  if (!wallet.account) return <Button size="lg" className={cls} onClick={() => void wallet.connect()} disabled={wallet.connecting}>{wallet.connecting && <Loader2 className="animate-spin" aria-hidden />}Connect BridgeKey</Button>;
  if (!wallet.correctChain) return <Button size="lg" variant="destructive" className={cls} onClick={() => void wallet.switchNetwork()}>Switch to MST Testnet</Button>;

  const claimable = BigInt(me?.claimable ?? "0");
  const spin = pending ? <Loader2 className="animate-spin" aria-hidden /> : null;

  if (me?.removed) return <Button size="lg" className={cls} disabled>Removed, collateral exhausted</Button>;
  if (claimable > 0n) return <WithdrawDialog claimable={me!.claimable} disabled={pending} onConfirm={on.withdraw} className={cls} />;

  const now = Math.floor(Date.now() / 1000);
  if (circle.status === 0) {
    if (me?.joined) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className={cls} disabled>Joined, waiting for {circle.maxMembers - circle.memberCount} more</Button>
          <Button size="lg" variant="outline" onClick={on.leave} disabled={pending}>{spin}Leave the circle</Button>
        </div>
      );
    }
    if (now > circle.joinDeadline && circle.memberCount < circle.maxMembers) {
      return <Button size="lg" variant="outline" className={cls} onClick={on.cancel} disabled={pending}>{spin}Cancel the circle and refund collateral</Button>;
    }
    return <JoinDialog required={viewerRequired} tier={viewerTier} contribution={circle.contribution} disabled={pending} onConfirm={on.join} className={cls} circleId={circle.id} account={wallet.account} />;
  }
  if (circle.status === 1) {
    if (!me?.joined) return <Button size="lg" className={cls} disabled>Circle is full</Button>;
    if (!me.paidThisRound && phase === "contribution") {
      const short = !!contributeCheck && !contributeCheck.ok;
      return (
        <div className="space-y-2">
          <Button size="lg" className={cls} onClick={on.contribute} disabled={pending || short}>{spin}Contribute {formatMst(circle.contribution)} MST</Button>
          <BalanceShortfall check={contributeCheck} />
        </div>
      );
    }
    if (phase === "settling") return <Button size="lg" className={cls} disabled>Round closed, waiting for settlement</Button>;
    if (!me.hasWon && BigInt(me.bidThisRound || "0") === 0n) {
      return (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className={cls} onClick={on.focusBid}>Place a bid</Button>
          <Button size="lg" variant="ghost" disabled>{!me.paidThisRound ? "Contributions closed" : "Skip"}</Button>
        </div>
      );
    }
    return <Button size="lg" className={cls} disabled>Paid, waiting for settlement</Button>;
  }
  if (circle.status === 3) return <Button size="lg" className={cls} disabled>{me?.joined ? "Nothing left to withdraw" : "Circle cancelled"}</Button>;
  return <Button size="lg" className={cls} disabled>{me?.joined ? "All withdrawn" : "Circle completed"}</Button>;
}
