/**
 * Tests for lib/notification-log.ts → cleanupNotificationLog.
 *
 * logNotification() is fire-and-forget (no return value, no await) and
 * designed to never throw, so its DB side-effect cannot be reliably
 * awaited in tests. cleanupNotificationLog() is the cron cleanup function
 * that prunes entries older than 30 days.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cleanupNotificationLog } from "@/lib/notification-log";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── cleanupNotificationLog ───────────────────────────────────────────────────

describe("cleanupNotificationLog", () => {
  it("returns { sent: 0, failed: 0 } (standard cron result shape)", async () => {
    const result = await cleanupNotificationLog();
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("deletes log entries older than 30 days", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Insert a log entry with sentAt 31 days ago
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await db.insert(notificationLog).values({
      userId: user.id,
      channel: "email",
      title: "Old notification",
      status: "sent",
      sentAt: oldDate,
    });

    const before = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.userId, user.id));
    expect(before).toHaveLength(1);

    await cleanupNotificationLog();

    const after = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.userId, user.id));
    expect(after).toHaveLength(0);
  });

  it("keeps log entries newer than 30 days", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Insert a log entry with sentAt 1 day ago (well within retention)
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await db.insert(notificationLog).values({
      userId: user.id,
      channel: "ntfy",
      title: "Recent notification",
      status: "sent",
      sentAt: recentDate,
    });

    await cleanupNotificationLog();

    const after = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.userId, user.id));
    expect(after).toHaveLength(1);
  });

  it("does not delete entries from other users when cleaning up old records", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    // userA has an old entry (should be deleted)
    await db.insert(notificationLog).values({
      userId: userA.id,
      channel: "email",
      title: "Old for A",
      status: "failed",
      sentAt: oldDate,
    });

    // userB has a recent entry (must survive)
    await db.insert(notificationLog).values({
      userId: userB.id,
      channel: "email",
      title: "Recent for B",
      status: "sent",
      sentAt: recentDate,
    });

    await cleanupNotificationLog();

    const afterA = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.userId, userA.id));
    const afterB = await db
      .select({ id: notificationLog.id })
      .from(notificationLog)
      .where(eq(notificationLog.userId, userB.id));

    expect(afterA).toHaveLength(0);
    expect(afterB).toHaveLength(1);
  });
});
