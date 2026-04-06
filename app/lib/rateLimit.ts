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

if (upstashRedis) {
    console.info('[rateLimit] Upstash Redis rate limiting enabled');
} else {
    console.info('[rateLimit] Using in-memory rate limiting (no Upstash config)');
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(namespace: string, limit: number): Ratelimit | null {
    if (!upstashRedis) return null;
    const key = `${namespace}:${limit}`;
    let lim = upstashLimiters.get(key);
    if (!lim) {
        const safeNs = namespace.replace(/[^a-zA-Z0-9_-]/g, '_');
        lim = new Ratelimit({
            redis: upstashRedis,
            limiter: Ratelimit.slidingWindow(limit, '60 s'),
            prefix: `aimarker-rl:${safeNs}`,
        });
        upstashLimiters.set(key, lim);
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
    limit: number = 10,
    namespace: string = 'global'
): Promise<{ success: boolean; limit: number; remaining: number }> {
    const lim = getUpstashLimiter(namespace, limit);
    if (lim) {
        const res = await lim.limit(identifier);
        return { success: res.success, limit, remaining: res.remaining };
    }
    const namespacedId = `${namespace}:${identifier}`;
    return checkRateLimitInMemory(namespacedId, limit);
}
