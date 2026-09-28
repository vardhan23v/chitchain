/** Deterministic 5×5 identicon from an address (no external lib). */
export function Avatar({ address, size = 36 }: { address: string; size?: number }) {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const hue = parseInt(hex.slice(0, 4), 16) % 360;
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push(parseInt(hex[(i + 4) % hex.length], 16) % 2 === 0);
  const grid: boolean[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => cells[r * 3 + (c < 3 ? c : 4 - c)])
  );
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" className="rounded-full" aria-hidden style={{ background: `hsl(${hue} 60% 92%)` }}>
      {grid.map((row, r) => row.map((on, c) => (on ? <rect key={`${r}${c}`} x={c} y={r} width="1" height="1" fill={`hsl(${hue} 65% 45%)`} /> : null)))}
    </svg>
  );
}
