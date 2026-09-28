import { Card } from "@/components/ui/card";
import { MstcAmount } from "@/components/MstcAmount";
import { TierChip } from "@/components/TierChip";
import { TIER_MULTIPLIER } from "@/lib/chain";
import { formatDuration, toWei } from "@/lib/format";
import type { CreateInput } from "@/lib/createSchema";
import type { Tier } from "@/lib/types";

function safeWei(v: string): bigint {
  try {
    return toWei(v || "0");
  } catch {
    return 0n;
  }
}

/** DESIGN §6.2 live summary panel. */
export function CreateSummary({ v }: { v: CreateInput }) {
  const contribution = safeWei(v.contribution);
  const base = safeWei(v.baseCollateral);
  const pot = contribution * BigInt(v.maxMembers || 0);
  const total = (v.maxMembers || 0) * (v.roundDuration || 0);
  const tiers: Tier[] = [1, 2, 3, 0];

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <h2 className="text-base">Summary</h2>
      <dl className="mt-3 space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Pot per round</dt>
          <dd><MstcAmount wei={pot} size="lg" className="text-pot" /></dd>
          <dd className="text-xs text-muted-foreground">{v.maxMembers} members × {v.contribution || "0"} MSTC</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Collateral by tier (locked at join)</dt>
          <dd className="mt-1 space-y-1.5">
            {tiers.map((t) => (
              <div key={t} className="flex items-center justify-between gap-2">
                <TierChip tier={t} />
                <MstcAmount wei={(base * BigInt(Math.round(TIER_MULTIPLIER[t] * 100))) / 100n} size="sm" />
              </div>
            ))}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-muted-foreground">Total duration</dt>
            <dd className="tnum font-semibold">{formatDuration(total)}</dd>
            <dd className="text-xs text-muted-foreground">{v.maxMembers} rounds × {formatDuration(v.roundDuration)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Fee per round</dt>
            <dd className="tnum font-semibold">{v.feePct}% → reserve</dd>
          </div>
        </div>
      </dl>
    </Card>
  );
}
