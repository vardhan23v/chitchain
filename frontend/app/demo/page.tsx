"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FlaskConical, Loader2, WifiOff } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { TableScroll, TD, TH } from "@/components/TableScroll";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AddressPill } from "@/components/AddressPill";
import { RequireAuth } from "@/components/RequireAuth";
import { MstcAmount } from "@/components/MstcAmount";
import { DemoBadge, TestnetBadge } from "@/components/TestnetBadge";
import { TierChip } from "@/components/TierChip";
import { TxLink } from "@/components/TxLink";
import { useDemo } from "@/hooks/useDemo";
import { addrUrl, shortAddr } from "@/lib/format";

export default function DemoPage() {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <Demo />
    </RequireAuth>
  );
}

function Demo() {
  const d = useDemo();
  const s = d.data;
  const Spin = ({ k }: { k: string }) => (d.busy === k ? <Loader2 className="animate-spin" aria-hidden /> : null);
  const [form, setForm] = useState({ contributionDuration: "30", biddingDuration: "30", contribution: "0.1", holdbackPct: "10", maxDiscountPct: "40" });
  const [created, setCreated] = useState<{ circleId: number; txHash: string } | null>(null);
  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : fallback);

  const create = async () => {
    const r = await d.newCircle({
      contributionDuration: Math.max(5, Math.round(num(form.contributionDuration, 30))),
      biddingDuration: Math.max(5, Math.round(num(form.biddingDuration, 30))),
      contribution: form.contribution || "0.1",
      holdbackBps: Math.round(num(form.holdbackPct, 10) * 100),
      maxDiscountBps: Math.round(num(form.maxDiscountPct, 40) * 100),
    });
    if (r) setCreated(r);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="Platform admin" title="Demo controls" description="Operator-only. Wallets A to E are custodial demo wallets. Every action here is a real MST testnet transaction with testnet coins of no monetary value." actions={<><DemoBadge /><TestnetBadge size="xs" /></>} />

      {d.error && !s && (
        <InfoBanner Icon={WifiOff} tone="warning" role="status">
          <span className="font-semibold text-foreground">Demo controls are temporarily unavailable.</span>
          <span className="mt-1 block font-mono text-[11px] text-muted-foreground/80">{d.error}</span>
        </InfoBanner>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Demo overview">
        <StatTile label="Transactions this demo" value={s?.txCount ?? "—"} loading={!s && !d.error} />
        <StatTile label="Latest demo circle" value={s?.circleId ? <Link className="text-primary hover:underline" href={`/circle/${s.circleId}`}>#{s.circleId}</Link> : "—"} loading={!s && !d.error} />
        <StatTile label="Contract" className="col-span-2" value={s?.contract ? <a className="font-mono text-lg text-chain hover:underline" href={addrUrl(s.contract)} target="_blank" rel="noopener noreferrer" aria-label={`Contract ${s.contract} on MSTScan`}>{shortAddr(s.contract, 10, 8)} <ExternalLink className="inline h-3.5 w-3.5" aria-hidden /></a> : "—"} loading={!s && !d.error} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!!d.busy || !s} onClick={() => void d.fund()}><Spin k="fund" />Fund demo wallets</Button>
        <Button variant="outline" disabled={!!d.busy || !s} onClick={() => void d.assessAll()}><Spin k="assess" />Assess all wallets</Button>
      </div>

      <Card className="p-4 md:p-5">
        <SectionTitle Icon={FlaskConical} tone="text-warning">Create a demo circle</SectionTitle>
        <p className="mt-1 text-[13px] text-muted-foreground">Creates a circle and joins all five demo wallets. The autopilot contributes and the agent bids each round.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["contributionDuration", "Contribution window (s)"],
              ["biddingDuration", "Bidding window (s)"],
              ["contribution", "Contribution (MST)"],
              ["holdbackPct", "Holdback %"],
              ["maxDiscountPct", "Max discount %"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`demo-${k}`} className="text-xs">{label}</Label>
              <Input id={`demo-${k}`} inputMode="decimal" className="tnum h-8" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^0-9.]/g, "") }))} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button disabled={!!d.busy || !s} onClick={() => void create()}><Spin k="new" />Create a demo circle</Button>
          {created && (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Created <Link href={`/circle/${created.circleId}`} className="font-semibold text-primary hover:underline">circle #{created.circleId}</Link>
              <TxLink hash={created.txHash} label="MSTScan" />
            </span>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {!s && d.error ? (
          <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" className="border-0" title="Demo wallets are temporarily unavailable." />
        ) : (
        <TableScroll><table className="table-data w-full min-w-[720px] text-sm">
          <thead>
            <tr><th className={TH}>Wallet</th><th className={TH}>Address</th><th className={cn(TH, "text-right")}>Balance</th><th className={TH}>Tier</th><th className={TH}>This round</th><th className={TH}>Withdraw</th></tr>
          </thead>
          <tbody>
            {!s ? (
              Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={6} className={TD}><Skeleton className="h-7 w-full" /></td></tr>)
            ) : (
              s.wallets.map((w) => (
                <tr key={w.address}>
                  <td className={cn(TD, "font-semibold")}>Member {w.label}</td>
                  <td className={TD}><AddressPill address={w.address} /></td>
                  <td className={cn(TD, "tnum text-right")}><MstcAmount wei={w.balance} size="sm" /></td>
                  <td className={TD}><Link href={`/member/${w.address}`} aria-label={`Profile of member ${w.label}`}><TierChip tier={w.tier} /></Link></td>
                  <td className={TD}>
                    <Button size="sm" variant={w.skip ? "destructive" : "outline"} disabled={!!d.busy} onClick={() => void d.skip(w.address, !w.skip)} aria-pressed={w.skip}>
                      <Spin k={`skip:${w.address}`} />{w.skip ? "Skipping payment" : "Paying"}
                    </Button>
                  </td>
                  <td className={TD}>
                    <Button size="sm" variant="ghost" disabled={!!d.busy || !s.circleId} onClick={() => s.circleId && void d.withdraw(w.address, s.circleId)}>
                      <Spin k={`wd:${w.address}`} />Withdraw{s.circleId ? ` from #${s.circleId}` : ""}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table></TableScroll>
        )}
      </Card>
    </div>
  );
}
