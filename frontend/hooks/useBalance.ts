"use client";

import { useEffect, useState } from "react";
import { getReadProvider } from "@/lib/contract";
import { hasEnough, type BalanceCheck } from "@/lib/wallet";

/** Native MST balance of an address, refreshed every 10 s (null while unknown). */
export function useBalance(addr: string | null): bigint | null {
  const [bal, setBal] = useState<bigint | null>(null);
  useEffect(() => {
    if (!addr) {
      setBal(null);
      return;
    }
    let alive = true;
    const load = () =>
      getReadProvider()
        .getBalance(addr)
        .then((b) => alive && setBal(b))
        .catch(() => {});
    void load();
    const iv = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [addr]);
  return bal;
}

/**
 * Pre-send balance check for a value the connected wallet is about to send (audit 1.8).
 * Re-runs every 10 s and whenever the value or account changes. `null` while unknown or when disabled.
 */
export function useBalanceCheck(value: bigint | null, account: string | null, enabled = true): BalanceCheck | null {
  const [check, setCheck] = useState<BalanceCheck | null>(null);
  const key = value === null ? null : value.toString();
  useEffect(() => {
    if (!enabled || key === null || !account) {
      setCheck(null);
      return;
    }
    let alive = true;
    const load = () =>
      hasEnough(BigInt(key), account)
        .then((c) => alive && setCheck(c))
        .catch(() => alive && setCheck(null));
    void load();
    const iv = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [key, account, enabled]);
  return check;
}
