/**
 * Phase 12 — In-memory IP rate limiter
 * No Redis required. Resets are per rolling window per IP.
 */
import type { Request, Response, NextFunction } from "express";

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

/** Remove stale entries every 5 minutes to prevent memory leak */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store)) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60_000).unref();

/**
 * @param windowMs  Rolling window in ms (e.g. 60_000 = 1 min)
 * @param max       Max requests per window per IP
 */
export function rateLimit(windowMs: number, max: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
    const key = `${ip}:${req.path.split("?")[0]}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }
    entry.count++;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
      return res.status(429).json({
        message: "Too many requests — please slow down.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }
    next();
  };
}

export const limits = {
  /** Search / autocomplete — 120 req/min */
  search: rateLimit(60_000, 120),
  /** Directory list — 60 req/min */
  list: rateLimit(60_000, 60),
  /** CSV export — 10 req/min (expensive query) */
  export: rateLimit(60_000, 10),
  /** Write actions — 20 req/min */
  write: rateLimit(60_000, 20),
};
