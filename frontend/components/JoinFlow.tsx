"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, MailCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BalanceShortfall } from "@/components/BalanceShortfall";
import { EASE } from "@/components/motion/Reveal";
import { MstcAmount } from "@/components/MstcAmount";
import { TierChip } from "@/components/TierChip";
import { useBalanceCheck } from "@/hooks/useBalance";
import { api } from "@/lib/api";
import { CHAIN_NAME } from "@/lib/chain";
import { formatMst, shortAddr } from "@/lib/format";
import type { CircleSummary, Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  circle: Pick<CircleSummary, "id" | "name" | "contribution" | "maxMembers" | "memberCount" | "lowBps" | "mediumBps" | "highBps">;
  /** Collateral the contract will lock for this wallet (from getRequiredCollateral). */
  required: bigint | null;
  tier: Tier | null;
  account: string | null;
  disabled?: boolean;
  /** The existing join action. */
  onConfirm: () => void;
  className?: string;
}

const STEPS = ["Choose", "Review", "Confirm"] as const;

/** Three-step join: 01 Choose (circle summary) → 02 Review (amounts, tier, balance) → 03 Confirm ("Lock collateral and join" → existing join action). */
export function JoinFlow({ circle, required, tier, account, disabled, onConfirm, className }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const check = useBalanceCheck(open && required !== null ? required : null, account);
  const short = !!check && !check.ok;
  const [invited, setInvited] = useState(false);
  const pot = BigInt(circle.contribution) * BigInt(circle.maxMembers);
  const name = circle.name ?? `Circle #${circle.id}`;

  // Invites are informational: the chip is a nudge, joining is open to any wallet. 404 (older backend) degrades silently.
  useEffect(() => {
    setInvited(false);
    if (!circle.id || !account) return;
    let alive = true;
    api.inviteCheck(circle.id, account).then((r) => alive && setInvited(!!r?.invited)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [circle.id, account]);

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  const confirm = () => {
    setOpen(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className={className} disabled={disabled || required === null}>{required !== null ? `Join and lock ${formatMst(required)} MST` : "Join the circle"}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Join {name}
            {invited && <Badge variant="status-won" className="whitespace-nowrap font-medium"><MailCheck className="h-3 w-3" aria-hidden /> You are invited</Badge>}
          </DialogTitle>
          <DialogDescription>Three steps. Nothing moves until you confirm in your wallet.</DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-2" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span className={cn("tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold", i < step ? "border-success/50 bg-success/15 text-success" : i === step ? "border-primary/60 bg-primary/15 text-primary" : "border-white/[0.1] text-muted-foreground")}>{i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : `0${i + 1}`}</span>
              <span className={cn("text-[12px]", i === step ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < step ? "bg-success/50" : "bg-white/[0.1]")} aria-hidden />}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2, ease: EASE }} className="space-y-3 text-[14px]">
            {step === 0 && (
              <>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[15px] font-semibold">{name}</p>
                  <dl className="tnum mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    <div><dt className="text-muted-foreground">Contribution per round</dt><dd className="font-semibold">{formatMst(circle.contribution)} MST</dd></div>
                    <div><dt className="text-muted-foreground">Members</dt><dd className="font-semibold">{circle.memberCount} of {circle.maxMembers}</dd></div>
                    <div><dt className="text-muted-foreground">Rounds</dt><dd className="font-semibold">{circle.maxMembers}</dd></div>
                    <div><dt className="text-muted-foreground">Pot per round</dt><dd className="font-semibold text-pot">{formatMst(pot)} MST</dd></div>
                  </dl>
                </div>
                <p className="text-[13px] text-muted-foreground">You contribute every round, can bid for the pot when you need it, and earn dividends when others win. All MST sits in the smart contract, never in anyone&apos;s account.</p>
              </>
            )}
            {step === 1 && (
              <>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <div className="text-[12px] text-muted-foreground">Required collateral</div>
                  <MstcAmount wei={required ?? 0n} size="lg" className="text-primary" />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">Priced by your risk tier {tier !== null && <TierChip tier={tier} circle={circle} />}</div>
                </div>
                <dl className="tnum grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  <div><dt className="text-muted-foreground">Contribution per round</dt><dd className="font-semibold">{formatMst(circle.contribution)} MST</dd></div>
                  <div><dt className="text-muted-foreground">Potential pot</dt><dd className="font-semibold text-pot">{formatMst(pot)} MST</dd></div>
                  <div><dt className="text-muted-foreground">Wallet balance</dt><dd className="font-semibold">{check ? `${formatMst(check.balance, 4)} MST` : "Checking"}</dd></div>
                  <div><dt className="text-muted-foreground">Needed now</dt><dd className="font-semibold">{check ? `${formatMst(check.required, 4)} MST` : required !== null ? `${formatMst(required)} MST + gas` : "Unknown"}</dd></div>
                </dl>
                <p className="text-[13px] text-muted-foreground">Collateral covers any round you miss and is returned when the circle completes.</p>
                <BalanceShortfall check={check} />
              </>
            )}
            {step === 2 && (
              <>
                <dl className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px]">
                  <Row k="What" v={`Join ${name}`} />
                  <Row k="How much" v={`${formatMst(required ?? 0n)} MST collateral, locked now`} />
                  <Row k="Wallet" v={account ? shortAddr(account) : "Not connected"} mono />
                  <Row k="Network" v={CHAIN_NAME} />
                  <Row k="Action" v="join(circleId) with the collateral as value" mono />
                </dl>
                <p className="flex items-start gap-2 text-[13px] text-muted-foreground"><Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> BridgeKey will ask you to confirm. The contract holds the collateral, not the organizer.</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => (step === 0 ? setOpen(false) : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</Button>
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && (short || required === null)}>{step === 0 ? "Review" : "Continue"}</Button>
          ) : (
            <Button onClick={confirm} disabled={short || required === null}><Lock aria-hidden /> Lock collateral and join</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2">
      <dt className="shrink-0 text-muted-foreground">{k}</dt>
      <dd className={cn("min-w-0 truncate text-right font-medium", mono && "font-mono text-[12px]")}>{v}</dd>
    </div>
  );
}
