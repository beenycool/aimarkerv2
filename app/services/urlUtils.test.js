import { test } from 'node:test';
import assert from 'node:assert';
import { normalizeOpenAIEndpoint } from './urlUtils.js';

test('normalizeOpenAIEndpoint', async (t) => {
    await t.test('should append /chat/completions to base URL', () => {
        const input = 'http://localhost:11434/v1';
        const expected = 'http://localhost:11434/v1/chat/completions';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should append /chat/completions to base URL with trailing slash', () => {
        const input = 'http://localhost:11434/v1/';
        const expected = 'http://localhost:11434/v1/chat/completions';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should not append if already present', () => {
        const input = 'http://localhost:11434/v1/chat/completions';
        const expected = 'http://localhost:11434/v1/chat/completions';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should handle URL with query parameters safely (SSRF protection)', () => {
        // This is the vulnerability case: query params look like the path suffix
        const input = 'http://internal/admin?foo=/chat/completions';
        // Should NOT be treated as ending with /chat/completions
        // Path is /admin, so it should append /chat/completions to path
        const expected = 'http://internal/admin/chat/completions?foo=/chat/completions';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should preserve query parameters in valid URL', () => {
        const input = 'http://proxy.com/v1?token=123';
        const expected = 'http://proxy.com/v1/chat/completions?token=123';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should handle hash fragments', () => {
        const input = 'http://localhost:11434/v1#section';
        const expected = 'http://localhost:11434/v1/chat/completions#section';
        assert.strictEqual(normalizeOpenAIEndpoint(input), expected);
    });

    await t.test('should throw on invalid URL', () => {
        assert.throws(() => normalizeOpenAIEndpoint('not-a-url'), /Invalid URL/);
    });

    await t.test('should throw on empty input', () => {
        assert.throws(() => normalizeOpenAIEndpoint(''), /Endpoint is required/);
    });

    await t.test('should throw on non-http/https protocols', () => {
        assert.throws(() => normalizeOpenAIEndpoint('ftp://server/resource'), /Invalid protocol. Only http and https are supported./);
        assert.throws(() => normalizeOpenAIEndpoint('file:///etc/passwd'), /Invalid protocol. Only http and https are supported./);
        assert.throws(() => normalizeOpenAIEndpoint('data:text/plain,Hello'), /Invalid protocol. Only http and https are supported./);
    });
});
