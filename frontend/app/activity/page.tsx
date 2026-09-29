"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { History, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionRow, txType, type TxType } from "@/components/TransactionRow";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";
import { isEvmAddress } from "@/lib/types";

type Tab = "all" | "contributions" | "bids" | "settlements" | "withdrawals";
const TABS: { key: Tab; label: string; type: TxType | null }[] = [
  { key: "all", label: "All", type: null },
  { key: "contributions", label: "Contributions", type: "contribution" },
  { key: "bids", label: "Bids", type: "bid" },
  { key: "settlements", label: "Settlements", type: "settlement" },
  { key: "withdrawals", label: "Withdrawals", type: "withdrawal" },
];
const isTab = (v: string | null): v is Tab => !!v && TABS.some((t) => t.key === v);

export default function ActivityPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <Activity />
      </Suspense>
    </RequireAuth>
  );
}

const TH = "px-3 py-2 text-left text-[12px] font-semibold text-muted-foreground";

function Activity() {
  const auth = useAuth();
  const wallet = useWallet();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("type");
  const [tab, setTab] = useState<Tab>(isTab(initial) ? initial : "all");
  useEffect(() => {
    if (isTab(initial)) setTab(initial);
  }, [initial]);
  const act = useActivity(isEvmAddress(auth.user?.walletAddress) ? auth.user!.walletAddress : wallet.account);
  const events = act.data ?? [];
  const wanted = TABS.find((t) => t.key === tab)?.type ?? null;
  const shown = wanted ? events.filter((e) => txType(e) === wanted) : events;
  const count = (t: TxType | null) => (t ? events.filter((e) => txType(e) === t).length : events.length);

  const pick = (t: Tab) => {
    setTab(t);
    router.replace(t === "all" ? "/activity" : `/activity?type=${t}`, { scroll: false });
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="Transactions" title="On-chain activity" description="Every indexed on-chain event where you were the member, winner or bidder, each one verifiable on MSTScan." actions={events.length ? <span className="tnum text-[13px] text-muted-foreground">{events.length} events</span> : undefined} />

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div role="tablist" aria-label="Transaction type" className="inline-flex gap-1 rounded-full border border-white/[0.08] bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => pick(t.key)}
              className={cn("tnum whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60", tab === t.key ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}{events.length > 0 && <span className="ml-1.5 text-[11px] text-muted-foreground">{count(t.type)}</span>}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {act.loading && !act.data ? (
          <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : act.error && !act.data ? (
          <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" className="border-0" title="Your history is temporarily unavailable." text="Try again in a moment. Every event stays verifiable on MSTScan." action={<Button variant="outline" onClick={() => void act.refetch()}>Try again</Button>} />
        ) : events.length === 0 ? (
          <EmptyState Icon={History} className="border-0" title="No on-chain activity yet" text="Join a circle and every contribution, bid and payout will appear here." action={<Button asChild variant="outline"><Link href="/#circles">Explore chits</Link></Button>} />
        ) : shown.length === 0 ? (
          <EmptyState Icon={History} className="border-0" title={`No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} yet`} text="Events of this type will appear here once they are indexed." action={<Button variant="outline" onClick={() => pick("all")}>Show all</Button>} />
        ) : (
          <>
            <ul className="space-y-2 p-3 md:hidden">{shown.map((e) => <TransactionRow key={`${e.txHash}-${e.logIndex}`} e={e} layout="card" />)}</ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr><th className={TH}>Event</th><th className={cn(TH, "text-right")}>Amount</th><th className={TH}>Circle</th><th className={TH}>Status</th><th className={TH}>When</th><th className={TH}>Wallet</th><th className={TH}>Tx</th></tr>
                </thead>
                <tbody>{shown.map((e) => <TransactionRow key={`${e.txHash}-${e.logIndex}`} e={e} />)}</tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
