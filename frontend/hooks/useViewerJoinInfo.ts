"use client";

import { useEffect, useState } from "react";
import { readRequiredCollateral, readRiskTier } from "@/lib/contract";
import { HAS_CONTRACT } from "@/lib/chain";
import type { Tier } from "@/lib/types";

/** For a non-member viewer of an Open circle: exact requiredCollateral + tier straight from the contract. */
export function useViewerJoinInfo(id: number, viewer: string | null, enabled: boolean) {
  const [required, setRequired] = useState<bigint | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (!enabled || !viewer || !HAS_CONTRACT) {
      setRequired(null);
      setTier(null);
      return;
    }
    let alive = true;
    const load = () =>
      Promise.all([readRequiredCollateral(viewer, id), readRiskTier(viewer)])
        .then(([r, t]) => {
          if (!alive) return;
          setRequired(r);
          setTier(t);
        })
        .catch(() => {});
    void load();
    const iv = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [id, viewer, enabled]);

  return { required, tier };
}
