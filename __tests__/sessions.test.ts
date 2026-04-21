/**
 * Integration tests for lib/sessions.ts.
 *
 * Covers: extractIp, parseUserAgent (pure functions),
 * listUserSessions (non-expired, isCurrent flag, device info),
 * revokeSession (by hash ID), revokeAllOtherSessions.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import {
  extractIp,
  parseUserAgent,
  listUserSessions,
  revokeSession,
  revokeAllOtherSessions,
} from "@/lib/sessions";
import { createTestUser } from "./helpers/fixtures";
import { createHash } from "crypto";

const TZ = "Europe/Berlin";

/** Derive the 16-char session ID the same way sessions.ts does. */
function sessionIdFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

/** Insert a test session with a future expiry. */
async function createTestSession(
  userId: string,
  token: string,
  overrides: {
    userAgent?: string;
    ipAddress?: string;
    expiresInMs?: number;
  } = {}
) {
  const expires = new Date(Date.now() + (overrides.expiresInMs ?? 3_600_000));
  const [row] = await db
    .insert(sessions)
    .values({
      sessionToken: token,
      userId,
      expires,
      userAgent: overrides.userAgent ?? null,
      ipAddress: overrides.ipAddress ?? null,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    })
    .returning();
  return row;
}

// ─── extractIp ────────────────────────────────────────────────────────────────

describe("extractIp", () => {
  it("prefers x-forwarded-for (first entry)", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(extractIp(h)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "9.10.11.12" });
    expect(extractIp(h)).toBe("9.10.11.12");
  });

  it("returns 'unknown' when no header present", () => {
    expect(extractIp(new Headers())).toBe("unknown");
  });
});

// ─── parseUserAgent ───────────────────────────────────────────────────────────

describe("parseUserAgent", () => {
  it("returns Unknown for null", () => {
    const info = parseUserAgent(null);
    expect(info.browser).toBe("Unknown");
    expect(info.os).toBe("Unknown");
    expect(info.deviceLabel).toBe("Unknown");
  });

  it("detects Chrome on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const info = parseUserAgent(ua);
    expect(info.browser).toBe("Chrome");
    expect(info.os).toBe("Windows");
    expect(info.deviceLabel).toBe("Chrome on Windows");
  });

  it("detects Firefox on Linux", () => {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0";
    const info = parseUserAgent(ua);
    expect(info.browser).toBe("Firefox");
    expect(info.os).toBe("Linux");
  });

  it("detects Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1";
    const info = parseUserAgent(ua);
    expect(info.browser).toBe("Safari");
    expect(info.os).toBe("iOS");
  });

  it("detects Edge over Chrome in the same UA", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
    const info = parseUserAgent(ua);
    expect(info.browser).toBe("Edge");
  });

  it("detects macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    const info = parseUserAgent(ua);
    expect(info.os).toBe("macOS");
  });
});

// ─── listUserSessions ─────────────────────────────────────────────────────────

describe("listUserSessions", () => {
  it("returns non-expired sessions for the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "token-abc-123";
    await createTestSession(user.id, token, {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
    });

    const result = await listUserSessions(user.id, token);
    expect(result).toHaveLength(1);
    expect(result[0].browser).toBe("Chrome");
  });

  it("marks the caller's session as isCurrent=true", async () => {
    const user = await createTestUser({ timezone: TZ });
    const myToken = "my-session-token";
    const otherToken = "other-session-token";
    await createTestSession(user.id, myToken);
    await createTestSession(user.id, otherToken);

    const result = await listUserSessions(user.id, myToken);
    const mine = result.find((s) => s.isCurrent);
    expect(mine).toBeDefined();
    expect(mine!.id).toBe(sessionIdFromToken(myToken));
  });

  it("excludes expired sessions", async () => {
    const user = await createTestUser({ timezone: TZ });
    const expiredToken = "expired-token";
    await createTestSession(user.id, expiredToken, { expiresInMs: -1000 }); // already expired

    const result = await listUserSessions(user.id, "fresh-token");
    expect(result.every((s) => s.id !== sessionIdFromToken(expiredToken))).toBe(true);
  });

  it("isolates sessions by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestSession(userA.id, "token-for-a");

    const result = await listUserSessions(userB.id, "token-for-b");
    expect(result).toHaveLength(0);
  });
});

// ─── revokeSession ────────────────────────────────────────────────────────────

describe("revokeSession", () => {
  it("deletes the session and returns true", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "revoke-me-token";
    await createTestSession(user.id, token);

    const sessionId = sessionIdFromToken(token);
    const result = await revokeSession(user.id, sessionId);
    expect(result).toBe(true);

    const remaining = await listUserSessions(user.id, "other-token");
    expect(remaining.find((s) => s.id === sessionId)).toBeUndefined();
  });

  it("returns false when session ID does not match any session", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await revokeSession(user.id, "0000000000000000");
    expect(result).toBe(false);
  });

  it("cannot revoke another user's session", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const token = "token-for-a";
    await createTestSession(userA.id, token);

    // revokeSession with userB's ID should not find the session
    const result = await revokeSession(userB.id, sessionIdFromToken(token));
    expect(result).toBe(false);
  });
});

// ─── revokeAllOtherSessions ───────────────────────────────────────────────────

describe("revokeAllOtherSessions", () => {
  it("deletes all sessions except the current one", async () => {
    const user = await createTestUser({ timezone: TZ });
    const keepToken = "keep-this-token";
    const deleteToken1 = "delete-token-1";
    const deleteToken2 = "delete-token-2";
    await createTestSession(user.id, keepToken);
    await createTestSession(user.id, deleteToken1);
    await createTestSession(user.id, deleteToken2);

    const count = await revokeAllOtherSessions(user.id, keepToken);
    expect(count).toBe(2);

    const remaining = await listUserSessions(user.id, keepToken);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isCurrent).toBe(true);
  });

  it("returns 0 when there are no other sessions", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "only-session";
    await createTestSession(user.id, token);

    const count = await revokeAllOtherSessions(user.id, token);
    expect(count).toBe(0);
  });
});
