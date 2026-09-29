"use client";

import { UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionTitle } from "@/components/PageHeader";
import { usePolling } from "@/hooks/usePolling";
import { api } from "@/lib/api";
import { formatMst } from "@/lib/format";
import type { Profile } from "@/lib/types";

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <dt className="text-[12px] font-medium text-muted-foreground">{label}</dt>
      <dd className="tnum mt-1 text-[22px] font-semibold leading-tight">{value}</dd>
      {hint && <p className="tnum mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Profile numbers: counts from the contract's reputation record and totals from indexed contract events. */
export function ProfileStats({ address }: { address: string }) {
  const p = usePolling<Profile>(() => api.profile(address), 30_000, [address]);
  const s = p.data?.stats;
  return (
    <section className="space-y-3" aria-label="Profile">
      <SectionTitle Icon={UserRound}>Profile</SectionTitle>
      <Card className="p-4 md:p-5">
        {p.loading && !p.data ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : !s ? (
          <p className="text-[13px] text-muted-foreground">Profile numbers are temporarily unavailable.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Risk" value={p.data?.riskTier ?? "Unassessed"} hint={p.data?.score !== null && p.data?.score !== undefined ? `score ${p.data.score} of 100` : undefined} />
            <Stat label="Circles" value={s.circles} hint={`${s.circlesCompleted} completed`} />
            <Stat label="Completed rounds" value={s.completedRounds} />
            <Stat label="Contributions" value={s.contributions} hint={`${formatMst(s.contributedTotal, 3)} MST paid`} />
            <Stat label="Defaults" value={s.defaults} hint={s.circlesRemoved ? `removed from ${s.circlesRemoved}` : "covered by collateral"} />
            <Stat label="Payouts" value={s.payouts} hint={`${formatMst(s.payoutsTotal, 3)} MST`} />
            <Stat label="Dividends" value={<>{formatMst(s.dividendsTotal, 3)} <span className="text-[12px] font-medium text-muted-foreground">MST</span></>} hint="your share of discounts" />
            <Stat label="Wallet" value={<span className="font-mono text-[15px]">{address.slice(0, 6)}…{address.slice(-4)}</span>} hint="on-chain identity" />
          </dl>
        )}
      </Card>
    </section>
  );
}
