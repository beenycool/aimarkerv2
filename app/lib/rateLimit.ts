import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitEntry = {
    count: number;
    expiresAt: number;
};

const WINDOW_MS = 60_000;
const MAX_KEYS = 500;
const tokenCache = new Map<string, RateLimitEntry>();

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const upstashRedis =
    upstashUrl && upstashToken ? new Redis({ url: upstashUrl, token: upstashToken }) : null;

const upstashLimiters = new Map<number, Ratelimit>();

function getUpstashLimiter(limit: number): Ratelimit | null {
    if (!upstashRedis) return null;
    let lim = upstashLimiters.get(limit);
    if (!lim) {
        lim = new Ratelimit({
            redis: upstashRedis,
            limiter: Ratelimit.slidingWindow(limit, '60 s'),
            prefix: 'aimarker-rl',
        });
        upstashLimiters.set(limit, lim);
    }
    return lim;
}

function pruneExpiredEntries(now: number) {
    for (const [key, value] of tokenCache.entries()) {
        if (value.expiresAt <= now) {
            tokenCache.delete(key);
        }
    }

    if (tokenCache.size <= MAX_KEYS) {
        return;
    }

    const overflow = tokenCache.size - MAX_KEYS;
    let removed = 0;
    for (const key of tokenCache.keys()) {
        tokenCache.delete(key);
        removed += 1;
        if (removed >= overflow) {
            break;
        }
    }
}

function checkRateLimitInMemory(identifier: string, limit: number): { success: boolean; limit: number; remaining: number } {
    const now = Date.now();
    pruneExpiredEntries(now);

    const existingEntry = tokenCache.get(identifier);

    if (!existingEntry || existingEntry.expiresAt <= now) {
        tokenCache.set(identifier, { count: 1, expiresAt: now + WINDOW_MS });
        return { success: true, limit, remaining: Math.max(limit - 1, 0) };
    }

    if (existingEntry.count >= limit) {
        return { success: false, limit, remaining: 0 };
    }

    const nextCount = existingEntry.count + 1;
    tokenCache.set(identifier, { ...existingEntry, count: nextCount });
    return { success: true, limit, remaining: Math.max(limit - nextCount, 0) };
}

/**
 * Distributed rate limit when `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set
 * (recommended for Vercel/serverless). Otherwise falls back to per-isolate in-memory limiting.
 */
export async function checkRateLimit(
    identifier: string,
    limit: number = 10
): Promise<{ success: boolean; limit: number; remaining: number }> {
    const lim = getUpstashLimiter(limit);
    if (lim) {
        const res = await lim.limit(identifier);
        return { success: res.success, limit, remaining: res.remaining };
    }
    return checkRateLimitInMemory(identifier, limit);
}
