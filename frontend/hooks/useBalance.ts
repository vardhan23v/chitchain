"use client";

import { useEffect, useState } from "react";
import { getReadProvider } from "@/lib/contract";

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
