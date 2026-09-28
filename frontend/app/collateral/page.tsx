"use client";

import Link from "next/link";
import { Info, Lock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CollateralRow } from "@/components/CollateralRow";
import { StatTile } from "@/components/StatTile";
import { TestnetBadge } from "@/components/TestnetBadge";
import { TxStepper } from "@/components/TxStepper";
import { useMyCircles } from "@/hooks/useMyCircles";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { getSignerContract } from "@/lib/contract";
import { big, formatMst } from "@/lib/format";

export default function CollateralPage() {
  const wallet = useWallet();
  const mine = useMyCircles(wallet.account);
  const { run, pending, state } = useTx();
  const circles = mine.data?.circles ?? [];
  const sum = (pick: (c: (typeof circles)[number]) => string) => circles.reduce((s, c) => s + big(pick(c)), 0n);

  if (!wallet.account) {
    return (
      <Card className="rounded-2xl p-8 text-center">
        <Wallet className="mx-auto h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-3 text-2xl">My collateral</h1>
        <p className="mt-2 text-muted-foreground">Connect BridgeKey to see what the contract holds for you.</p>
        {wallet.hasWallet && <Button className="mt-4" onClick={() => void wallet.connect()}>Connect BridgeKey</Button>}
      </Card>
    );
  }

  const withdraw = (id: number) =>
    void run(async () => (await getSignerContract()).withdraw(id), { success: "Withdrawn to your wallet", onMined: () => mine.refetch() });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2"><Lock className="h-6 w-6 text-chain" aria-hidden /> My collateral</h1>
        <TestnetBadge />
      </div>
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Totals">
        <StatTile label="Locked in contracts" testnet value={`${formatMst(sum((c) => c.me.collateral))} MST`} loading={mine.loading && !mine.data} />
        <StatTile label="Used to cover misses" testnet value={`${formatMst(sum((c) => c.me.collateralUsed))} MST`} loading={mine.loading && !mine.data} />
        <StatTile label="Claimable now" testnet value={`${formatMst(sum((c) => c.me.claimable))} MST`} loading={mine.loading && !mine.data} />
      </section>
      <p className="flex items-start gap-1 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Locked collateral and holdback cannot be withdrawn while the circle is active; they are released at completion. Payouts, dividends and refunds are claimable immediately.
      </p>
      <TxStepper state={state} />
      {mine.loading && !mine.data ? (
        <div className="space-y-3">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : mine.error && !mine.data ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your circles — backend and contract both unreachable.</p>
      ) : circles.length === 0 ? (
        <Card className="rounded-2xl border-dashed p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t joined a circle yet. <Link href="/#circles" className="text-primary hover:underline">Browse circles</Link>
        </Card>
      ) : (
        <div className="space-y-3">{circles.map((c) => <CollateralRow key={c.id} c={c} onWithdraw={withdraw} pending={pending} />)}</div>
      )}
    </div>
  );
}
