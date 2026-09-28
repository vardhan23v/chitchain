"use client";

import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressPill } from "@/components/AddressPill";
import { MstcAmount } from "@/components/MstcAmount";
import { TierChip } from "@/components/TierChip";
import { useDemo } from "@/hooks/useDemo";
import { addrUrl, shortAddr } from "@/lib/format";

export default function DemoPage() {
  const d = useDemo();
  const s = d.data;
  const Spin = ({ k }: { k: string }) => (d.busy === k ? <Loader2 className="animate-spin" aria-hidden /> : null);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-warning bg-warning/10 px-4 py-3">
        <div className="text-sm font-bold uppercase tracking-widest text-warning">Demo controls</div>
        <p className="text-xs text-muted-foreground">Operator-only. Wallets A–E are custodial demo wallets held by the backend. Every action here is a real MST testnet transaction.</p>
      </div>

      {d.error && !s && <p className="text-sm text-danger">Backend unreachable: {d.error}</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-3"><div className="text-xs text-muted-foreground">Txs this demo</div><div className="tnum text-2xl font-bold">{s?.txCount ?? "—"}</div></Card>
        <Card className="p-3"><div className="text-xs text-muted-foreground">Latest demo circle</div><div className="text-2xl font-bold">{s?.circleId ? <Link className="text-primary hover:underline" href={`/circle/${s.circleId}`}>#{s.circleId}</Link> : "—"}</div></Card>
        <Card className="p-3 sm:col-span-2"><div className="text-xs text-muted-foreground">Contract</div>{s?.contract ? <a className="font-mono text-sm text-chain hover:underline" href={addrUrl(s.contract)} target="_blank" rel="noopener noreferrer">{shortAddr(s.contract, 10, 8)} <ExternalLink className="inline h-3 w-3" aria-hidden /></a> : <div className="text-sm">—</div>}</Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!!d.busy || !s} onClick={() => void d.fund()}><Spin k="fund" />Fund wallets</Button>
        <Button variant="outline" disabled={!!d.busy || !s} onClick={() => void d.assessAll()}><Spin k="assess" />Assess all</Button>
        <Button disabled={!!d.busy || !s} onClick={() => void d.newCircle()}><Spin k="new" />New demo circle (30 s rounds)</Button>
      </div>

      <Card className="overflow-x-auto rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-3">Label</th><th className="p-3">Address</th><th className="p-3">Balance</th><th className="p-3">Tier</th><th className="p-3">Skip payment</th><th className="p-3">Withdraw</th></tr>
          </thead>
          <tbody>
            {!s ? (
              Array.from({ length: 5 }, (_, i) => <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>)
            ) : (
              s.wallets.map((w) => (
                <tr key={w.address} className="border-t">
                  <td className="p-3 font-semibold">Member {w.label}</td>
                  <td className="p-3"><AddressPill address={w.address} /></td>
                  <td className="p-3"><MstcAmount wei={w.balance} size="sm" /></td>
                  <td className="p-3"><Link href={`/member/${w.address}`}><TierChip tier={w.tier} /></Link></td>
                  <td className="p-3">
                    <Button size="sm" variant={w.skip ? "destructive" : "outline"} disabled={!!d.busy} onClick={() => void d.skip(w.address, !w.skip)} aria-pressed={w.skip}>
                      <Spin k={`skip:${w.address}`} />{w.skip ? "Skipping" : "Paying"}
                    </Button>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" disabled={!!d.busy || !s.circleId} onClick={() => s.circleId && void d.withdraw(w.address, s.circleId)}>
                      <Spin k={`wd:${w.address}`} />Withdraw{s.circleId ? ` #${s.circleId}` : ""}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
