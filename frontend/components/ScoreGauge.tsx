import type { Tier } from "@/lib/types";

const COLOR: Record<Tier, string> = { 0: "hsl(var(--muted-foreground))", 1: "hsl(var(--success))", 2: "hsl(var(--warning))", 3: "hsl(var(--danger))" };

/** Half-ring gauge, 0–100. */
export function ScoreGauge({ score, tier }: { score: number; tier: Tier }) {
  const r = 44;
  const half = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="relative h-[72px] w-[120px]" role="img" aria-label={`Risk score ${clamped} out of 100`}>
      <svg viewBox="0 0 120 70" className="h-full w-full">
        <path d="M 16 64 A 44 44 0 0 1 104 64" fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
        <path d="M 16 64 A 44 44 0 0 1 104 64" fill="none" stroke={COLOR[tier]} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(clamped / 100) * half} ${half}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="tnum text-3xl font-extrabold">{clamped}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}
