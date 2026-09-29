/** Circle of 5 dots joined by a ring; the highlighted dot is MST red on the dark theme. */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  const dots = Array.from({ length: 5 }, (_, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return { x: 16 + 11 * Math.cos(a), y: 16 + 11 * Math.sin(a) };
  });
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" opacity="0.3" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={i === 0 ? 3.6 : 2.8} fill={i === 0 ? "hsl(var(--primary))" : "hsl(var(--foreground))"} opacity={i === 0 ? 1 : 0.85} />
      ))}
    </svg>
  );
}
