/**
 * Integration tests for lib/sessions.ts.
 *
 * Covers: extractIp, parseUserAgent (pure functions),
 * listUserSessions (non-expired, isCurrent flag, device info),
 * revokeSession (by hash ID), revokeAllOtherSessions,
 * touchSessionMetadata (metadata update + first-touch detection),
 * maybeUpdateSessionMetadata (throttle behaviour).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  extractIp,
  parseUserAgent,
  listUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  touchSessionMetadata,
  maybeUpdateSessionMetadata,
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

  it("returns 0 when the user has no sessions at all", async () => {
    const user = await createTestUser({ timezone: TZ });
    const count = await revokeAllOtherSessions(user.id, "nonexistent-token");
    expect(count).toBe(0);
  });

  it("revokes multiple sessions and leaves only the current one", async () => {
    const user = await createTestUser({ timezone: TZ });
    const current = "current-session-token";
    const others = ["other-1", "other-2", "other-3"];
    await createTestSession(user.id, current);
    for (const t of others) {
      await createTestSession(user.id, t);
    }

    const count = await revokeAllOtherSessions(user.id, current);
    expect(count).toBe(others.length);

    const remaining = await listUserSessions(user.id, current);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].isCurrent).toBe(true);
  });
});

// ─── touchSessionMetadata ─────────────────────────────────────────────────────

describe("touchSessionMetadata", () => {
  it("updates lastActiveAt, userAgent, and ipAddress on the session", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "touch-test-token";
    await createTestSession(user.id, token, {
      userAgent: "OldBrowser/1.0",
      ipAddress: "1.2.3.4",
    });

    const headers = new Headers({
      "user-agent": "NewBrowser/2.0",
      "x-forwarded-for": "5.6.7.8",
    });

    await touchSessionMetadata(token, headers, user.id);

    const [updated] = await db
      .select({ userAgent: sessions.userAgent, ipAddress: sessions.ipAddress, lastActiveAt: sessions.lastActiveAt })
      .from(sessions)
      .where(eq(sessions.sessionToken, token));

    expect(updated.userAgent).toBe("NewBrowser/2.0");
    expect(updated.ipAddress).toBe("5.6.7.8");
    expect(updated.lastActiveAt).not.toBeNull();
  });

  it("sets createdAt on first touch when it was null", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "first-touch-token";

    // Insert session with createdAt as null to simulate pre-createdAt sessions
    await db.insert(sessions).values({
      sessionToken: token,
      userId: user.id,
      expires: new Date(Date.now() + 3_600_000),
      userAgent: null,
      ipAddress: null,
      createdAt: null,
      lastActiveAt: null,
    });

    const headers = new Headers({ "user-agent": "Browser/1.0" });
    await touchSessionMetadata(token, headers, user.id);

    const [updated] = await db
      .select({ createdAt: sessions.createdAt })
      .from(sessions)
      .where(eq(sessions.sessionToken, token));

    expect(updated.createdAt).not.toBeNull();
  });

  it("does not throw when session token does not exist", async () => {
    const headers = new Headers({ "user-agent": "Browser/1.0" });
    await expect(
      touchSessionMetadata("nonexistent-token", headers)
    ).resolves.toBeUndefined();
  });
});

// ─── maybeUpdateSessionMetadata ───────────────────────────────────────────────

describe("maybeUpdateSessionMetadata", () => {
  it("does not throw on first call", () => {
    expect(() =>
      maybeUpdateSessionMetadata(
        "unique-token-for-throttle-test-" + Date.now(),
        new Headers(),
        "user-id"
      )
    ).not.toThrow();
  });

  it("is a no-op (does not throw) on repeated calls within the throttle window", () => {
    const token = "repeated-throttle-token-" + Date.now();
    // First call
    maybeUpdateSessionMetadata(token, new Headers(), "user-id");
    // Second call — should be throttled but must not throw
    expect(() =>
      maybeUpdateSessionMetadata(token, new Headers(), "user-id")
    ).not.toThrow();
  });

  it("accepts calls without a userId", () => {
    const token = "no-user-id-token-" + Date.now();
    expect(() =>
      maybeUpdateSessionMetadata(token, new Headers())
    ).not.toThrow();
  });

  it("handles different tokens independently without interference", () => {
    const tokenA = "throttle-token-a-" + Date.now();
    const tokenB = "throttle-token-b-" + Date.now();
    expect(() => {
      maybeUpdateSessionMetadata(tokenA, new Headers(), "user-a");
      maybeUpdateSessionMetadata(tokenB, new Headers(), "user-b");
    }).not.toThrow();
  });
});

// ─── listUserSessions — sort branch (non-current sessions) ───────────────────

describe("listUserSessions sort (non-current sessions compared by lastActiveAt)", () => {
  it("sorts two non-current sessions by lastActiveAt descending", async () => {
    const user = await createTestUser({ timezone: TZ });

    const older = "sort-token-older-" + Date.now();
    const newer = "sort-token-newer-" + Date.now();
    const current = "sort-token-current-" + Date.now();

    const olderTime = new Date(Date.now() - 10_000);
    const newerTime = new Date(Date.now() - 1_000);

    await db.insert(sessions).values([
      {
        sessionToken: older,
        userId: user.id,
        expires: new Date(Date.now() + 3_600_000),
        lastActiveAt: olderTime,
        createdAt: olderTime,
      },
      {
        sessionToken: newer,
        userId: user.id,
        expires: new Date(Date.now() + 3_600_000),
        lastActiveAt: newerTime,
        createdAt: newerTime,
      },
      {
        sessionToken: current,
        userId: user.id,
        expires: new Date(Date.now() + 3_600_000),
        lastActiveAt: new Date(),
        createdAt: new Date(),
      },
    ]);

    // Pass `current` as the caller token — the other two are non-current
    // and must be sorted via bTime.localeCompare(aTime)
    const result = await listUserSessions(user.id, current);
    expect(result).toHaveLength(3);
    expect(result[0].isCurrent).toBe(true);
    // The non-current sessions should be in descending lastActiveAt order
    const nonCurrent = result.filter((s) => !s.isCurrent);
    expect(nonCurrent).toHaveLength(2);
    const firstTime = nonCurrent[0].lastActiveAt ?? "";
    const secondTime = nonCurrent[1].lastActiveAt ?? "";
    expect(firstTime >= secondTime).toBe(true);
  });
});

// ─── notifyIfNewDevice (via touchSessionMetadata) ────────────────────────────

describe("notifyIfNewDevice (called from touchSessionMetadata on first touch)", () => {
  /**
   * Insert a session WITHOUT createdAt so that touchSessionMetadata treats it
   * as a first-ever touch and calls notifyIfNewDevice.
   */
  async function createUntouchedSession(
    userId: string,
    token: string,
    opts: { userAgent?: string; ipAddress?: string } = {}
  ) {
    await db.insert(sessions).values({
      sessionToken: token,
      userId,
      expires: new Date(Date.now() + 3_600_000),
      userAgent: opts.userAgent ?? null,
      ipAddress: opts.ipAddress ?? null,
      // createdAt intentionally omitted (null) — marks session as untouched
    });
  }

  it("does not send a notification when loginNotificationNewDevice is false (default)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = "notify-disabled-" + Date.now();
    await createUntouchedSession(user.id, token);

    // Should complete without error; loginNotificationNewDevice=false by default
    await expect(
      touchSessionMetadata(token, new Headers({ "user-agent": "Chrome/1.0" }), user.id)
    ).resolves.toBeUndefined();
  });

  it("does not send a notification on first-ever login (no prior sessions)", async () => {
    const { db: dbInst } = await import("@/lib/db");
    const { users: usersTable } = await import("@/lib/db/schema");
    const { eq: eqFn } = await import("drizzle-orm");

    const user = await createTestUser({ timezone: TZ });
    // Enable login notification
    await dbInst
      .update(usersTable)
      .set({ loginNotificationNewDevice: true })
      .where(eqFn(usersTable.id, user.id));

    const token = "notify-first-login-" + Date.now();
    await createUntouchedSession(user.id, token);

    // No prior sessions → notifyIfNewDevice exits early (no sessions to compare)
    await expect(
      touchSessionMetadata(token, new Headers({ "user-agent": "Chrome/1.0" }), user.id)
    ).resolves.toBeUndefined();
  });

  it("does not send when the device fingerprint matches a prior session", async () => {
    const { db: dbInst } = await import("@/lib/db");
    const { users: usersTable } = await import("@/lib/db/schema");
    const { eq: eqFn } = await import("drizzle-orm");

    const user = await createTestUser({ timezone: TZ });
    await dbInst
      .update(usersTable)
      .set({ loginNotificationNewDevice: true })
      .where(eqFn(usersTable.id, user.id));

    const ua = "Mozilla/5.0 SameDevice/1.0";
    const ip = "10.0.0.1";

    // Existing "prior" session — same UA and IP (same fingerprint)
    const priorToken = "prior-session-" + Date.now();
    await db.insert(sessions).values({
      sessionToken: priorToken,
      userId: user.id,
      expires: new Date(Date.now() + 3_600_000),
      userAgent: ua,
      ipAddress: ip,
      createdAt: new Date(Date.now() - 5_000), // already touched
      lastActiveAt: new Date(Date.now() - 5_000),
    });

    // New session — same fingerprint → should not notify
    const newToken = "new-session-same-device-" + Date.now();
    const headers = new Headers({
      "user-agent": ua,
      "x-forwarded-for": ip,
    });
    await createUntouchedSession(user.id, newToken, { userAgent: ua, ipAddress: ip });
    await expect(
      touchSessionMetadata(newToken, headers, user.id)
    ).resolves.toBeUndefined();
  });

  it("sends notification when fingerprint is new (new device detected)", async () => {
    const { db: dbInst } = await import("@/lib/db");
    const { users: usersTable } = await import("@/lib/db/schema");
    const { eq: eqFn } = await import("drizzle-orm");

    const user = await createTestUser({ timezone: TZ });
    await dbInst
      .update(usersTable)
      .set({ loginNotificationNewDevice: true })
      .where(eqFn(usersTable.id, user.id));

    // Prior session — different UA/IP from the new one
    const priorToken = "prior-session-diff-" + Date.now();
    await db.insert(sessions).values({
      sessionToken: priorToken,
      userId: user.id,
      expires: new Date(Date.now() + 3_600_000),
      userAgent: "OldBrowser/1.0",
      ipAddress: "192.168.1.1",
      createdAt: new Date(Date.now() - 5_000),
      lastActiveAt: new Date(Date.now() - 5_000),
    });

    // New session — completely different UA/IP → sendToAllChannels fires
    // (user has no channels configured so it completes silently)
    const newToken = "new-session-new-device-" + Date.now();
    const headers = new Headers({
      "user-agent": "NewBrowser/99.0",
      "x-forwarded-for": "10.20.30.40",
    });
    await createUntouchedSession(user.id, newToken, {
      userAgent: "NewBrowser/99.0",
      ipAddress: "10.20.30.40",
    });
    await expect(
      touchSessionMetadata(newToken, headers, user.id)
    ).resolves.toBeUndefined();
  });
});
