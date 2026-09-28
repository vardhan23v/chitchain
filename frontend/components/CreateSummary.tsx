import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MstcAmount } from "@/components/MstcAmount";
import { SectionTitle } from "@/components/PageHeader";
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

/** DESIGN §6.2 live summary: pot formula, tier table, holdback example, durations. Sticky on desktop. */
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
  const facts: [string, string][] = [
    ["Round length", formatDuration(roundLen)],
    ["Total duration", `${formatDuration(total)} · ${v.maxMembers} rounds`],
    ["Fee per round", `${v.feePct}% → reserve`],
    ["Max discount", `${v.maxDiscountPct}% · ${formatMst(maxDiscount)} MST`],
  ];

  return (
    <div className="lg:sticky lg:top-24">
      <Card className="overflow-hidden">
        <div className="bg-pot/[0.06] p-4 md:p-5">
          <SectionTitle Icon={Calculator} tone="text-pot" trailing={<TestnetBadge size="xs" />}>Live summary</SectionTitle>
          <div className="mt-2 text-[12px] font-medium text-muted-foreground">Pot per round</div>
          <MstcAmount wei={pot} size="display" className="text-pot" animate />
          <p className="tnum mt-1 text-xs text-muted-foreground">= {v.maxMembers} members × {v.contribution || "0"} MST</p>
        </div>
        <div className="space-y-4 p-4 md:p-5">
          <div>
            <div className="text-[12px] font-medium text-muted-foreground">Collateral locked at join, by tier</div>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y">
                {tiers.map((t) => (
                  <tr key={t}>
                    <td className="py-1.5"><TierChip tier={t} circle={bpsFor} /></td>
                    <td className="py-1.5 text-right"><MstcAmount wei={collateralFor(t)} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/40 p-3 text-sm">
            {facts.map(([k, val]) => (
              <div key={k}>
                <dt className="text-[11px] font-medium text-muted-foreground">{k}</dt>
                <dd className="tnum font-semibold">{val}</dd>
              </div>
            ))}
          </dl>
          <p className="tnum text-xs leading-snug text-muted-foreground">
            Holdback example: a winner accepting the lowest allowed payout ({formatMst(samplePayout)} MST after {v.maxDiscountPct}% discount and {v.feePct}% fee) has <span className="font-semibold text-foreground">{formatMst(holdback)} MST</span> ({v.holdbackPct}%) held back until the circle completes.
          </p>
        </div>
      </Card>
    </div>
  );
}
