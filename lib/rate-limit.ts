/**
 * Simple in-memory rate limiter using a fixed window algorithm.
 *
 * Resets automatically per window — suitable for single-instance deployments.
 *
 * NOTE: This is an in-memory store. In multi-replica deployments (e.g. Kubernetes
 * with replicas > 1), each pod enforces limits independently. For strict
 * cross-replica rate limiting, replace with a Redis-backed implementation.
 */

/** Internal per-key rate limit state */
interface RateLimitEntry {
  /** Number of requests made in the current window */
  count: number;
  /** Unix timestamp (ms) at which the current window expires */
  resetAt: number;
}

import { NextResponse } from "next/server";

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

  // Prune expired entries after every update to prevent unbounded map growth
  const now2 = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt <= now2) store.delete(k);
  }

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
 * @returns A `NextResponse` with status 429 and appropriate headers
 */
export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
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
