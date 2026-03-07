import { searchWeb, clearSearchCache, getSearchCacheSize } from './AIService';

// Mock dependencies
jest.mock('./studentOS', () => ({
    getOrCreateSettings: jest.fn(),
    DEFAULT_AI_PREFERENCES: {}
}));

jest.mock('./memoryService', () => ({
    getMemoryContextForAI: jest.fn()
}));

jest.mock('./supabaseClient', () => ({
    supabase: {}
}));

// Mock fetch
global.fetch = jest.fn();

describe('AIService Search Cache', () => {
    beforeEach(() => {
        clearSearchCache();
        jest.clearAllMocks();
    });

    it('should cache search results', async () => {
        // Setup mock response
        const mockResponse = { results: [{ title: 'Test', url: 'http://test.com', description: 'Test result' }] };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        // First call - should hit API
        const result1 = await searchWeb('query1', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result1.results).toHaveLength(1);
        expect(getSearchCacheSize()).toBe(1);

        // Second call - should hit cache
        const result2 = await searchWeb('query1', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(1); // Call count should remain 1
        expect(result2.results).toHaveLength(1);
        expect(getSearchCacheSize()).toBe(1);
    });

    it('should enforce MAX_SEARCH_CACHE_SIZE (LRU)', async () => {
        // Mock fetch to always return success
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] })
        });

        const MAX_SIZE = 50;

        // Fill cache to limit
        for (let i = 0; i < MAX_SIZE; i++) {
            await searchWeb(`query${i}`, { strategy: 'hackclub' });
        }
        expect(getSearchCacheSize()).toBe(MAX_SIZE);

        // Add one more
        await searchWeb(`query${MAX_SIZE}`, { strategy: 'hackclub' });

        // Size should still be MAX_SIZE
        expect(getSearchCacheSize()).toBe(MAX_SIZE);

        // Verify eviction (query0 should be gone if it was inserted first and never touched)
        // Access query0 again - should trigger new fetch
        global.fetch.mockClear();
        await searchWeb('query0', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh LRU position on access', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] })
        });

        const MAX_SIZE = 50;

        // Fill cache
        for (let i = 0; i < MAX_SIZE; i++) {
            await searchWeb(`query${i}`, { strategy: 'hackclub' });
        }

        // Access query0 (the oldest) to make it fresh
        await searchWeb('query0', { strategy: 'hackclub' });

        // Add new item
        await searchWeb('queryNew', { strategy: 'hackclub' });

        // Size should be MAX_SIZE
        expect(getSearchCacheSize()).toBe(MAX_SIZE);

        // query1 should be the one evicted now (since query0 was refreshed)
        // Check if query1 triggers fetch
        global.fetch.mockClear();
        await searchWeb('query1', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Check if query0 is still cached
        global.fetch.mockClear();
        await searchWeb('query0', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(0);
    });

    it('should evict expired items on access', async () => {
        jest.useFakeTimers();
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] })
        });

        // First call to cache the item
        await searchWeb('query-ttl', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(getSearchCacheSize()).toBe(1);

        // Advance time past the TTL (1 hour)
        const SEARCH_CACHE_TTL = 60 * 60 * 1000;
        jest.advanceTimersByTime(SEARCH_CACHE_TTL + 1);

        // Second call should miss the cache due to expiration and re-fetch
        await searchWeb('query-ttl', { strategy: 'hackclub' });
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(getSearchCacheSize()).toBe(1);

        jest.useRealTimers();
    });
});
