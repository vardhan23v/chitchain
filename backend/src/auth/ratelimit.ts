import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../routes/util";

/** Pure token-bucket keyed store with an injectable clock (unit-testable, no timers). */
export class TokenBucket {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();
  private lastSweep: number;
  constructor(private readonly capacity: number, private readonly refillPerMs: number, private readonly clock: () => number = Date.now) {
    this.lastSweep = clock();
  }
  /** Consumes one token for `key`; returns { ok, retryAfterMs }. */
  take(key: string): { ok: boolean; retryAfterMs: number } {
    const now = this.clock();
    this.sweep(now);
    const b = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    b.tokens = Math.min(this.capacity, b.tokens + (now - b.updatedAt) * this.refillPerMs);
    b.updatedAt = now;
    if (b.tokens >= 1) { b.tokens -= 1; this.buckets.set(key, b); return { ok: true, retryAfterMs: 0 }; }
    this.buckets.set(key, b);
    return { ok: false, retryAfterMs: Math.ceil((1 - b.tokens) / this.refillPerMs) };
  }
  get size(): number { return this.buckets.size; }
  /** Drops entries that have been idle long enough to be full again (at most once a minute). */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    const idle = this.capacity / this.refillPerMs;
    for (const [k, b] of this.buckets) if (now - b.updatedAt >= idle) this.buckets.delete(k);
  }
}

export interface RateLimitOpts { perMinute: number; keys: (req: Request) => string[]; clock?: () => number }

/** Express middleware: every key returned by `keys(req)` gets its own bucket; any exhausted bucket → 429 RATE_LIMITED + Retry-After. */
export function rateLimit(opts: RateLimitOpts): (req: Request, res: Response, next: NextFunction) => void {
  const bucket = new TokenBucket(opts.perMinute, opts.perMinute / 60_000, opts.clock);
  return (req, res, next) => {
    let worst = 0;
    for (const key of opts.keys(req)) {
      const r = bucket.take(key);
      if (!r.ok) worst = Math.max(worst, r.retryAfterMs);
    }
    if (worst > 0) {
      const sec = Math.max(1, Math.ceil(worst / 1000));
      res.setHeader("Retry-After", String(sec));
      next(new ApiError(429, `rate limited — retry in ${sec}s`, "RATE_LIMITED"));
      return;
    }
    next();
  };
}

export const ipOf = (req: Request): string => req.ip ?? req.socket.remoteAddress ?? "unknown";
