/**
 * Tests for lib/rate-limit.ts — checkRateLimit (in-memory fixed window).
 *
 * All tests use unique key prefixes per describe block so that the shared
 * in-memory store doesn't bleed between tests.
 */

import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let keyCounter = 0;
/** Returns a unique key so tests don't share state in the in-memory store. */
function uniqueKey(prefix = "test"): string {
  return `${prefix}:${++keyCounter}:${Math.random().toString(36).slice(2)}`;
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  it("allows the first request (not limited)", () => {
    const key = uniqueKey();
    const { limited, remaining } = checkRateLimit(key, 5, 60_000);

    expect(limited).toBe(false);
    expect(remaining).toBe(4); // 5 - 1 used
  });

  it("remaining decrements with each request", () => {
    const key = uniqueKey();

    checkRateLimit(key, 5, 60_000); // 1st
    const second = checkRateLimit(key, 5, 60_000); // 2nd

    expect(second.limited).toBe(false);
    expect(second.remaining).toBe(3); // 5 - 2
  });

  it("blocks the (limit + 1)th request", () => {
    const key = uniqueKey();
    const limit = 3;

    for (let i = 0; i < limit; i++) {
      const r = checkRateLimit(key, limit, 60_000);
      expect(r.limited).toBe(false);
    }

    // One over the limit
    const over = checkRateLimit(key, limit, 60_000);
    expect(over.limited).toBe(true);
    expect(over.remaining).toBe(0);
  });

  it("returns a resetAt timestamp in the future", () => {
    const key = uniqueKey();
    const before = Date.now();
    const { resetAt } = checkRateLimit(key, 5, 60_000);

    expect(resetAt).toBeGreaterThan(before);
    expect(resetAt).toBeLessThanOrEqual(before + 60_000 + 50); // small clock tolerance
  });

  it("different keys are isolated from each other", () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");

    // Exhaust key A
    for (let i = 0; i <= 3; i++) checkRateLimit(keyA, 3, 60_000);

    // Key B should still be fresh
    const { limited } = checkRateLimit(keyB, 3, 60_000);
    expect(limited).toBe(false);
  });

  it("starts a new window after windowMs has elapsed", async () => {
    const key = uniqueKey();
    const windowMs = 50; // very short window for the test

    // Exhaust the window
    for (let i = 0; i <= 2; i++) checkRateLimit(key, 2, windowMs);
    const blocked = checkRateLimit(key, 2, windowMs);
    expect(blocked.limited).toBe(true);

    // Wait for the window to expire
    await new Promise((r) => setTimeout(r, windowMs + 20));

    // New window — should be allowed again
    const fresh = checkRateLimit(key, 2, windowMs);
    expect(fresh.limited).toBe(false);
    expect(fresh.remaining).toBe(1);
  });

  it("limit=1 allows exactly one request, then blocks", () => {
    const key = uniqueKey();

    const first = checkRateLimit(key, 1, 60_000);
    expect(first.limited).toBe(false);
    expect(first.remaining).toBe(0);

    const second = checkRateLimit(key, 1, 60_000);
    expect(second.limited).toBe(true);
  });

  it("resetAt is the same for all requests within the same window", () => {
    const key = uniqueKey();

    const { resetAt: r1 } = checkRateLimit(key, 10, 60_000);
    const { resetAt: r2 } = checkRateLimit(key, 10, 60_000);

    expect(r1).toBe(r2);
  });
});
