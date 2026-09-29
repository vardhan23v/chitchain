"use client";

import { useState } from "react";
import { Gavel, HandCoins, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MemberName } from "@/components/MemberName";
import { MstcAmount } from "@/components/MstcAmount";
import { RollingClock } from "@/components/motion/RollingClock";
import { useCountdown } from "@/hooks/useCountdown";
import { api } from "@/lib/api";
import { parseTxError } from "@/lib/errors";
import { big, formatMst, sameAddr } from "@/lib/format";
import { previewPayout } from "@/lib/payout";
import type { CircleSummary, MemberInfo, RoundInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  circle: Pick<CircleSummary, "id" | "contribution" | "feeBps" | "holdbackBps" | "biddingDuration">;
  round: RoundInfo;
  members: MemberInfo[];
  account: string | null;
  pending: boolean;
  /** Connected wallet is on MST testnet (the decision is a transaction from the recipient's own wallet). */
  canSign: boolean;
  onAccept: () => void;
  onDecline: () => void;
  /** Admins can decide for a custodial demo recipient (sent from that wallet's own key by the backend). */
  isAdmin?: boolean;
  onChanged?: () => void;
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tnum text-right", strong ? "text-[15px] font-semibold text-foreground" : "font-medium")}>{children}</dd>
    </div>
  );
}

/**
 * v2.2 first choice: when the pot is ready, the round's recipient accepts the full pot (round settles, no auction) or
 * declines (the auction opens on-chain). Everyone else sees who is deciding and what happens either way.
 */
export function RecipientDecision({ circle, round, members, account, pending, canSign, onAccept, onDecline, isAdmin, onChanged }: Props) {
  const clock = useCountdown(round.decisionDeadline || null, round.phase === "decision");
  const [adminBusy, setAdminBusy] = useState<"accept" | "decline" | null>(null);
  const recipient = members.find((m) => sameAddr(m.address, round.recipient ?? ""));
  const recipientRef = recipient ?? { address: round.recipient ?? "", username: round.recipientName, label: round.recipientLabel };
  const isMe = !!account && !!round.recipient && sameAddr(account, round.recipient);
  const pot = big(round.potForOffers);
  const preview = round.recipient ? previewPayout(circle, members, round.recipient, pot) : null;
  const open = round.phase === "decision";
  const custodial = !!recipient?.custodial;
  const who = recipient?.username ?? (recipient?.label ? `Demo ${recipient.label}` : null);

  const adminDecide = async (decision: "accept" | "decline") => {
    setAdminBusy(decision);
    try {
      const r = await api.demoDecide(circle.id, decision);
      toast.success(decision === "accept" ? "Full pot accepted from the demo wallet." : "Full pot declined. The auction is open.", { description: r.txHash });
      onChanged?.();
    } catch (e) {
      toast.error(parseTxError(e).message);
    } finally {
      setAdminBusy(null);
    }
  };

  return (
    <Card className="relative overflow-hidden p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("status-dot h-2 w-2 rounded-full", open ? "bg-success" : "bg-muted-foreground/50")} aria-hidden />
        <h2 className="text-[16px] font-semibold leading-tight tracking-tight">{isMe ? "Your turn to receive the pot" : "Recipient decision"}</h2>
        <span className="tnum text-[12px] text-muted-foreground">Round {round.round}</span>
        <span className={cn("tnum ml-auto rounded-full border px-2.5 py-1 text-[12px] font-semibold", clock.remaining <= 10 && open ? "border-warning/40 text-warning" : "border-white/10 text-muted-foreground")}>
          {open ? <RollingClock seconds={clock.remaining} /> : "Time is up"}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="text-[12px] font-medium text-muted-foreground">Current pot</div>
        <MstcAmount wei={pot} size="lg" className="text-pot" />
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          {isMe ? "You are eligible to receive this round's pot." : <><MemberName m={recipientRef} /> <span>has the first choice on the full pot.</span></>}
        </div>
      </div>

      {preview && (
        <dl className="mt-3 space-y-1.5 rounded-xl border border-white/[0.06] px-4 py-3">
          <Row label="Full pot">{formatMst(preview.pot, 4)} MST</Row>
          <Row label={`Platform fee (${(circle.feeBps / 100).toFixed(circle.feeBps % 100 ? 2 : 0)} %)`}>−{formatMst(preview.fee, 4)} MST</Row>
          {preview.holdback > 0n && <Row label="Held with collateral until the circle completes">{formatMst(preview.holdback, 4)} MST</Row>}
          <Row label={isMe ? "You can withdraw after accepting" : "Claimable by the recipient"} strong>{formatMst(preview.now, 4)} MST</Row>
        </dl>
      )}

      {isMe && open ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="w-full" disabled={pending || !canSign}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <HandCoins aria-hidden />}Accept {formatMst(pot)} MST
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Accept the full pot</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>The contract settles this round now with you as the winner. No auction is created and you cannot bid in later rounds.</p>
                    {preview && <p className="tnum">You can withdraw {formatMst(preview.now, 4)} MST after it confirms{preview.holdback > 0n ? `, and ${formatMst(preview.holdback, 4)} MST stays locked with your collateral until the circle completes` : ""}.</p>}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onAccept}>Accept {formatMst(pot)} MST</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant="secondary" className="w-full" disabled={pending || !canSign}>
                <Gavel aria-hidden />Decline and open auction
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Decline and open auction</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>The auction opens for {circle.biddingDuration} seconds. Members who have not received a pot yet offer to take less than the full pot, and the lowest payout offer wins.</p>
                    <p>The difference is shared equally by everyone else, including you. You can still make an offer yourself. If nobody offers, the full pot comes back to you.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep my choice open</AlertDialogCancel>
                <AlertDialogAction onClick={onDecline}>Decline and open auction</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!canSign && <p className="text-[12px] text-muted-foreground sm:col-span-2">Connect the recipient wallet on MST testnet to decide.</p>}
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 text-[13px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          {open
            ? `Waiting for ${who ?? "the recipient"} to decide. If they decline, an auction opens and eligible members can make a payout offer. With no decision in time, they receive the full pot.`
            : "The decision window has closed. The keeper is settling the round with the full pot to the recipient."}
        </p>
      )}

      {isAdmin && custodial && open && !isMe && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/[0.12] p-3">
          <span className="text-[12px] text-muted-foreground">Admin, demo wallet {recipient?.label}:</span>
          <Button size="sm" variant="secondary" onClick={() => void adminDecide("accept")} disabled={!!adminBusy}>
            {adminBusy === "accept" && <Loader2 className="animate-spin" aria-hidden />}Accept for Demo {recipient?.label}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void adminDecide("decline")} disabled={!!adminBusy}>
            {adminBusy === "decline" && <Loader2 className="animate-spin" aria-hidden />}Decline for Demo {recipient?.label}
          </Button>
        </div>
      )}
    </Card>
  );
}
