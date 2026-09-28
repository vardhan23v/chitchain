"use client";

import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { eventAmount, renderFeedEvent } from "@/components/FeedItem";
import { TestnetBadge } from "@/components/TestnetBadge";
import { TxLink } from "@/components/TxLink";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { formatMst, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

export default function ActivityPage() {
  return (
    <RequireAuth>
      <Activity />
    </RequireAuth>
  );
}

function Activity() {
  const auth = useAuth();
  const wallet = useWallet();
  const act = useActivity(auth.user?.walletAddress ?? wallet.account);
  const events = act.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2"><History className="h-6 w-6 text-chain" aria-hidden /> Transaction history</h1>
        <TestnetBadge />
        <span className="text-sm text-muted-foreground">Every indexed event where you were the member, winner or bidder.</span>
      </div>
      <Card className="overflow-x-auto rounded-2xl">
        {act.loading && !act.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : act.error && !act.data ? (
          <p className="p-6 text-center text-sm text-muted-foreground">History needs the backend indexer — it is unreachable right now.</p>
        ) : events.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <p>No on-chain activity for this wallet yet.</p>
            <Button asChild variant="outline" className="mt-3"><Link href="/#circles">Join a circle</Link></Button>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50">
              <tr><th className={TH}>Event</th><th className={TH}>Circle</th><th className={cn(TH, "text-right")}>Amount</th><th className={TH}>When</th><th className={TH}>Tx</th></tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const r = renderFeedEvent(e, {});
                const amt = eventAmount(e);
                return (
                  <tr key={`${e.txHash}-${e.logIndex}`} className="border-t">
                    <td className="px-3 py-2"><span className="flex items-center gap-2"><r.Icon className={cn("h-4 w-4 shrink-0", r.color)} aria-hidden />{r.text}</span></td>
                    <td className="px-3 py-2">{e.circleId ? <Link href={`/circle/${e.circleId}`} className="text-primary hover:underline">#{e.circleId}</Link> : "—"}</td>
                    <td className="tnum px-3 py-2 text-right">{amt !== null ? `${formatMst(amt)} MST` : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{timeAgo(e.ts)}</td>
                    <td className="px-3 py-2"><TxLink hash={e.txHash} label="MSTScan" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
