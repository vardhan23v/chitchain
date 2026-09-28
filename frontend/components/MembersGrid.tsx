"use client";

import { Users } from "lucide-react";
import { MemberCard, type MemberExtra } from "@/components/MemberCard";
import { sameAddr } from "@/lib/format";
import type { CircleSummary, FeedEvent, MemberInfo } from "@/lib/types";

interface Props {
  circle: CircleSummary;
  members: MemberInfo[];
  viewer: string | null;
  events: FeedEvent[];
}

/** Derives per-member "Won R#" / "Covered" info from the feed. */
export function memberExtras(events: FeedEvent[]): Record<string, MemberExtra> {
  const out: Record<string, MemberExtra> = {};
  for (const e of events) {
    if (e.name === "RoundSettled" && e.args.winner) {
      const k = String(e.args.winner).toLowerCase();
      out[k] = { ...out[k], wonRound: Number(e.args.round ?? e.round) };
    }
    if (e.name === "Covered" && e.args.member) {
      const k = String(e.args.member).toLowerCase();
      const r = Number(e.args.round ?? e.round);
      out[k] = { ...out[k], coveredRound: Math.max(out[k]?.coveredRound ?? 0, r) };
    }
  }
  return out;
}

export function MembersGrid({ circle, members, viewer, events }: Props) {
  const extras = memberExtras(events);
  const seats = Math.max(0, circle.maxMembers - members.length);
  return (
    <section aria-label="Members">
      <div className="mb-2 flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden /> Members <span className="tnum">{members.length}/{circle.maxMembers}</span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5 xl:grid-cols-5">
        {members.map((m) => (
          <MemberCard
            key={m.address}
            m={m}
            baseCollateral={circle.baseCollateral}
            isYou={sameAddr(m.address, viewer)}
            circleActive={circle.status === 1}
            extra={extras[m.address.toLowerCase()]}
            currentRound={circle.round}
          />
        ))}
        {circle.status === 0 &&
          Array.from({ length: seats }, (_, i) => (
            <div key={`seat-${i}`} className="flex min-w-[168px] items-center justify-center rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">
              Open seat
            </div>
          ))}
      </div>
    </section>
  );
}
