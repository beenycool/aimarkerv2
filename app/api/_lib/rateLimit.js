/**
 * Very small in-memory rate limiter.
 *
 * Notes:
 * - Works best for a single Node process.
 * - In serverless (multiple instances) this becomes "best effort".
 * - Good enough to prevent accidental UI loops and opportunistic abuse.
 */

const buckets = new Map();

// Periodically prune stale bucket entries to prevent unbounded growth in long-running processes.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets.entries()) {
    const fresh = timestamps.filter((t) => now - t < 60 * 60 * 1000); // drop entries inactive for >1h
    if (fresh.length === 0) {
      buckets.delete(key);
    } else if (fresh.length !== timestamps.length) {
      buckets.set(key, fresh);
    }
  }
}, CLEANUP_INTERVAL_MS).unref();

export function getClientIp(request) {
  // Common proxy headers on Vercel / Cloudflare / Nginx
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();

  return 'unknown';
}

export function rateLimit(
  request,
  {
    keyPrefix = 'rl',
    limit = 30,
    windowMs = 60_000,
  } = {}
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;

  const entry = buckets.get(key) || [];
  const fresh = entry.filter((t) => now - t < windowMs);
  fresh.push(now);
  buckets.set(key, fresh);

  const remaining = Math.max(0, limit - fresh.length);
  const ok = fresh.length <= limit;

  return { ok, remaining, limit, windowMs, key };
}
