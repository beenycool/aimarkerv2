import dns from 'dns/promises';

/**
 * Checks if an IP address is a private, loopback, or reserved address.
 * Covers IPv4 and IPv6.
 *
 * @param {string} ip - The IP address to check.
 * @returns {boolean} True if the IP is private/reserved, false otherwise.
 */
function isPrivateIP(ip) {
    // IPv4 checks
    if (ip.includes('.')) {
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4) return true; // Malformed IPv4

        // 0.0.0.0/8
        if (parts[0] === 0) return true;
        // 10.0.0.0/8 (Private network)
        if (parts[0] === 10) return true;
        // 127.0.0.0/8 (Loopback)
        if (parts[0] === 127) return true;
        // 169.254.0.0/16 (Link-local)
        if (parts[0] === 169 && parts[1] === 254) return true;
        // 172.16.0.0/12 (Private network)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16 (Private network)
        if (parts[0] === 192 && parts[1] === 168) return true;

        return false;
    }

    // IPv6 checks
    // ::1/128 (Loopback)
    if (ip === '::1') return true;
    // fc00::/7 (Unique local address)
    if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
    // fe80::/10 (Link-local)
    if (ip.toLowerCase().startsWith('fe8') || ip.toLowerCase().startsWith('fe9') || ip.toLowerCase().startsWith('fea') || ip.toLowerCase().startsWith('feb')) return true;

    // IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
    if (ip.toLowerCase().startsWith('::ffff:')) {
        return isPrivateIP(ip.substring(7));
    }

    return false;
}

/**
 * Normalizes an OpenAI-compatible endpoint URL.
 * Ensures the URL is valid, uses http/https protocols, and the path ends with /chat/completions.
 * Resolves the hostname to prevent SSRF attacks against private networks or loopback addresses.
 *
 * @param {string} endpoint - The endpoint URL to normalize.
 * @returns {Promise<string>} The normalized URL string.
 * @throws {Error} If the endpoint is not a valid URL, uses an unsupported protocol, or resolves to a private IP.
 */
export async function normalizeOpenAIEndpoint(endpoint) {
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

    // Prevent SSRF: Resolve hostname and ensure it's not a private IP
    let lookupResult;
    try {
        // First, try to resolve the hostname.
        lookupResult = await dns.lookup(urlObj.hostname);
    } catch (e) {
        // Any error here is a DNS resolution failure.
        throw new Error("Could not resolve hostname or invalid hostname.");
    }

    // After successful resolution, check if the IP is private.
    if (isPrivateIP(lookupResult.address)) {
        throw new Error("Resolved IP address is private or reserved.");
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