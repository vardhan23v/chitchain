"use client";

import { useMemo, useRef } from "react";
import { api, isUnreachable } from "@/lib/api";
import { readCircleRoom } from "@/lib/contract";
import { HAS_CONTRACT, POLL_API_MS, POLL_CHAIN_MS } from "@/lib/chain";
import { usePolling } from "@/hooks/usePolling";
import { sameAddr } from "@/lib/format";
import type { CircleRoom, DataSource, MemberInfo } from "@/lib/types";

export interface RoomData extends CircleRoom {
  source: DataSource;
  /** requiredCollateral for the connected wallet (non-member) — only known from chain fallback or when the viewer is a member. */
  viewerRequired: string | null;
}

export function useCircle(id: number, viewer: string | null) {
  const source = useRef<DataSource>("api");
  const state = usePolling<RoomData>(
    async () => {
      try {
        const room = await api.circle(id);
        source.current = "api";
        const me = room.members.find((m) => sameAddr(m.address, viewer));
        return { ...room, source: "api", viewerRequired: me?.requiredCollateral ?? null };
      } catch (e) {
        if (!isUnreachable(e) || !HAS_CONTRACT) throw e;
        const r = await readCircleRoom(id, viewer);
        if (!r) throw e;
        source.current = "chain";
        return { ...r, txCount: 0, mandates: [], latestDefault: null, source: "chain", viewerRequired: r.viewerRequired };
      }
    },
    source.current === "api" ? POLL_API_MS : POLL_CHAIN_MS,
    [id, viewer]
  );

  const me = useMemo<MemberInfo | null>(
    () => state.data?.members.find((m) => sameAddr(m.address, viewer)) ?? null,
    [state.data, viewer]
  );
  return { ...state, me };
}
