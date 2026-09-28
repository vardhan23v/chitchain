import type { RiskFactor, RiskResult } from "@/lib/types";

/** Plain-English explanations for the heuristic's factor names (matched loosely by keyword). */
const EXPLAIN: [RegExp, string][] = [
  [/on.?time|paid/i, "Share of past contributions paid before the deadline. Higher is safer."],
  [/miss|default/i, "Contributions that had to be covered by collateral. More misses raise the score."],
  [/complet/i, "Circles this wallet has seen through to the end. Completions lower the score."],
  [/remov/i, "Times this wallet was removed for exhausted collateral. Removal raises the score a lot."],
  [/age|history|tenure|first/i, "How long the wallet has been active in circles. New wallets start closer to the middle."],
  [/balance|fund/i, "Wallet balance relative to typical contributions. Very low balances raise the score."],
  [/win|won|payout/i, "Whether the wallet took an early payout before finishing its dues."],
  [/collateral/i, "How much of the locked collateral is still intact."],
];

export function explainFactor(name: string): string {
  return EXPLAIN.find(([re]) => re.test(name))?.[1] ?? "Heuristic input used by the demo risk model.";
}

/** Factor list with plain explanations, plus the on-chain reputation counters. */
export function RiskFactors({ factors, reputation }: { factors: RiskFactor[]; reputation: RiskResult["reputation"] }) {
  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-xl border text-sm">
        {factors.map((f) => (
          <li key={f.name} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="w-40 shrink-0 font-medium">{f.name}</span>
            <span className="tnum shrink-0 text-foreground">{f.value}</span>
            <span className="text-xs text-muted-foreground">{f.effect} · {explainFactor(f.name)}</span>
          </li>
        ))}
        {factors.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No factors reported.</li>}
      </ul>
      <p className="tnum text-xs text-muted-foreground">
        Reputation on-chain: {reputation.paidOnTime} paid on time · {reputation.missed} missed · {reputation.circlesCompleted} completed · {reputation.circlesRemoved} removed
      </p>
    </div>
  );
}
