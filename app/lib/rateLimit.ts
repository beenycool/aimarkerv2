type RateLimitEntry = {
    count: number;
    expiresAt: number;
};

const WINDOW_MS = 60_000;
const MAX_KEYS = 500;
const tokenCache = new Map<string, RateLimitEntry>();

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

export function checkRateLimit(identifier: string, limit: number = 10): { success: boolean; limit: number; remaining: number } {
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
