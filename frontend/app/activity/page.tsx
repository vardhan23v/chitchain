"use client";

import Link from "next/link";
import { History, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { TableScroll, TH } from "@/components/TableScroll";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { eventAmount, renderFeedEvent } from "@/components/FeedItem";
import { TxLink } from "@/components/TxLink";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { formatMst, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isEvmAddress } from "@/lib/types";

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
  const act = useActivity(isEvmAddress(auth.user?.walletAddress) ? auth.user!.walletAddress : wallet.account);
  const events = act.data ?? [];

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="My activity" title="Transaction history" description="Every indexed on-chain event where you were the member, winner or bidder, each one verifiable on MSTScan." actions={events.length ? <span className="tnum text-[13px] text-muted-foreground">{events.length} events</span> : undefined} />
      <Card className="overflow-hidden">
        {act.loading && !act.data ? (
          <div className="space-y-2 p-4" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : act.error && !act.data ? (
          <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" className="border-0" title="Your history is temporarily unavailable." text="Try again in a moment. Every event stays verifiable on MSTScan." />
        ) : events.length === 0 ? (
          <EmptyState Icon={History} className="border-0" title="No on-chain activity yet" text="Join a circle and every contribution, bid and payout will appear here." action={<Button asChild variant="outline"><Link href="/#circles">Join a circle</Link></Button>} />
        ) : (
          <TableScroll><table className="table-data w-full min-w-[640px] text-sm">
            <thead>
              <tr><th className={TH}>Event</th><th className={TH}>Circle</th><th className={cn(TH, "text-right")}>Amount</th><th className={TH}>When</th><th className={TH}>Tx</th></tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const r = renderFeedEvent(e, {});
                const amt = eventAmount(e);
                return (
                  <tr key={`${e.txHash}-${e.logIndex}`}>
                    <td className="px-3 py-2.5"><span className="flex items-center gap-2.5"><span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", r.color)} style={{ background: "color-mix(in srgb, currentColor 12%, transparent)" }} aria-hidden><r.Icon className="h-3.5 w-3.5" /></span>{r.text}</span></td>
                    <td className="px-3 py-2.5">{e.circleId ? <Link href={`/circle/${e.circleId}`} className="text-primary hover:underline">#{e.circleId}</Link> : "—"}</td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-right font-medium">{amt !== null ? `${formatMst(amt)} MST` : <span className="text-muted-foreground">—</span>}</td>
                    <td className="tnum whitespace-nowrap px-3 py-2.5 text-muted-foreground">{timeAgo(e.ts)}</td>
                    <td className="px-3 py-2.5"><TxLink hash={e.txHash} label="MSTScan" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table></TableScroll>
        )}
      </Card>
    </div>
  );
}
