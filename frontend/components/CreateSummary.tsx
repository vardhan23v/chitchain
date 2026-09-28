import { Card } from "@/components/ui/card";
import { MstcAmount } from "@/components/MstcAmount";
import { TestnetBadge } from "@/components/TestnetBadge";
import { TierChip } from "@/components/TierChip";
import { BPS } from "@/lib/chain";
import { formatDuration, formatMst, toWei } from "@/lib/format";
import { multToBps, pctToBps, type CreateInput } from "@/lib/createSchema";
import type { Tier } from "@/lib/types";

function safeWei(v: string): bigint {
  try {
    return toWei(v || "0");
  } catch {
    return 0n;
  }
}

/** DESIGN §6.2 live summary panel (v2: windows, holdback, max discount, per-tier multipliers). */
export function CreateSummary({ v }: { v: CreateInput }) {
  const contribution = safeWei(v.contribution);
  const base = safeWei(v.baseCollateral);
  const pot = contribution * BigInt(v.maxMembers || 0);
  const roundLen = (v.contributionDuration || 0) + (v.biddingDuration || 0);
  const total = (v.maxMembers || 0) * roundLen;
  const bpsFor = { lowBps: multToBps(v.lowMult || 0), mediumBps: multToBps(v.mediumMult || 0), highBps: multToBps(v.highMult || 0) };
  const tiers: Tier[] = [1, 2, 3, 0];
  const collateralFor = (t: Tier) => (base * BigInt(t === 1 ? bpsFor.lowBps : t === 2 ? bpsFor.mediumBps : bpsFor.highBps)) / BigInt(BPS);
  // Holdback example on a sample payout: pot with the max discount applied and fee removed.
  const maxDiscount = (pot * BigInt(pctToBps(v.maxDiscountPct || 0))) / BigInt(BPS);
  const fee = (pot * BigInt(pctToBps(v.feePct || 0))) / BigInt(BPS);
  const samplePayout = pot - maxDiscount - fee;
  const holdback = (samplePayout * BigInt(pctToBps(v.holdbackPct || 0))) / BigInt(BPS);

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base">Summary</h2>
        <TestnetBadge size="xs" />
      </div>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Pot per round</dt>
          <dd><MstcAmount wei={pot} size="lg" className="text-pot" /></dd>
          <dd className="text-xs text-muted-foreground">{v.maxMembers} members × {v.contribution || "0"} MST</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Collateral by tier (locked at join)</dt>
          <dd className="mt-1 space-y-1.5">
            {tiers.map((t) => (
              <div key={t} className="flex items-center justify-between gap-2">
                <TierChip tier={t} circle={bpsFor} />
                <MstcAmount wei={collateralFor(t)} size="sm" />
              </div>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Holdback example</dt>
          <dd className="tnum text-xs">
            A winner who accepts the lowest allowed payout ({formatMst(samplePayout)} MST after a {v.maxDiscountPct}% discount and {v.feePct}% fee) has <span className="font-semibold text-foreground">{formatMst(holdback)} MST</span> ({v.holdbackPct}%) held back until the circle completes.
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-muted-foreground">Round length</dt>
            <dd className="tnum font-semibold">{formatDuration(roundLen)}</dd>
            <dd className="text-xs text-muted-foreground">{formatDuration(v.contributionDuration)} contribute + {formatDuration(v.biddingDuration)} bid</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total duration</dt>
            <dd className="tnum font-semibold">{formatDuration(total)}</dd>
            <dd className="text-xs text-muted-foreground">{v.maxMembers} rounds</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fee per round</dt>
            <dd className="tnum font-semibold">{v.feePct}% → reserve</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Max discount</dt>
            <dd className="tnum font-semibold">{v.maxDiscountPct}% · {formatMst(maxDiscount)} MST</dd>
          </div>
        </div>
      </dl>
    </Card>
  );
}
