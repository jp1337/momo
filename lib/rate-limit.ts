/**
 * Simple in-memory rate limiter using a sliding window.
 *
 * Resets automatically per window — suitable for single-instance deployments.
 *
 * IMPORTANT: This is an in-memory store. In a multi-replica deployment (e.g. Kubernetes
 * with replicas > 1), each pod has its own store, so the effective limit is multiplied
 * by the number of replicas. For true multi-replica rate limiting, replace this
 * with a Redis-based implementation (e.g. using ioredis + a sliding window Lua script).
 */

/** Internal per-key rate limit state */
interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number;
  /** Unix timestamp (ms) at which the current window expires */
  resetAt: number;
}

/** In-memory store keyed by arbitrary string (e.g. "tasks-create:<userId>") */
const store = new Map<string, RateLimitEntry>();

/**
 * Checks if a request should be rate limited using a fixed window algorithm.
 *
 * If the key is new or its window has expired, a fresh window is started.
 * Otherwise the counter is incremented and checked against the limit.
 *
 * @param key - Unique key for the rate limit bucket (e.g. `"tasks-create:${userId}"`)
 * @param limit - Maximum number of requests allowed per window
 * @param windowMs - Window duration in milliseconds (e.g. `60_000` for 1 minute)
 * @returns An object with:
 *   - `limited`: `true` if the request exceeds the limit
 *   - `remaining`: number of requests remaining in this window (0 if limited)
 *   - `resetAt`: Unix timestamp (ms) when the window resets
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Start a fresh window
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { limited: false, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Returns a standardised 429 Too Many Requests response.
 * Includes a `Retry-After` header with the number of seconds until the window resets.
 *
 * @param resetAt - Unix timestamp (ms) when the rate limit window resets
 * @returns A `Response` with status 429 and appropriate headers
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { error: "Too many requests", code: "RATE_LIMITED" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(retryAfterSeconds, 1)),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
