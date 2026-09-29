"use client";

import Link from "next/link";
import { Info, Lock, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { Button } from "@/components/ui/button";
import { MstcAmount } from "@/components/MstcAmount";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { CollateralRow } from "@/components/CollateralRow";
import { RequireAuth } from "@/components/RequireAuth";
import { StatTile } from "@/components/StatTile";
import { TxStepper } from "@/components/TxStepper";
import { useMyCircles } from "@/hooks/useMyCircles";
import { useTx } from "@/hooks/useTx";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { getSignerContract } from "@/lib/contract";
import { big } from "@/lib/format";
import { isEvmAddress } from "@/lib/types";

export default function CollateralPage() {
  return (
    <RequireAuth>
      <Collateral />
    </RequireAuth>
  );
}

function Collateral() {
  const auth = useAuth();
  const wallet = useWallet();
  const mine = useMyCircles(isEvmAddress(auth.user?.walletAddress) ? auth.user!.walletAddress : wallet.account);
  const { run, pending, state, keepWaiting, dismiss } = useTx();
  const circles = mine.data?.circles ?? [];
  const sum = (pick: (c: (typeof circles)[number]) => string) => circles.reduce((s, c) => s + big(pick(c)), 0n);

  const withdraw = (id: number) =>
    void run(async () => (await getSignerContract()).withdraw(id), { success: "Withdrawn to your wallet.", onMined: () => mine.refetch() });

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="My funds" title="My collateral" description="What the contract holds for you, per circle. Locked while a circle is active, released at completion." />
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3" aria-label="Totals">
        <StatTile label="Locked in contracts" Icon={Lock} iconClassName="text-primary" testnet value={<MstcAmount wei={sum((c) => c.me.collateral)} size="lg" className="text-primary" />} loading={mine.loading && !mine.data} />
        <StatTile label="Used to cover misses" testnet value={<MstcAmount wei={sum((c) => c.me.collateralUsed)} size="lg" className={sum((c) => c.me.collateralUsed) > 0n ? "text-warning" : undefined} />} loading={mine.loading && !mine.data} />
        <StatTile label="Claimable now" testnet value={<MstcAmount wei={sum((c) => c.me.claimable)} size="lg" className={sum((c) => c.me.claimable) > 0n ? "text-success" : undefined} />} loading={mine.loading && !mine.data} className="col-span-2 md:col-span-1" />
      </section>
      <InfoBanner Icon={Info}>Locked collateral and holdback cannot be withdrawn while the circle is active; they are released at completion. Payouts, dividends and refunds are claimable immediately.</InfoBanner>
      <TxStepper state={state} onKeepWaiting={keepWaiting} onDismiss={dismiss} />
      {mine.loading && !mine.data ? (
        <div className="space-y-4" aria-busy="true">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : mine.error && !mine.data ? (
        <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" title="Your collateral is temporarily unavailable." text="Check your connection and try again in a moment." />
      ) : circles.length === 0 ? (
        <EmptyState Icon={Lock} title="You haven't joined a circle yet" text="Collateral is locked when you join and shows up here per circle." action={<Button asChild variant="outline"><Link href="/#circles">Browse circles</Link></Button>} />
      ) : (
        <div className="space-y-4">{circles.map((c) => <CollateralRow key={c.id} c={c} onWithdraw={withdraw} pending={pending} />)}</div>
      )}
    </div>
  );
}
