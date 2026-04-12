/**
 * Active session management — business logic.
 *
 * Lists, revokes, and maintains metadata on Auth.js database sessions.
 * Session tokens are never exposed to the client — a truncated SHA-256
 * hash serves as the public identifier for each session.
 *
 * @module lib/sessions
 */

import { createHash } from "crypto";
import { and, eq, gt, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { sendToAllChannels } from "@/lib/notifications";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Parsed user-agent information */
export interface DeviceInfo {
  browser: string;
  os: string;
  /** Human-friendly label, e.g. "Chrome on Windows" */
  deviceLabel: string;
}

/** Sanitised session summary sent to the client */
export interface SessionSummary {
  /** Truncated SHA-256 hash of the session token (16 hex chars) */
  id: string;
  /** Whether this is the caller's own session */
  isCurrent: boolean;
  browser: string;
  os: string;
  deviceLabel: string;
  ipAddress: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Derives a 16-char hex identifier from a raw session token.
 * The truncation is safe for per-user disambiguation (collision-free
 * across the handful of sessions a single user has).
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16);
}

/**
 * Extracts the client IP from request headers.
 * Checks `x-forwarded-for` (first entry) → `x-real-ip` → "unknown".
 *
 * @param headers - The incoming request's Headers object
 * @returns The best-guess client IP string
 */
export function extractIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

// ── User-Agent Parsing ─────────────────────────────────────────────────────────

/**
 * Parses a raw User-Agent string into a simplified browser + OS label.
 * No external dependency — simple regex matching covers the major browsers
 * and platforms. Returns "Unknown" for unrecognised parts.
 *
 * @param ua - Raw User-Agent header value (may be null)
 * @returns Parsed device information
 */
export function parseUserAgent(ua: string | null): DeviceInfo {
  if (!ua) return { browser: "Unknown", os: "Unknown", deviceLabel: "Unknown" };

  // ── Browser detection (order matters — Edge/Opera before Chrome) ──
  let browser = "Unknown";
  if (/Edg(e|A)?\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera\//.test(ua)) browser = "Opera";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/CriOS\//.test(ua)) browser = "Chrome"; // Chrome on iOS
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  // ── OS detection ──
  let os = "Unknown";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/CrOS/.test(ua)) os = "Chrome OS";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";

  const deviceLabel =
    browser !== "Unknown" && os !== "Unknown"
      ? `${browser} on ${os}`
      : browser !== "Unknown"
        ? browser
        : os !== "Unknown"
          ? os
          : "Unknown";

  return { browser, os, deviceLabel };
}

// ── Session Listing ────────────────────────────────────────────────────────────

/**
 * Returns all non-expired sessions for a user, with device info and
 * an `isCurrent` flag for the caller's own session.
 *
 * @param userId - The user's UUID
 * @param currentSessionToken - The raw session token of the caller
 * @returns Array of sanitised session summaries, newest first
 */
export async function listUserSessions(
  userId: string,
  currentSessionToken: string
): Promise<SessionSummary[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), gt(sessions.expires, new Date()))
    );

  const currentHash = hashToken(currentSessionToken);

  return rows
    .map((row) => {
      const id = hashToken(row.sessionToken);
      const device = parseUserAgent(row.userAgent ?? null);
      return {
        id,
        isCurrent: id === currentHash,
        browser: device.browser,
        os: device.os,
        deviceLabel: device.deviceLabel,
        ipAddress: row.ipAddress ?? null,
        createdAt: row.createdAt?.toISOString() ?? null,
        lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      // Current session first, then by lastActiveAt descending
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      const aTime = a.lastActiveAt ?? a.createdAt ?? "";
      const bTime = b.lastActiveAt ?? b.createdAt ?? "";
      return bTime.localeCompare(aTime);
    });
}

// ── Session Revocation ─────────────────────────────────────────────────────────

/**
 * Revokes a single session identified by its public hash.
 *
 * Iterates the user's sessions, hashes each token, and deletes the
 * matching row. Safe even if the session has already expired.
 *
 * @param userId - The user's UUID
 * @param sessionId - The 16-char hex hash of the session to revoke
 * @returns true if a session was deleted, false if not found
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const rows = await db
    .select({ sessionToken: sessions.sessionToken })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const match = rows.find((r) => hashToken(r.sessionToken) === sessionId);
  if (!match) return false;

  await db
    .delete(sessions)
    .where(eq(sessions.sessionToken, match.sessionToken));
  return true;
}

/**
 * Revokes all sessions for a user except the current one.
 *
 * @param userId - The user's UUID
 * @param currentSessionToken - The raw session token to keep
 * @returns Number of sessions deleted
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.sessionToken, currentSessionToken)
      )
    );
  return result.rowCount ?? 0;
}

// ── Session Metadata Updates ───────────────────────────────────────────────────

/**
 * Updates device metadata on a session row. Sets `createdAt` if it
 * was previously NULL (first touch after legacy/adapter creation).
 *
 * When `userId` is provided and this is the first touch for the session,
 * triggers a new-device notification check (fire-and-forget).
 *
 * @param sessionToken - The raw session token
 * @param headers - The request's Headers object (for UA and IP)
 * @param userId - Optional user ID; enables new-device notification check
 */
export async function touchSessionMetadata(
  sessionToken: string,
  headers: Headers,
  userId?: string
): Promise<void> {
  const now = new Date();
  const ua = headers.get("user-agent") ?? null;
  const ip = extractIp(headers);

  await db
    .update(sessions)
    .set({ lastActiveAt: now, userAgent: ua, ipAddress: ip })
    .where(eq(sessions.sessionToken, sessionToken));

  // Set createdAt only on first touch (when it's still NULL).
  // The rowCount tells us whether this was a first touch — use it to
  // trigger the new-device notification exactly once per new session.
  const firstTouchResult = await db
    .update(sessions)
    .set({ createdAt: now })
    .where(
      and(
        eq(sessions.sessionToken, sessionToken),
        isNull(sessions.createdAt)
      )
    );

  if ((firstTouchResult.rowCount ?? 0) > 0 && userId) {
    // Fire-and-forget — never block the request
    notifyIfNewDevice(userId, ua, ip).catch(() => {});
  }
}

/**
 * Sends a notification on all configured channels when the current session's
 * device fingerprint (SHA-256 of User-Agent + IP) has not been seen in any
 * prior session for this user.
 *
 * No-op when:
 *  - The user has disabled `loginNotificationNewDevice`
 *  - This is the user's very first session (nothing to compare against)
 *  - The device fingerprint matches a known prior session
 *
 * @param userId - The authenticated user's UUID
 * @param ua - User-Agent header value (may be null)
 * @param ip - Client IP address
 */
async function notifyIfNewDevice(
  userId: string,
  ua: string | null,
  ip: string
): Promise<void> {
  // Check user preference
  const userRows = await db
    .select({ loginNotificationNewDevice: users.loginNotificationNewDevice })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]?.loginNotificationNewDevice) return;

  // Fetch all other sessions that have already been touched (createdAt IS NOT NULL)
  const priorSessions = await db
    .select({ userAgent: sessions.userAgent, ipAddress: sessions.ipAddress })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gt(sessions.expires, new Date()),
        isNotNull(sessions.createdAt)
      )
    );

  // First-ever login — no prior sessions to compare against, skip
  if (priorSessions.length === 0) return;

  // Compute fingerprint = truncated SHA-256(ua:ip)
  const fingerprint = (rawUa: string | null, rawIp: string) =>
    createHash("sha256")
      .update(`${rawUa ?? ""}:${rawIp}`)
      .digest("hex")
      .slice(0, 16);

  const currentFp = fingerprint(ua, ip);
  const knownFps = new Set(
    priorSessions.map((s) => fingerprint(s.userAgent ?? null, s.ipAddress ?? "unknown"))
  );

  // Known device — nothing to report
  if (knownFps.has(currentFp)) return;

  const device = parseUserAgent(ua).deviceLabel;

  await sendToAllChannels(userId, {
    title: "🔐 Neues Gerät erkannt",
    body: `Neue Anmeldung von ${device} (${ip}). Falls du das nicht warst, widerrufe die Session in den Einstellungen.`,
    url: "/settings",
  });
}

// ── Throttled Touch ────────────────────────────────────────────────────────────

/** In-memory map of sessionToken → last touch timestamp (ms) */
const lastTouched = new Map<string, number>();

/** Minimum interval between metadata updates (1 hour) */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Conditionally updates session metadata, throttled to at most once
 * per hour per session. Fire-and-forget — errors are swallowed.
 *
 * When `userId` is provided it is forwarded to `touchSessionMetadata`
 * so that new-device detection can fire on the first touch.
 *
 * @param sessionToken - The raw session token
 * @param headers - The request's Headers object
 * @param userId - Optional user ID; enables new-device notification on first touch
 */
export function maybeUpdateSessionMetadata(
  sessionToken: string,
  headers: Headers,
  userId?: string
): void {
  const now = Date.now();
  const last = lastTouched.get(sessionToken);
  if (last && now - last < TOUCH_INTERVAL_MS) return;
  lastTouched.set(sessionToken, now);

  // Fire-and-forget — never block the request
  touchSessionMetadata(sessionToken, headers, userId).catch(() => {
    // Silently ignore — metadata is best-effort
  });
}
