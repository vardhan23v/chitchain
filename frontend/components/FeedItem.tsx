"use client";

import { Bot, CheckCircle2, Coins, Gavel, Lock, LogIn, LogOut, Play, ShieldHalf, Trophy, Wallet, XCircle, type LucideIcon, Ban, Flag, Sparkles, UserCheck } from "lucide-react";
import { TxLink } from "@/components/TxLink";
import { formatMstc, shortAddr, timeAgo } from "@/lib/format";
import { TIER_NAME } from "@/lib/labels";
import type { FeedEvent, Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LabelMap = Record<string, string>; // lowercased address → label (A–E)

interface Rendered { Icon: LucideIcon; color: string; text: string; reason?: string }

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** DESIGN §9 feed format: [icon] [actor] [action] [amount] · [time ago] · ↗ */
export function renderFeedEvent(e: FeedEvent, labels: LabelMap): Rendered {
  const a = e.args ?? {};
  const who = (addr: unknown) => {
    const s = str(addr);
    return labels[s.toLowerCase()] ?? shortAddr(s);
  };
  const member = who(a.member ?? a.winner ?? a.creator);
  switch (e.name) {
    case "Contributed":
      return { Icon: CheckCircle2, color: "text-success", text: `${member} paid ${formatMstc(str(a.amount))} MSTC` };
    case "BidPlaced":
      if (e.agent) {
        return { Icon: Bot, color: "text-agent", text: `Agent for ${who(e.agent.member || a.member)} bid ${formatMstc(str(a.discount))} MSTC`, reason: e.agent.reason };
      }
      return { Icon: Gavel, color: "text-primary", text: `${member} bid ${formatMstc(str(a.discount))} MSTC` };
    case "Covered":
      return { Icon: ShieldHalf, color: "text-warning", text: `${member} missed — collateral covered ${formatMstc(str(a.fromCollateral ?? a.amount))} MSTC` };
    case "Removed":
      return { Icon: XCircle, color: "text-danger", text: `${member} removed — collateral exhausted` };
    case "HoldbackApplied":
      return { Icon: Lock, color: "text-primary", text: `${formatMstc(str(a.amount))} MSTC held back to secure ${member}'s future dues` };
    case "RoundSettled":
      return { Icon: Trophy, color: "text-primary", text: `${who(a.winner)} won Round ${str(a.round ?? e.round)} · ${formatMstc(str(a.payout))} MSTC payout` };
    case "DividendCredited":
      return { Icon: Coins, color: "text-success", text: `${member} earned ${formatMstc(str(a.amount))} MSTC dividend` };
    case "Joined":
      return { Icon: LogIn, color: "text-primary", text: `${member} joined · ${TIER_NAME[Number(a.tier) as Tier] ?? "Unassessed"} · locked ${formatMstc(str(a.collateral))} MSTC` };
    case "Left":
      return { Icon: LogOut, color: "text-muted-foreground", text: `${member} left · ${formatMstc(str(a.refund))} MSTC refunded` };
    case "CircleCreated":
      return { Icon: Sparkles, color: "text-pot", text: `Circle #${str(a.circleId ?? e.circleId)} created by ${member}` };
    case "CircleStarted":
      return { Icon: Play, color: "text-primary", text: `Circle #${str(a.circleId ?? e.circleId)} started — Round 1 is live` };
    case "CircleCancelled":
      return { Icon: Ban, color: "text-danger", text: `Circle #${str(a.circleId ?? e.circleId)} cancelled — didn't fill in time` };
    case "CircleCompleted":
      return { Icon: Flag, color: "text-success", text: `Circle #${str(a.circleId ?? e.circleId)} completed` };
    case "Withdrawn":
      return { Icon: Wallet, color: "text-success", text: `${member} withdrew ${formatMstc(str(a.amount))} MSTC` };
    case "RiskTierSet":
      return { Icon: UserCheck, color: "text-agent", text: `${member} assessed · ${TIER_NAME[Number(a.tier) as Tier] ?? "Unassessed"} risk` };
    default:
      return { Icon: CheckCircle2, color: "text-muted-foreground", text: e.name };
  }
}

export function FeedItem({ e, labels, now }: { e: FeedEvent; labels: LabelMap; now: number }) {
  const r = renderFeedEvent(e, labels);
  const isAgent = !!e.agent;
  return (
    <li className={cn("flex items-start gap-2 rounded-xl px-2 py-1.5 text-[13px]", isAgent && "bg-agent/5")}>
      <r.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", r.color)} aria-hidden />
      <div className="min-w-0 flex-1">
        <span className={cn(isAgent && "font-medium text-agent")}>{r.text}</span>
        {r.reason && <span className="text-muted-foreground"> — <em>{r.reason}</em></span>}
        <span className="text-muted-foreground"> · {timeAgo(e.ts, now)} · </span>
        <TxLink hash={e.txHash} label="↗" className="text-[13px]" />
      </div>
    </li>
  );
}
