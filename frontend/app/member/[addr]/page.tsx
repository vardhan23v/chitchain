"use client";

import { useParams } from "next/navigation";
import { ExternalLink, Info, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressPill } from "@/components/AddressPill";
import { FeedItem } from "@/components/FeedItem";
import { RiskFactors } from "@/components/RiskFactors";
import { ScoreGauge, scoreBand } from "@/components/ScoreGauge";
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
      <Card className="rounded-2xl p-8 text-center">
        <h1 className="text-2xl">My profile</h1>
        <p className="mt-2 text-muted-foreground">Connect BridgeKey to see your risk tier and on-chain history.</p>
        {wallet.hasWallet ? <Button className="mt-4" onClick={() => void wallet.connect()}>Connect BridgeKey</Button> : <p className="mt-4 text-sm text-muted-foreground">No wallet detected — install the BridgeKey extension or Android app.</p>}
      </Card>
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return <p className="text-muted-foreground">Invalid address.</p>;
  return <Profile address={address} isYou={sameAddr(address, wallet.account)} />;
}

const BAND_CLS = { Low: "text-success", Medium: "text-warning", High: "text-danger" } as const;

function Profile({ address, isYou }: { address: string; isYou: boolean }) {
  const { data, error, loading, assess, assessing, lastTx } = useRisk(address);
  const labelMap: Record<string, string> = {};

  const onAssess = async () => {
    try {
      const r = await assess();
      toast.success(`Tier set on-chain: ${TIER_NAME[r.tier]}`, { description: r.txHash });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assessment failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl md:text-3xl">{address.slice(0, 6)}…{address.slice(-4)}</h1>
        {isYou && <Badge>You</Badge>}
        <AddressPill address={address} />
        <a href={addrUrl(address)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-chain hover:underline">MSTScan <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
      </div>

      <Card className="rounded-2xl p-4 md:p-6">
        {loading ? (
          <div className="flex gap-6"><Skeleton className="h-20 w-32" /><div className="flex-1 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div></div>
        ) : !data ? (
          <div className="text-sm text-muted-foreground">
            <p>Risk assessment needs the backend{error ? ` (${error})` : ""}.</p>
            <p className="mt-1">Until assessed, this wallet is <TierChip tier={0} className="mx-1 inline-flex" /> and pays the High-tier collateral to join.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="pb-4"><ScoreGauge score={data.score} /></div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                Demo heuristic risk model
                <Badge variant="outline" className="normal-case tracking-normal">0 = safest · 100 = riskiest</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TierChip tier={data.tier} />
                <span className={cn("text-sm font-semibold", BAND_CLS[scoreBand(data.score)])}>{scoreBand(data.score)} risk band</span>
                {data.onChainTier !== data.tier && <Badge variant="outline" className="text-xs">on-chain: {TIER_NAME[data.onChainTier]} — re-assess to update</Badge>}
              </div>
              <p className="text-[15px]">
                &ldquo;{data.explanation}&rdquo; <span className="text-xs text-muted-foreground">({data.explanationSource === "llm" ? "AI" : "template"})</span>
              </p>
              <RiskFactors factors={data.factors} reputation={data.reputation} />
              <p className="flex items-start gap-1 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />Demo heuristic risk model on {data.dataSource === "SYNTHETIC" ? "synthetic demo history" : data.dataSource === "ONCHAIN" ? "on-chain history" : "mixed synthetic and on-chain history"} — not a credit score.</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onAssess} disabled={assessing}>
                  <RefreshCw className={assessing ? "animate-spin" : ""} aria-hidden /> {assessing ? "Assessing…" : "Re-assess (sets tier on-chain)"}
                </Button>
                {lastTx && <TxLink hash={lastTx} label="setRiskTier tx" />}
              </div>
            </div>
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-chain" aria-hidden />On-chain history</h2>
        {data?.history?.length ? (
          <Card className="rounded-2xl p-3">
            <ol className="relative ml-2 space-y-0.5 border-l pl-2">{data.history.slice().reverse().map((e) => <FeedItem key={`${e.txHash}-${e.logIndex}`} e={e} labels={labelMap} now={Date.now()} />)}</ol>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">{data ? "No on-chain events for this wallet yet." : "History needs the backend indexer."}</p>
        )}
      </section>
    </div>
  );
}
