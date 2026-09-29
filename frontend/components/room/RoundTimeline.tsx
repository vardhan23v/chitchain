"use client";

import { Check, Circle, CornerDownRight, type LucideIcon, ArrowRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TxLink } from "@/components/TxLink";
import { useRoundHistory } from "@/hooks/useRoundHistory";
import { formatMst, shortAddr } from "@/lib/format";
import { nameOf, OUTCOME_LABEL } from "@/lib/labels";
import type { RoundHistoryRow, RoundInfo, RoundPhase } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepState = "done" | "now" | "todo" | "skipped";
interface Step { label: string; state: StepState; note?: string }

const ICON: Record<StepState, LucideIcon> = { done: Check, now: ArrowRight, todo: Circle, skipped: Minus };
const TONE: Record<StepState, string> = {
  done: "border-success/30 bg-success/10 text-success",
  now: "border-primary/50 bg-primary/10 text-foreground",
  todo: "border-white/[0.08] bg-white/[0.02] text-muted-foreground",
  skipped: "border-white/[0.06] bg-transparent text-muted-foreground/70 line-through decoration-white/20",
};

/** Steps for the live round from the on-chain phase. The auction and dividends only happen after a decline. */
export function stepsFor(phase: RoundPhase, phaseCode: 0 | 1 | 2): Step[] {
  const contributing = phaseCode === 0;
  const deciding = phaseCode === 1;
  const auction = phaseCode === 2;
  const settling = phase === "settling";
  return [
    { label: "Contributions", state: contributing ? "now" : "done", note: phase === "closing" ? "covering missed payments" : undefined },
    { label: "Pot ready", state: contributing ? "todo" : "done" },
    { label: "Recipient decision", state: deciding && !settling ? "now" : auction ? "done" : deciding ? "done" : "todo", note: auction ? "declined" : deciding && settling ? "no decision, full pot" : undefined },
    { label: "Auction", state: auction && !settling ? "now" : auction ? "done" : "todo", note: auction ? undefined : "only if declined" },
    { label: "Settlement and payout", state: settling ? "now" : "todo" },
    { label: "Dividends", state: auction && settling ? "now" : "todo", note: auction ? undefined : "only after an auction" },
    { label: "Next round", state: "todo" },
  ];
}

/** Steps for a settled round, from its recorded outcome. */
function settledSteps(r: RoundHistoryRow): Step[] {
  const auction = r.outcome === "AUCTION" || r.outcome === "NO_BIDS";
  const declined = auction;
  return [
    { label: "Contributions", state: "done" },
    { label: "Pot ready", state: "done" },
    { label: declined ? "Declined" : r.outcome === "NO_RECIPIENT" ? "No recipient" : "Full pot accepted", state: "done" },
    { label: "Auction", state: auction ? "done" : "skipped" },
    { label: "Settlement and payout", state: "done" },
    { label: "Dividends", state: r.outcome === "AUCTION" || r.outcome === "NO_RECIPIENT" ? "done" : "skipped" },
    { label: "Complete", state: "done" },
  ];
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Round steps">
      {steps.map((s, i) => {
        const Icon = ICON[s.state];
        return (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium", TONE[s.state])} aria-current={s.state === "now" ? "step" : undefined}>
              <Icon className={cn("h-3 w-3", s.state === "now" && "text-primary")} aria-hidden />
              {s.label}
              {s.note && <span className="font-normal opacity-70">· {s.note}</span>}
            </span>
            {i < steps.length - 1 && <span className="h-px w-2 bg-white/10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function outcomeLine(r: RoundHistoryRow): string {
  const winner = r.winner ? nameOf({ username: r.winnerName, label: r.winnerLabel, address: r.winner }) : null;
  const paid = BigInt(r.payout) + BigInt(r.holdback);
  if (r.outcome === "NO_RECIPIENT" || !winner) return `The pot was shared as dividends: ${formatMst(r.dividendsTotal, 4)} MST.`;
  if (r.outcome === "AUCTION") {
    const offer = BigInt(r.pot) - BigInt(r.discount);
    return `${winner} won with a payout offer of ${formatMst(offer, 4)} MST. The ${formatMst(r.discount, 4)} MST discount was shared, ${formatMst(r.dividendPerMember, 4)} MST to each other member.`;
  }
  if (r.outcome === "NO_BIDS") return `Declined, but nobody made an offer, so ${winner} received the full pot (${formatMst(paid, 4)} MST after the fee).`;
  if (r.outcome === "DECISION_TIMEOUT") return `${winner} did not decide in time and received the full pot (${formatMst(paid, 4)} MST after the fee).`;
  return `${winner} accepted the full pot: ${formatMst(paid, 4)} MST after the fee. No auction.`;
}

interface Props {
  circleId: number;
  round: RoundInfo;
  phase: RoundPhase;
  active: boolean;
  /** show the lifecycle of the last settled round too */
  showLast?: boolean;
}

/** Visual lifecycle of the current round, plus how the last round ended (from the contract's round record). */
export function RoundTimeline({ circleId, round, phase, active, showLast = true }: Props) {
  const history = useRoundHistory(circleId, showLast);
  const last = (history.data?.rounds ?? []).at(-1) ?? null;
  return (
    <Card className="space-y-3 p-4">
      {active && (
        <div className="space-y-2">
          <div className="text-[12px] font-medium text-muted-foreground">Round {round.round}</div>
          <Steps steps={stepsFor(phase, round.phaseCode)} />
        </div>
      )}
      {showLast && last && (
        <div className="space-y-2 border-t border-white/[0.06] pt-3 first:border-0 first:pt-0">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
            <span>Round {last.round}: {OUTCOME_LABEL[last.outcome ?? "NONE"]}</span>
            {last.txHash && <TxLink hash={last.txHash} label={shortAddr(last.txHash, 6, 4)} className="text-[12px]" />}
          </div>
          <div className="hidden md:block"><Steps steps={settledSteps(last)} /></div>
          <p className="text-[13px] text-muted-foreground">{outcomeLine(last)}</p>
        </div>
      )}
    </Card>
  );
}
