/** Colour by score: 0 = safest, 100 = riskiest. ≤39 success, 40–69 warning, ≥70 danger. */
export function scoreColor(score: number): string {
  if (score >= 70) return "hsl(var(--danger))";
  if (score >= 40) return "hsl(var(--warning))";
  return "hsl(var(--success))";
}

export function scoreBand(score: number): "Low" | "Medium" | "High" {
  return score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
}

/** Half-ring gauge, 0–100 where 0 is the safest. */
export function ScoreGauge({ score }: { score: number }) {
  const r = 44;
  const half = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="relative h-[72px] w-[120px]" role="img" aria-label={`Risk score ${clamped} out of 100, where 0 is safest and 100 is riskiest`}>
      <svg viewBox="0 0 120 70" className="h-full w-full">
        <path d="M 16 64 A 44 44 0 0 1 104 64" fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
        <path d="M 16 64 A 44 44 0 0 1 104 64" fill="none" stroke={scoreColor(clamped)} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(clamped / 100) * half} ${half}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="tnum text-3xl font-extrabold">{clamped}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className="absolute inset-x-0 -bottom-4 flex justify-between px-2 text-[9px] uppercase tracking-wide text-muted-foreground" aria-hidden>
        <span>safest</span>
        <span>riskiest</span>
      </div>
    </div>
  );
}
