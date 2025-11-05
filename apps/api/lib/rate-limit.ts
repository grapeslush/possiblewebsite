interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface Bucket {
  count: number;
  expiresAt: number;
}

class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async consume(key: string, options: RateLimitOptions) {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + options.windowMs });
      return true;
    }

    if (existing.count >= options.max) {
      return false;
    }

    existing.count += 1;
    this.buckets.set(key, existing);
    return true;
  }
}

export const rateLimiter = new MemoryRateLimiter();
