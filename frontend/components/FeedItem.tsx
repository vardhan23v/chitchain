"use client";

import { motion } from "framer-motion";
import { Bot, CheckCircle2, Coins, Gavel, Lock, LogIn, LogOut, Play, ShieldHalf, ShieldAlert, Trophy, Wallet, XCircle, type LucideIcon, Ban, Flag, Sparkles, UserCheck, HandCoins } from "lucide-react";
import { EASE } from "@/components/motion/Reveal";
import { TxLink } from "@/components/TxLink";
import { ZERO_ADDRESS } from "@/lib/contract";
import { big, formatMst, shortAddr, timeAgo } from "@/lib/format";
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
  const member = who(a.member ?? a.winner ?? a.recipient ?? a.creator);
  switch (e.name) {
    case "Contributed":
      return { Icon: CheckCircle2, color: "text-success", text: `${member} paid ${formatMst(str(a.amount))} MST` };
    case "PotReady":
      return { Icon: HandCoins, color: "text-pot", text: `Round ${str(a.round ?? e.round)} pot ready: ${formatMst(str(a.pot), 3)} MST. ${member} has the first choice` };
    case "FullPotAccepted":
      return { Icon: HandCoins, color: "text-success", text: `${member} accepted the full ${formatMst(str(a.pot), 3)} MST pot, no auction` };
    case "FullPotDeclined":
      return { Icon: Gavel, color: "text-primary", text: `${member} declined the full pot, auction open` };
    case "BidPlaced":
      if (e.agent) {
        return { Icon: Bot, color: "text-agent", text: `Agent for ${who(e.agent.member || a.member)} offered to take ${formatMst(str(a.discount), 3)} MST less than the pot`, reason: e.agent.reason };
      }
      return { Icon: Gavel, color: "text-primary", text: `${member} offered to take ${formatMst(str(a.discount), 3)} MST less than the pot` };
    case "DefaultDetected": {
      const shortfall = big(str(a.shortfall));
      if (shortfall > 0n) {
        return { Icon: ShieldAlert, color: "text-danger", text: `${member} missed, partially covered, shortfall ${formatMst(shortfall)} MST` };
      }
      return { Icon: ShieldHalf, color: "text-warning", text: `Default protection: ${member} missed, collateral covered ${formatMst(str(a.fromCollateral))} MST` };
    }
    case "Covered": // v1 event, kept for old indexed rows
      return { Icon: ShieldHalf, color: "text-warning", text: `${member} missed, collateral covered ${formatMst(str(a.fromCollateral ?? a.amount))} MST` };
    case "Removed":
      return { Icon: XCircle, color: "text-danger", text: `${member} removed, collateral exhausted` };
    case "HoldbackApplied":
      return { Icon: Lock, color: "text-primary", text: `${formatMst(str(a.amount))} MST held back to secure ${member}'s future dues` };
    case "RoundSettled":
      if (!a.winner || str(a.winner).toLowerCase() === ZERO_ADDRESS) {
        return { Icon: Trophy, color: "text-muted-foreground", text: `Round ${str(a.round ?? e.round)} had no one left to receive the pot, shared as dividends` };
      }
      return { Icon: Trophy, color: "text-primary", text: `${who(a.winner)} won Round ${str(a.round ?? e.round)} · ${formatMst(str(a.payout))} MST payout` };
    case "DividendCredited":
      return { Icon: Coins, color: "text-success", text: `${member} got ${formatMst(str(a.amount), 4)} MST, their share of the discount` };
    case "Joined":
      return { Icon: LogIn, color: "text-primary", text: `${member} joined · ${TIER_NAME[Number(a.tier) as Tier] ?? "Unassessed"} · locked ${formatMst(str(a.collateral))} MST` };
    case "Left":
      return { Icon: LogOut, color: "text-muted-foreground", text: `${member} left · ${formatMst(str(a.refund))} MST refunded` };
    case "CircleCreated":
      return { Icon: Sparkles, color: "text-pot", text: `Circle #${str(a.circleId ?? e.circleId)} created by ${member}` };
    case "CircleStarted":
      return { Icon: Play, color: "text-primary", text: `Circle #${str(a.circleId ?? e.circleId)} started, Round 1 is live` };
    case "CircleCancelled":
      return { Icon: Ban, color: "text-danger", text: `Circle #${str(a.circleId ?? e.circleId)} cancelled, didn't fill in time` };
    case "CircleCompleted":
      return { Icon: Flag, color: "text-success", text: `Circle #${str(a.circleId ?? e.circleId)} completed` };
    case "Withdrawn":
      return { Icon: Wallet, color: "text-success", text: `${member} withdrew ${formatMst(str(a.amount))} MST` };
    case "RiskTierSet":
      return { Icon: UserCheck, color: "text-agent", text: `${member} assessed · ${TIER_NAME[Number(a.tier) as Tier] ?? "Unassessed"} risk` };
    default:
      return { Icon: CheckCircle2, color: "text-muted-foreground", text: e.name };
  }
}

/** Amount (wei string) an event moved, if any, used by the activity page. */
export function eventAmount(e: FeedEvent): string | null {
  const a = e.args ?? {};
  const k = ["amount", "payout", "collateral", "refund", "discount", "fromCollateral"].find((key) => a[key] !== undefined);
  return k ? String(a[k]) : null;
}

/** `fresh` events (arrived after the first batch) slide in from the top; the rest render at rest. */
export function FeedItem({ e, labels, now, fresh = false }: { e: FeedEvent; labels: LabelMap; now: number; fresh?: boolean }) {
  const r = renderFeedEvent(e, labels);
  const isAgent = !!e.agent;
  return (
    <motion.li
      layout="position"
      initial={fresh ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn("flex items-start gap-2.5 rounded-xl px-2 py-2 text-[13px] leading-snug", isAgent && "bg-agent/[0.06]")}
    >
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", r.color)} style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }} aria-hidden>
        <r.Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn(isAgent && "font-medium text-agent")}>
          {r.text}
          {r.reason && <span className="font-normal text-muted-foreground">, <em>{r.reason}</em></span>}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="tnum">{timeAgo(e.ts, now)}</span>
          <span aria-hidden>·</span>
          <TxLink hash={e.txHash} label="MSTScan" className="text-[12px]" />
        </div>
      </div>
    </motion.li>
  );
}
