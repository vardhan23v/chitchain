import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [ip: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 120 reqs/min

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!store[ip] || now > store[ip].resetAt) {
    store[ip] = { count: 1, resetAt: now + WINDOW_MS };
    return next();
  }

  store[ip].count++;

  if (store[ip].count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again in a minute.',
      retryAfter: Math.ceil((store[ip].resetAt - now) / 1000),
    });
  }

  next();
}
