/**
 * iCal calendar feed business logic for Momo.
 *
 * Each user can generate exactly one private calendar feed URL:
 *   https://momo.example.com/api/calendar/<token>.ics
 *
 * Third-party calendar clients (Google Calendar, Apple Calendar, Outlook,
 * Thunderbird) subscribe to this URL and poll it periodically. Every
 * non-completed task with a due date becomes a VEVENT; recurring tasks
 * emit an RRULE so they appear as a series.
 *
 * Security model:
 *  - Token is 256 bits of entropy (`momo_cal_<base64url>`), stored as a
 *    SHA-256 hash — plaintext is shown once at creation and never persisted.
 *  - The token in the URL path IS the auth — no session cookie, no Bearer
 *    header (calendar clients cannot send custom headers).
 *  - Rotating the token invalidates the old URL immediately.
 *
 * @module lib/calendar
 */

import { createHash, randomBytes } from "crypto";
import ical, {
  ICalCalendarMethod,
  ICalEventRepeatingFreq,
} from "ical-generator";
import { db } from "@/lib/db";
import { users, tasks, topics } from "@/lib/db/schema";
import { and, eq, isNull, or, isNotNull } from "drizzle-orm";

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Plaintext token + its SHA-256 hash, as returned by {@link generateCalendarToken}. */
export interface GeneratedCalendarToken {
  /** Plaintext token — show once, never persist */
  token: string;
  /** SHA-256 hex hash — store in `users.calendar_feed_token_hash` */
  hash: string;
}

/**
 * Generates a new cryptographically secure calendar feed token.
 *
 * Format: `momo_cal_<43 chars base64url(32 random bytes)>`
 * Entropy: 256 bits — brute force infeasible.
 *
 * @returns Plaintext token and its SHA-256 hash
 */
export function generateCalendarToken(): GeneratedCalendarToken {
  const raw = randomBytes(32);
  const token = `momo_cal_${raw.toString("base64url")}`;
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/**
 * Hashes a raw calendar token for lookup.
 *
 * @param rawToken - The plaintext token received in a feed URL
 * @returns SHA-256 hex hash
 */
function hashCalendarToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// ─── CRUD on the users row ────────────────────────────────────────────────────

/**
 * Generates a new calendar feed token for the user, replacing any existing
 * one. The previous URL (if any) stops working immediately.
 *
 * @param userId - The user's UUID
 * @returns The plaintext token (caller must show it once and discard)
 */
export async function createOrRotateCalendarToken(
  userId: string
): Promise<string> {
  const { token, hash } = generateCalendarToken();
  await db
    .update(users)
    .set({
      calendarFeedTokenHash: hash,
      calendarFeedTokenCreatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  return token;
}

/**
 * Revokes the user's calendar feed token. Subsequent requests to the
 * previous URL will 404.
 *
 * @param userId - The user's UUID
 */
export async function revokeCalendarToken(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      calendarFeedTokenHash: null,
      calendarFeedTokenCreatedAt: null,
    })
    .where(eq(users.id, userId));
}

/** Status of the user's calendar feed, as shown in the settings UI. */
export interface CalendarFeedStatus {
  active: boolean;
  createdAt: Date | null;
}

/**
 * Returns the user's current calendar feed status (active + createdAt).
 * Never returns the token hash itself.
 *
 * @param userId - The user's UUID
 */
export async function getCalendarFeedStatus(
  userId: string
): Promise<CalendarFeedStatus> {
  const [row] = await db
    .select({
      hash: users.calendarFeedTokenHash,
      createdAt: users.calendarFeedTokenCreatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!row || !row.hash) return { active: false, createdAt: null };
  return { active: true, createdAt: row.createdAt };
}

/**
 * Resolves a plaintext calendar feed token to the owning user.
 *
 * @param rawToken - The plaintext token from the feed URL
 * @returns `{ id, timezone, name }` of the owner, or `null` if the token
 *          is invalid / revoked
 */
export async function getUserByCalendarToken(
  rawToken: string
): Promise<{ id: string; timezone: string | null; name: string | null } | null> {
  if (!rawToken.startsWith("momo_cal_")) return null;
  const hash = hashCalendarToken(rawToken);
  const [row] = await db
    .select({
      id: users.id,
      timezone: users.timezone,
      name: users.name,
    })
    .from(users)
    .where(eq(users.calendarFeedTokenHash, hash));
  return row ?? null;
}

// ─── ICS builder ──────────────────────────────────────────────────────────────

/**
 * Parses a YYYY-MM-DD date string (as stored in Postgres `date` columns) into
 * a UTC midnight `Date`. Used as the `start` of an all-day VEVENT — because
 * the event is all-day, no timezone information is emitted in the output
 * (ical-generator writes `DTSTART;VALUE=DATE:YYYYMMDD`).
 *
 * @param iso - "YYYY-MM-DD" date string
 * @returns `Date` at 00:00:00 UTC on that day
 */
function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/**
 * Builds the iCalendar (RFC 5545) feed for a single user.
 *
 * Selection rules:
 *  - Only tasks owned by the user
 *  - Excludes completed ONE_TIME tasks (`completed_at IS NOT NULL`)
 *  - Requires either `due_date` (ONE_TIME / DAILY_ELIGIBLE) or
 *    `next_due_date` (RECURRING) to be set
 *  - Includes snoozed tasks (the calendar shows what's planned)
 *  - Includes tasks in sequential topics (the calendar is not an action list)
 *
 * Event rules:
 *  - All events are all-day VEVENTs — tasks have no time-of-day
 *  - RECURRING tasks get an RRULE `FREQ=DAILY;INTERVAL=<recurrenceInterval>`
 *    with DTSTART = `next_due_date` and no UNTIL (open-ended series)
 *  - UID is stable: `task-<taskId>@momo` — calendar clients merge updates
 *
 * @param userId  - The user's UUID
 * @param baseUrl - Public base URL of this Momo instance (no trailing slash),
 *                  used for deep links back into the app
 * @returns The serialised `.ics` document
 */
export async function buildIcsForUser(
  userId: string,
  baseUrl: string
): Promise<string> {
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      notes: tasks.notes,
      type: tasks.type,
      dueDate: tasks.dueDate,
      nextDueDate: tasks.nextDueDate,
      recurrenceInterval: tasks.recurrenceInterval,
      topicName: topics.title,
    })
    .from(tasks)
    .leftJoin(topics, eq(tasks.topicId, topics.id))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        or(isNotNull(tasks.dueDate), isNotNull(tasks.nextDueDate))
      )
    );

  const calendar = ical({
    name: "Momo Tasks",
    prodId: { company: "momo", product: "tasks", language: "EN" },
    method: ICalCalendarMethod.PUBLISH,
    description: "Your Momo tasks with due dates",
  });

  const trimmedBase = baseUrl.replace(/\/+$/, "");

  for (const row of rows) {
    // Prefer nextDueDate for recurring tasks, fall back to dueDate otherwise.
    const startIso =
      row.type === "RECURRING"
        ? (row.nextDueDate ?? row.dueDate)
        : (row.dueDate ?? row.nextDueDate);
    if (!startIso) continue;

    const start = parseDateOnly(startIso);
    const deepLink = `${trimmedBase}/tasks`;

    const descriptionLines: string[] = [];
    if (row.notes) descriptionLines.push(row.notes);
    if (row.topicName) descriptionLines.push(`Topic: ${row.topicName}`);
    descriptionLines.push(`Open in Momo: ${deepLink}`);

    const event = calendar.createEvent({
      id: `task-${row.id}@momo`,
      start,
      allDay: true,
      summary: row.title,
      description: descriptionLines.join("\n"),
      url: deepLink,
    });

    if (row.topicName) {
      event.createCategory({ name: row.topicName });
    }

    if (
      row.type === "RECURRING" &&
      row.recurrenceInterval &&
      row.recurrenceInterval > 0
    ) {
      event.repeating({
        freq: ICalEventRepeatingFreq.DAILY,
        interval: row.recurrenceInterval,
      });
    }
  }

  return calendar.toString();
}
