"use client";

import { useEffect, useState } from "react";
import { KEEPER_LATE_MS } from "@/lib/chain";
import type { RoundInfo, RoundPhase } from "@/lib/types";

export type CountdownPhase = "running" | "warning" | "settling" | "late";

export interface CountdownState {
  remaining: number; // seconds, ≥ 0
  phase: CountdownPhase;
  /** ms elapsed since the deadline passed (0 while running). */
  overdueMs: number;
}

/** Shared 1 Hz clock. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function derive(deadline: number, now: number): CountdownState {
  const diffMs = deadline * 1000 - now;
  const remaining = Math.max(0, Math.ceil(diffMs / 1000));
  const overdueMs = diffMs < 0 ? -diffMs : 0;
  let phase: CountdownPhase = "running";
  if (remaining === 0) phase = overdueMs > KEEPER_LATE_MS ? "late" : "settling";
  else if (remaining < 10) phase = "warning";
  return { remaining, phase, overdueMs };
}

/** Ticks once per second against a unix-seconds deadline. */
export function useCountdown(deadline: number | null | undefined, active: boolean): CountdownState {
  const now = useNow(active && !!deadline);
  if (!active || !deadline) return { remaining: 0, phase: "running", overdueMs: 0 };
  return derive(deadline, now);
}

export interface RoundClock {
  /** Which window we are in right now, derived from the two deadlines (client clock). */
  roundPhase: RoundPhase;
  /** Countdown to the end of the current window (contribution → bidding → settle). */
  current: CountdownState;
  /** Countdown to the bidding deadline (settle-able time). */
  bidding: CountdownState;
  contributionDeadline: number;
  biddingDeadline: number;
}

/**
 * Two-deadline countdown for a v2 round: contributions close at `contributionDeadline`,
 * bidding closes at `deadline` (= settle-able). The phase flips client-side the moment a deadline passes,
 * without waiting for the next poll; the backend's `round.phase` is used as the initial hint.
 */
export function useRoundClock(round: Pick<RoundInfo, "contributionDeadline" | "deadline" | "phase"> | null | undefined, active: boolean): RoundClock {
  const contributionDeadline = round?.contributionDeadline ?? 0;
  const biddingDeadline = round?.deadline ?? 0;
  const now = useNow(active && biddingDeadline > 0);
  if (!active || !round || !biddingDeadline) {
    const idle: CountdownState = { remaining: 0, phase: "running", overdueMs: 0 };
    return { roundPhase: round?.phase ?? "settling", current: idle, bidding: idle, contributionDeadline, biddingDeadline };
  }
  const bidding = derive(biddingDeadline, now);
  const contribution = contributionDeadline > 0 ? derive(contributionDeadline, now) : bidding;
  const nowSec = now / 1000;
  const roundPhase: RoundPhase = nowSec < contributionDeadline ? "contribution" : nowSec < biddingDeadline ? "bidding" : "settling";
  const current = roundPhase === "contribution" ? contribution : bidding;
  return { roundPhase, current, bidding, contributionDeadline, biddingDeadline };
}
