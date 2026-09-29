"use client";

import { useParams } from "next/navigation";
import { ExternalLink, History, Info, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressPill } from "@/components/AddressPill";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { FeedItem } from "@/components/FeedItem";
import { RiskCard } from "@/components/RiskCard";
import { DrawLine } from "@/components/motion/DrawLine";
import { scoreBand } from "@/components/ScoreGauge";
import { TierChip } from "@/components/TierChip";
import { TxLink } from "@/components/TxLink";
import { useRisk } from "@/hooks/useRisk";
import { useWallet } from "@/hooks/useWallet";
import { addrUrl, sameAddr } from "@/lib/format";
import { TIER_NAME } from "@/lib/labels";
import { cn } from "@/lib/utils";

export default function MemberPage() {
  const { addr } = useParams<{ addr: string }>();
  const wallet = useWallet();
  const address = addr === "me" ? wallet.account : addr;

  if (!address) {
    return (
      <div className="space-y-6 md:space-y-8">
        <PageHeader eyebrow="Member profile" title="My profile" description="Your risk tier and on-chain history." />
        <EmptyState Icon={Wallet} title="Connect your wallet to see your profile." text={wallet.hasWallet ? "Your risk tier and on-chain history show here." : "No wallet detected. Install the BridgeKey extension or Android app."} action={wallet.hasWallet ? <Button onClick={() => void wallet.connect()}><Wallet aria-hidden /> Connect BridgeKey</Button> : undefined} />
      </div>
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return <EmptyState Icon={Wallet} tone="bg-muted text-muted-foreground" title="That address is not valid." text="Check the link and try again." />;
  return <Profile address={address} isYou={sameAddr(address, wallet.account)} />;
}

const BAND_CLS = { Low: "text-success", Medium: "text-warning", High: "text-danger" } as const;

function Profile({ address, isYou }: { address: string; isYou: boolean }) {
  const { data, error, loading, assess, assessing, lastTx } = useRisk(address);
  const labelMap: Record<string, string> = {};

  const onAssess = async () => {
    try {
      const r = await assess();
      toast.success(`Risk tier re-assessed: ${TIER_NAME[r.tier]}.`, { description: r.txHash });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The assessment failed.");
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow={isYou ? "My profile" : "Member profile"}
        title={
          <span className="flex items-center gap-3">
            <Avatar address={address} size={40} />
            <span className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
            {isYou && <Badge>You</Badge>}
          </span>
        }
        description={<AddressPill address={address} />}
        actions={
          <Button asChild size="sm" variant="outline" className="rounded-full border-chain/30 text-chain hover:bg-chain/10 hover:text-chain">
            <a href={addrUrl(address)} target="_blank" rel="noopener noreferrer" aria-label={`Address ${address} on MSTScan`}>MSTScan <ExternalLink aria-hidden /></a>
          </Button>
        }
      />

      <div id="risk" className="grid scroll-mt-20 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RiskCard data={data} loading={loading} error={error} className="min-w-0" />
        <Card className="min-w-0 p-4 md:p-5">
          <SectionTitle Icon={ShieldCheck} trailing={<Badge variant="outline" className="text-muted-foreground">0 = safest · 100 = riskiest</Badge>}>Risk tier on-chain</SectionTitle>
          {data ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <TierChip tier={data.tier} />
                <span className={cn("text-sm font-semibold", BAND_CLS[scoreBand(data.score)])}>{scoreBand(data.score)} risk band</span>
                {data.onChainTier !== data.tier && <Badge variant="outline" className="text-xs">on-chain: {TIER_NAME[data.onChainTier]}, re-assess to update</Badge>}
              </div>
              <p className="text-[13px] text-muted-foreground">The tier prices the collateral you lock when joining a circle. Re-assessing writes the current heuristic tier to the contract.</p>
              <InfoBanner Icon={Info}>Demo heuristic risk model on {data.dataSource === "SYNTHETIC" ? "synthetic demo history" : data.dataSource === "ONCHAIN" ? "on-chain history" : "mixed synthetic and on-chain history"}, not a credit score.</InfoBanner>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onAssess} disabled={assessing}>
                  <RefreshCw className={assessing ? "animate-spin" : ""} aria-hidden /> Re-assess risk tier
                </Button>
                {lastTx && <TxLink hash={lastTx} label="View on MSTScan" />}
              </div>
            </div>
          ) : loading ? (
            <div className="mt-3 space-y-2" aria-busy="true"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-9 w-40" /></div>
          ) : (
            <p className="mt-3 text-[13px] text-muted-foreground">Until assessed, this wallet is <TierChip tier={0} /> and pays the High-tier collateral to join.</p>
          )}
        </Card>
      </div>

      <section id="reputation" className="scroll-mt-20 space-y-3">
        <SectionTitle Icon={History} tone="text-chain" trailing={data?.history?.length ? <span className="tnum">{data.history.length} events</span> : undefined}>On-chain history</SectionTitle>
        {data?.history?.length ? (
          <Card className="p-2 md:p-3">
            <DrawLine as="ol" className="ml-3 space-y-0.5 pl-1" color="bg-chain/70">{data.history.slice().reverse().map((e) => <FeedItem key={`${e.txHash}-${e.logIndex}`} e={e} labels={labelMap} now={Date.now()} />)}</DrawLine>
          </Card>
        ) : (
          <EmptyState Icon={History} tone="bg-chain/10 text-chain" title={data ? "No on-chain events for this wallet yet." : "History is temporarily unavailable."} text={data ? "Join a circle and every contribution, bid and payout will appear here." : "Try again in a moment."} />
        )}
      </section>
    </div>
  );
}
