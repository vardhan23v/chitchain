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
  /** Which window we are in right now: the on-chain phase plus its deadline (client clock). */
  roundPhase: RoundPhase;
  /** Countdown to the end of the current window (contribution, recipient decision or auction). */
  current: CountdownState;
  /** Same as `current` (kept for callers that show the settle-able time). */
  bidding: CountdownState;
  contributionDeadline: number;
  /** Deadline of the current window. */
  biddingDeadline: number;
}

/**
 * v2.2 round clock: the window follows the on-chain phase (contributions → recipient decision → auction only after a
 * decline). The stage flips client-side the moment the current deadline passes, without waiting for the next poll.
 */
export function useRoundClock(
  round: Pick<RoundInfo, "contributionDeadline" | "deadline" | "decisionDeadline" | "phase" | "phaseCode"> | null | undefined,
  active: boolean
): RoundClock {
  const code = round?.phaseCode ?? 0;
  const contributionDeadline = round?.contributionDeadline ?? 0;
  const windowDeadline = !round ? 0 : code === 0 ? round.contributionDeadline : code === 1 ? round.decisionDeadline ?? 0 : round.deadline;
  const now = useNow(active && windowDeadline > 0);
  if (!active || !round || !windowDeadline) {
    const idle: CountdownState = { remaining: 0, phase: "running", overdueMs: 0 };
    return { roundPhase: round?.phase ?? "settling", current: idle, bidding: idle, contributionDeadline, biddingDeadline: windowDeadline };
  }
  const current = derive(windowDeadline, now);
  const open = now / 1000 <= windowDeadline;
  const roundPhase: RoundPhase = code === 0 ? (open ? "contribution" : "closing") : code === 1 ? (open ? "decision" : "settling") : open ? "bidding" : "settling";
  return { roundPhase, current, bidding: current, contributionDeadline, biddingDeadline: windowDeadline };
}
