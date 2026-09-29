"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Coins, Gavel, HandCoins, Hourglass, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WithdrawDialog } from "@/components/WithdrawDialog";
import type { WalletState } from "@/hooks/useWallet";
import { big, formatMst, sameAddr } from "@/lib/format";
import type { CircleSummary, MemberInfo, RoundInfo, RoundPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  circle: CircleSummary;
  round: RoundInfo;
  me: MemberInfo | null;
  phase: RoundPhase;
  wallet: WalletState;
  pending: boolean;
  onContribute: () => void;
  onWithdraw: () => void;
  /** Scroll to the decision / auction card next to this one. */
  onFocus: () => void;
}

interface View { Icon: typeof Coins; tone: string; title: string; text: string; action?: React.ReactNode }

/** The one thing this member should do next in their active chit, and nothing irrelevant. */
export function NextActionCard({ circle, round, me, phase, wallet, pending, onContribute, onWithdraw, onFocus }: Props) {
  if (!me?.joined) return null;
  const canSign = !!wallet.account && wallet.correctChain;
  const spin = pending ? <Loader2 className="animate-spin" aria-hidden /> : null;
  const pot = big(round.potForOffers);
  const isRecipient = !!round.recipient && sameAddr(round.recipient, me.address);
  const leads = !!round.bestBidder && sameAddr(round.bestBidder, me.address);
  const recipient = round.recipientName ?? (round.recipientLabel ? `Demo ${round.recipientLabel}` : "the recipient");
  const room = <Button asChild variant="secondary"><Link href={`/circle/${circle.id}`}>Open the room <ArrowRight aria-hidden /></Link></Button>;

  let v: View;
  if (me.removed) v = { Icon: Hourglass, tone: "text-danger", title: "You were removed from this circle", text: "Your collateral ran out covering missed payments.", action: room };
  else if (big(me.claimable) > 0n) v = { Icon: Wallet, tone: "text-success", title: `You have ${formatMst(me.claimable, 4)} MST to withdraw`, text: "Payouts and your share of discounts are pulled from the contract to your wallet.", action: <WithdrawDialog claimable={me.claimable} disabled={pending || !canSign} onConfirm={onWithdraw} /> };
  else if (phase === "contribution" && !me.paidThisRound) {
    v = { Icon: Coins, tone: "text-warning", title: "Your contribution is due", text: `Round ${round.round}: every member pays ${formatMst(circle.contribution)} MST into the contract.`, action: <Button size="lg" onClick={onContribute} disabled={pending || !canSign}>{spin}Pay {formatMst(circle.contribution)} MST</Button> };
  } else if (phase === "contribution") v = { Icon: CheckCircle2, tone: "text-success", title: "Paid for this round", text: "Waiting for the other members. The pot is ready once everyone has paid.", action: room };
  else if (phase === "closing") v = { Icon: Hourglass, tone: "text-warning", title: "Contributions closed", text: "The contract is covering missed payments from collateral, then the pot is ready.", action: room };
  else if (phase === "decision" && isRecipient) {
    v = { Icon: HandCoins, tone: "text-pot", title: "Your turn to receive the pot", text: `Pot: ${formatMst(pot, 4)} MST. Accept the full pot, or decline and open an auction.`, action: <Button size="lg" onClick={onFocus}>Choose now</Button> };
  } else if (phase === "decision") v = { Icon: Hourglass, tone: "text-muted-foreground", title: `Waiting for ${recipient} to decide`, text: "If they decline, an auction opens and you can make a payout offer.", action: room };
  else if (phase === "bidding" && leads) v = { Icon: Gavel, tone: "text-success", title: "Your offer leads", text: "Waiting for the auction to close.", action: room };
  else if (phase === "bidding" && !me.hasWon) {
    const lowest = round.lowestAcceptedPayout;
    v = { Icon: Gavel, tone: "text-primary", title: "Auction open", text: lowest ? `Current lowest payout: ${formatMst(lowest, 4)} MST. The lowest offer wins.` : "No offers yet. The lowest payout offer wins.", action: <Button size="lg" onClick={onFocus}>Place a bid</Button> };
  } else if (phase === "bidding") v = { Icon: Gavel, tone: "text-muted-foreground", title: "Auction open", text: "You already received a pot, so you share the discount instead.", action: room };
  else v = { Icon: Hourglass, tone: "text-muted-foreground", title: "Waiting for round settlement", text: "The keeper settles the round on-chain in a few seconds.", action: room };

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center md:p-5">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05]", v.tone)} aria-hidden><v.Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-muted-foreground">{circle.name ?? `Circle #${circle.id}`} · Round {round.round} of {circle.maxMembers}</div>
        <h2 className="text-[18px] font-semibold leading-snug tracking-tight">{v.title}</h2>
        <p className="tnum text-[14px] text-muted-foreground">{v.text}</p>
      </div>
      {v.action && <div className="shrink-0">{v.action}</div>}
    </Card>
  );
}
