/**
 * Integration tests for lib/calendar.ts.
 *
 * Covers: generateCalendarToken (format), createOrRotateCalendarToken
 * (stores hash, invalidates old), revokeCalendarToken, getCalendarFeedStatus,
 * getUserByCalendarToken (valid / revoked / unknown), buildIcsForUser
 * (ICS format, UID, DTSTART, RRULE for recurring tasks).
 */

import { describe, it, expect } from "vitest";
import {
  generateCalendarToken,
  createOrRotateCalendarToken,
  revokeCalendarToken,
  getCalendarFeedStatus,
  getUserByCalendarToken,
  buildIcsForUser,
} from "@/lib/calendar";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { getLocalDateString } from "@/lib/date-utils";

const TZ = "Europe/Berlin";

// ─── generateCalendarToken ────────────────────────────────────────────────────

describe("generateCalendarToken", () => {
  it("returns a token with the momo_cal_ prefix", () => {
    const { token } = generateCalendarToken();
    expect(token).toMatch(/^momo_cal_/);
  });

  it("returns a non-empty hash", () => {
    const { hash } = generateCalendarToken();
    expect(hash.length).toBeGreaterThan(0);
  });

  it("generates unique tokens on each call", () => {
    const { token: t1 } = generateCalendarToken();
    const { token: t2 } = generateCalendarToken();
    expect(t1).not.toBe(t2);
  });
});

// ─── createOrRotateCalendarToken ──────────────────────────────────────────────

describe("createOrRotateCalendarToken", () => {
  it("returns the plaintext token", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    expect(token).toMatch(/^momo_cal_/);
  });

  it("makes the feed status active", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createOrRotateCalendarToken(user.id);

    const status = await getCalendarFeedStatus(user.id);
    expect(status.active).toBe(true);
    expect(status.createdAt).not.toBeNull();
  });

  it("rotates the token — old token no longer resolves", async () => {
    const user = await createTestUser({ timezone: TZ });
    const oldToken = await createOrRotateCalendarToken(user.id);
    await createOrRotateCalendarToken(user.id); // rotate

    const resolved = await getUserByCalendarToken(oldToken);
    expect(resolved).toBeNull();
  });

  it("new token resolves to the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    const newToken = await createOrRotateCalendarToken(user.id);

    const resolved = await getUserByCalendarToken(newToken);
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(user.id);
  });
});

// ─── revokeCalendarToken ──────────────────────────────────────────────────────

describe("revokeCalendarToken", () => {
  it("deactivates the feed", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createOrRotateCalendarToken(user.id);
    await revokeCalendarToken(user.id);

    const status = await getCalendarFeedStatus(user.id);
    expect(status.active).toBe(false);
    expect(status.createdAt).toBeNull();
  });

  it("revoked token no longer resolves", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);
    await revokeCalendarToken(user.id);

    const resolved = await getUserByCalendarToken(token);
    expect(resolved).toBeNull();
  });
});

// ─── getCalendarFeedStatus ────────────────────────────────────────────────────

describe("getCalendarFeedStatus", () => {
  it("returns active=false when no token exists", async () => {
    const user = await createTestUser({ timezone: TZ });
    const status = await getCalendarFeedStatus(user.id);
    expect(status.active).toBe(false);
    expect(status.createdAt).toBeNull();
  });

  it("returns active=true with createdAt after token creation", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createOrRotateCalendarToken(user.id);

    const status = await getCalendarFeedStatus(user.id);
    expect(status.active).toBe(true);
    expect(status.createdAt).toBeInstanceOf(Date);
  });
});

// ─── getUserByCalendarToken ───────────────────────────────────────────────────

describe("getUserByCalendarToken", () => {
  it("returns user id, timezone, and name for a valid token", async () => {
    const user = await createTestUser({ timezone: TZ });
    const token = await createOrRotateCalendarToken(user.id);

    const result = await getUserByCalendarToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(user.id);
    expect(result!.timezone).toBe(TZ);
  });

  it("returns null for an unknown token", async () => {
    const result = await getUserByCalendarToken("momo_cal_notarealtoken12345678abc");
    expect(result).toBeNull();
  });
});

// ─── buildIcsForUser ──────────────────────────────────────────────────────────

describe("buildIcsForUser", () => {
  it("returns a valid ICS string starting with BEGIN:VCALENDAR", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toContain("END:VCALENDAR");
  });

  it("includes a VEVENT for a ONE_TIME task with a dueDate", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      title: "ICS Test Task",
      type: "ONE_TIME",
      dueDate: today,
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain(`task-${task.id}@momo`);
    expect(ics).toContain("ICS Test Task");
  });

  it("uses stable UID task-<id>@momo for each task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    const task = await createTestTask(user.id, {
      title: "Stable UID Task",
      dueDate: today,
    });

    const ics1 = await buildIcsForUser(user.id, "http://localhost:3000");
    const ics2 = await buildIcsForUser(user.id, "http://localhost:3000");

    expect(ics1).toContain(`task-${task.id}@momo`);
    expect(ics2).toContain(`task-${task.id}@momo`);
  });

  it("includes RRULE for a RECURRING task", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Recurring ICS",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceInterval: 7,
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("RRULE:");
  });

  it("does not include VEVENT for completed ONE_TIME tasks", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Completed Task",
      type: "ONE_TIME",
      dueDate: today,
      completedAt: new Date(),
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).not.toContain("Completed Task");
  });

  it("returns ICS with no VEVENTs when user has no tasks with due dates", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Task with no dueDate or nextDueDate
    await createTestTask(user.id, { title: "No Date Task" });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

// ─── buildIcsForUser — recurrence type branches ───────────────────────────────

describe("buildIcsForUser recurrence types", () => {
  it("includes FREQ=WEEKLY for WEEKDAY recurrence type", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Weekly WEEKDAY Task",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: "[0]", // index 0 = MO
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("FREQ=WEEKLY");
    expect(ics).toContain("BYDAY=MO");
  });

  it("includes FREQ=MONTHLY for MONTHLY recurrence type", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Monthly Task",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceType: "MONTHLY",
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("FREQ=MONTHLY");
    expect(ics).toContain("BYMONTHDAY=");
  });

  it("includes FREQ=YEARLY for YEARLY recurrence type", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Yearly Task",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceType: "YEARLY",
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("FREQ=YEARLY");
    expect(ics).toContain("BYMONTH=");
  });

  it("omits RRULE when recurrenceType=INTERVAL but interval is 0", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    // recurrenceInterval=0 → buildRepeating returns null → no RRULE
    await createTestTask(user.id, {
      title: "Zero Interval Task",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceType: "INTERVAL",
      recurrenceInterval: 0,
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    // VEVENT exists but has no RRULE
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).not.toContain("RRULE:");
  });

  it("falls back to RRULE:FREQ=WEEKLY when WEEKDAY recurrenceWeekdays is invalid JSON", async () => {
    const user = await createTestUser({ timezone: TZ });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Bad Weekday JSON",
      type: "RECURRING",
      nextDueDate: today,
      recurrenceType: "WEEKDAY",
      recurrenceWeekdays: "not-valid-json",
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    // Falls back to [0] → index 0 = MO
    expect(ics).toContain("FREQ=WEEKLY");
    expect(ics).toContain("BYDAY=MO");
  });

  it("includes topic name as CATEGORIES when task belongs to a topic", async () => {
    const { createTestTopic } = await import("./helpers/fixtures");
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Work Stuff" });
    const today = getLocalDateString(TZ);
    await createTestTask(user.id, {
      title: "Categorised Task",
      type: "ONE_TIME",
      dueDate: today,
      topicId: topic.id,
    });

    const ics = await buildIcsForUser(user.id, "http://localhost:3000");
    expect(ics).toContain("CATEGORIES:Work Stuff");
  });
});
