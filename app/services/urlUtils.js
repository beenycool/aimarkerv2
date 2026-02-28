/**
 * Normalizes an OpenAI-compatible endpoint URL.
 * Ensures the URL is valid, uses http/https protocols, and the path ends with /chat/completions.
 * This prevents SSRF attacks where a user might provide a URL like
 * 'http://internal/admin?foo=/chat/completions' which would bypass simple string checks,
 * or use alternative schemes like 'file://' or 'ftp://'.
 *
 * @param {string} endpoint - The endpoint URL to normalize.
 * @returns {string} The normalized URL string.
 * @throws {Error} If the endpoint is not a valid URL or uses an unsupported protocol.
 */
export function normalizeOpenAIEndpoint(endpoint) {
    if (!endpoint) {
        throw new Error("Endpoint is required");
    }

    let urlObj;
    try {
        urlObj = new URL(endpoint);
    } catch (e) {
        throw new Error("Invalid URL format");
    }

    // Ensure the protocol is HTTP or HTTPS to prevent SSRF via other schemes
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw new Error("Invalid protocol. Only http and https are supported.");
    }

    // Normalize pathname: ensure it ends with /chat/completions
    // We check pathname specifically to avoid query parameter bypasses
    let pathname = urlObj.pathname;

    // Remove trailing slashes for consistent checking
    // e.g., /v1/ -> /v1
    pathname = pathname.replace(/\/+$/, '');

    if (!pathname.endsWith('/chat/completions')) {
        pathname += '/chat/completions';
    }

    urlObj.pathname = pathname;

    return urlObj.toString();
}
