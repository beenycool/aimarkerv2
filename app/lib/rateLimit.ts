import { LRUCache } from 'lru-cache';

const tokenCache = new LRUCache<string, number>({
    max: 500,
    ttl: 60 * 1000, // 1 minute window
});

export function checkRateLimit(identifier: string, limit: number = 10): { success: boolean; limit: number; remaining: number } {
    const currentUsage = tokenCache.get(identifier) || 0;

    if (currentUsage >= limit) {
        return { success: false, limit, remaining: 0 };
    }

    tokenCache.set(identifier, currentUsage + 1);
    return { success: true, limit, remaining: limit - (currentUsage + 1) };
}
