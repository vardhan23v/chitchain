import { formatUnits, parseUnits } from "ethers";
import { EXPLORER_URL } from "@/lib/chain";

/** Formats a wei amount as "12.50" (no unit). Accepts bigint or decimal string. */
export function formatMstc(wei: bigint | string | number | null | undefined, decimals = 2): string {
  if (wei === null || wei === undefined || wei === "") return (0).toFixed(decimals);
  let big: bigint;
  try {
    big = typeof wei === "bigint" ? wei : BigInt(String(wei));
  } catch {
    return (0).toFixed(decimals);
  }
  const num = Number(formatUnits(big, 18));
  return num.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Full-precision string for aria-labels: "1.0 MSTC" style with trailing zeros trimmed. */
export function formatMstcFull(wei: bigint | string | null | undefined): string {
  if (wei === null || wei === undefined || wei === "") return "0";
  try {
    return formatUnits(BigInt(String(wei)), 18);
  } catch {
    return "0";
  }
}

export function toWei(mstc: string | number): bigint {
  return parseUnits(String(mstc || "0"), 18);
}

export function shortAddr(addr: string | null | undefined, head = 6, tail = 4): string {
  if (!addr) return "—";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function txUrl(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function addrUrl(addr: string): string {
  return `${EXPLORER_URL}/address/${addr}`;
}

export function timeAgo(tsSeconds: number, now: number = Date.now()): string {
  const diff = Math.max(0, Math.floor(now / 1000) - tsSeconds);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** "30 s", "1 min", "2 h 30 min", "5 days". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 s";
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return h ? `${d} d ${h} h` : `${d} ${d === 1 ? "day" : "days"}`;
}

/** mm:ss countdown text from remaining seconds. */
export function formatClock(remaining: number): string {
  const r = Math.max(0, Math.floor(remaining));
  const m = Math.floor(r / 60);
  const s = r % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function pct(part: bigint | string, whole: bigint | string): number {
  try {
    const p = BigInt(String(part));
    const w = BigInt(String(whole));
    if (w === 0n) return 0;
    return Math.min(100, Number((p * 10000n) / w) / 100);
  } catch {
    return 0;
  }
}

export function sameAddr(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
