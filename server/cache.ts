/**
 * Phase 9 — In-memory TTL cache
 * Lightweight Map-based cache. No external deps. GC via setTimeout.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    // auto-evict after TTL
    setTimeout(() => this.store.delete(key), ttlMs).unref();
  }

  invalidate(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new TtlCache();

export const TTL = {
  SUGGEST: 30_000,          // 30 s  — autocomplete suggestions
  STATS: 60 * 60_000,       // 1 hr  — directory stats (rarely change)
  VIEW_DEBOUNCE: 30 * 60_000, // 30 min — per-IP view dedup window
} as const;
