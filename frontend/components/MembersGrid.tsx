"use client";

import { Users } from "lucide-react";
import { MemberCard, type MemberExtra } from "@/components/MemberCard";
import { MembersTable } from "@/components/MembersTable";
import { sameAddr } from "@/lib/format";
import type { CircleSummary, FeedEvent, MemberInfo, RoundHistoryRow } from "@/lib/types";

interface Props {
  circle: CircleSummary;
  members: MemberInfo[];
  viewer: string | null;
  events: FeedEvent[];
  rounds?: RoundHistoryRow[];
}

/** Derives per-member "Won R#" from round history (preferred) or the feed. */
export function memberExtras(events: FeedEvent[], rounds: RoundHistoryRow[] = []): Record<string, MemberExtra> {
  const out: Record<string, MemberExtra> = {};
  for (const r of rounds) if (r.winner) out[r.winner.toLowerCase()] = { wonRound: r.round };
  for (const e of events) {
    if (e.name === "RoundSettled" && e.args.winner) {
      const k = String(e.args.winner).toLowerCase();
      if (!out[k]?.wonRound) out[k] = { ...out[k], wonRound: Number(e.args.round ?? e.round) };
    }
  }
  return out;
}

/** Desktop: member cards + full table below. Mobile (< md): the table only (readable at 375 px with horizontal scroll). */
export function MembersGrid({ circle, members, viewer, events, rounds }: Props) {
  const extras = memberExtras(events, rounds);
  const seats = Math.max(0, circle.maxMembers - members.length);
  return (
    <section aria-label="Members" className="space-y-3">
      <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
        <Users className="h-3.5 w-3.5" aria-hidden /> Members <span className="tnum">{members.length}/{circle.maxMembers}</span>
      </div>
      <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5">
        {members.map((m) => (
          <MemberCard key={m.address} m={m} circle={circle} isYou={sameAddr(m.address, viewer)} extra={extras[m.address.toLowerCase()]} />
        ))}
        {circle.status === 0 &&
          Array.from({ length: seats }, (_, i) => (
            <div key={`seat-${i}`} className="flex min-w-[168px] items-center justify-center rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">
              Open seat
            </div>
          ))}
      </div>
      <MembersTable circle={circle} members={members} viewer={viewer} extras={extras} />
      {circle.status === 0 && seats > 0 && <p className="text-xs text-muted-foreground md:hidden">{seats} open {seats === 1 ? "seat" : "seats"}</p>}
    </section>
  );
}
