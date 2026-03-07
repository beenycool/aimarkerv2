import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeOpenAIEndpoint } from './urlUtils.js';

test('normalizeOpenAIEndpoint', async (t) => {
    await t.test('should append /chat/completions to base URL', async () => {
        const input = 'http://example.com:11434/v1';
        const expected = 'http://example.com:11434/v1/chat/completions';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should append /chat/completions to base URL with trailing slash', async () => {
        const input = 'http://example.com:11434/v1/';
        const expected = 'http://example.com:11434/v1/chat/completions';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should not append if already present', async () => {
        const input = 'http://example.com:11434/v1/chat/completions';
        const expected = 'http://example.com:11434/v1/chat/completions';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should handle URL with query parameters safely (SSRF protection)', async () => {
        // This is the vulnerability case: query params look like the path suffix
        const input = 'http://example.com/admin?foo=/chat/completions';
        // Should NOT be treated as ending with /chat/completions
        // Path is /admin, so it should append /chat/completions to path
        const expected = 'http://example.com/admin/chat/completions?foo=/chat/completions';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should preserve query parameters in valid URL', async () => {
        const input = 'http://proxy.com/v1?token=123';
        const expected = 'http://proxy.com/v1/chat/completions?token=123';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should handle hash fragments', async () => {
        const input = 'http://example.com:11434/v1#section';
        const expected = 'http://example.com:11434/v1/chat/completions#section';
        assert.strictEqual(await normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should throw on invalid URL', async () => {
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('not-a-url') }, /Invalid URL/);
    });

    await t.test('should throw on empty input', async () => {
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('') }, /Endpoint is required/);
    });

    await t.test('should throw on non-http/https protocols', async () => {
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('ftp://server/resource') }, /Invalid protocol. Only http and https are supported./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('file:///etc/passwd') }, /Invalid protocol. Only http and https are supported./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('data:text/plain,Hello') }, /Invalid protocol. Only http and https are supported./);
    });
});

test('normalizeOpenAIEndpoint SSRF prevention', async (t) => {
    await t.test('should reject private IP networks', async () => {
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('http://192.168.1.1/v1') }, /Resolved IP address is private or reserved./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('http://10.0.0.1/v1') }, /Resolved IP address is private or reserved./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('http://172.16.0.1/v1') }, /Resolved IP address is private or reserved./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('http://127.0.0.1/v1') }, /Resolved IP address is private or reserved./);
        await assert.rejects(async () => { await normalizeOpenAIEndpoint('http://localhost/v1') }, /Resolved IP address is private or reserved./);
    });
});
