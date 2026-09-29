"use client";

import { AuctionCard } from "@/components/AuctionCard";
import type { CircleSummary, MemberInfo, RoundInfo, RoundPhase } from "@/lib/types";

interface Props {
  circle: Pick<CircleSummary, "id" | "name" | "status" | "maxMembers">;
  round: RoundInfo;
  /** Client-side phase from useRoundClock (flips the instant a deadline passes). */
  phase: RoundPhase;
  active: boolean;
  me: MemberInfo | null;
  activeMembers: number;
  labelFor: (addr: string) => string;
  account: string | null;
  /** Receives the on-chain DISCOUNT (= pot − accepted payout). */
  onBid: (discountWei: bigint) => Promise<unknown>;
  pending: boolean;
  /** Increment to pulse a ring around the card (the page does this when "Place a bid" scrolls here). */
  highlight?: number;
}

/** Room auction panel: the same tiles, timeline and BidDialog as the dashboard AuctionCard. */
export function AuctionPanel({ circle, round, phase, me, activeMembers, labelFor, account, onBid, pending, highlight }: Props) {
  return <AuctionCard circle={circle} round={round} phase={phase} me={me} activeMembers={activeMembers} labelFor={labelFor} account={account} onBid={onBid} pending={pending} highlight={highlight} className="h-full" wide />;
}
