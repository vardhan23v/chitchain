"use client";

import { useEffect, useState } from "react";
import { KEEPER_LATE_MS } from "@/lib/chain";

export type CountdownPhase = "running" | "warning" | "settling" | "late";

export interface CountdownState {
  remaining: number; // seconds, ≥ 0
  phase: CountdownPhase;
  /** ms elapsed since the deadline passed (0 while running). */
  overdueMs: number;
}

/** Ticks once per second against a unix-seconds deadline. */
export function useCountdown(deadline: number | null | undefined, active: boolean): CountdownState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !deadline) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline, active]);

  if (!active || !deadline) return { remaining: 0, phase: "running", overdueMs: 0 };
  const diffMs = deadline * 1000 - now;
  const remaining = Math.max(0, Math.ceil(diffMs / 1000));
  const overdueMs = diffMs < 0 ? -diffMs : 0;
  let phase: CountdownPhase = "running";
  if (remaining === 0) phase = overdueMs > KEEPER_LATE_MS ? "late" : "settling";
  else if (remaining < 10) phase = "warning";
  return { remaining, phase, overdueMs };
}
