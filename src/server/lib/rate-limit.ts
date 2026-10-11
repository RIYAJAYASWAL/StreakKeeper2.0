import { TooManyRequestsError } from '@/server/lib/api';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private hits: Map<string, number[]> = new Map();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.hits.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const earliest = timestamps[0] ?? now;
      return {
        success: false,
        limit,
        remaining: 0,
        resetAt: earliest + windowMs,
      };
    }

    timestamps.push(now);
    this.hits.set(key, timestamps);

    return {
      success: true,
      limit,
      remaining: limit - timestamps.length,
      resetAt: now + windowMs,
    };
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }
}

export const authRateLimiter = new InMemoryRateLimiter();
export const apiRateLimiter = new InMemoryRateLimiter();

/**
 * Route-specific rate limit configurations: (limit requests, windowMs)
 */
export const ROUTE_RATE_LIMITS = {
  AUTH: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 min
  AI_INSIGHTS: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  CHECKINS: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
  HABITS: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
  FREEZES: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
  JOURNALS: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
  SOCIAL: { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
  STANDARD: { limit: 120, windowMs: 60 * 1000 }, // 120 per minute
};

/**
 * Throws TooManyRequestsError if rate limit is exceeded.
 */
export async function assertRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  limiter: RateLimiter = apiRateLimiter
): Promise<RateLimitResult> {
  const result = await limiter.check(key, limit, windowMs);
  if (!result.success) {
    throw new TooManyRequestsError(
      `Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)}s.`,
      'RATE_LIMIT_EXCEEDED'
    );
  }
  return result;
}
