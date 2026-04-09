/**
 * Notification delivery logging.
 *
 * Every individual send attempt (per channel, per user) is recorded so users
 * can inspect delivery history in Settings → Notification History.
 *
 * Design: fire-and-forget — logging must never block or fail notification
 * delivery. All DB writes are wrapped in `.catch()` to suppress errors.
 *
 * @module lib/notification-log
 */

import { db } from "@/lib/db";
import { notificationLog } from "@/lib/db/schema";
import { lt } from "drizzle-orm";
import type { CronJobResult } from "@/lib/cron";

/** Retention period for notification log entries. */
const RETENTION_DAYS = 30;

/**
 * Logs a single notification delivery attempt.
 *
 * Fire-and-forget: the returned promise is always fulfilled (errors are
 * caught and logged to the console). Callers do not need to await this.
 *
 * @param params.userId  - The target user's UUID
 * @param params.channel - Delivery channel ("web-push" | "ntfy" | "pushover" | "telegram" | "email")
 * @param params.title   - Notification title
 * @param params.body    - Notification body (optional)
 * @param params.status  - Delivery outcome ("sent" | "failed")
 * @param params.error   - Error message when status is "failed"
 */
export function logNotification(params: {
  userId: string;
  channel: string;
  title: string;
  body?: string;
  status: "sent" | "failed";
  error?: string;
}): void {
  db.insert(notificationLog)
    .values({
      userId: params.userId,
      channel: params.channel,
      title: params.title,
      body: params.body ?? null,
      status: params.status,
      error: params.error ?? null,
    })
    .catch((err) => {
      console.error("[notification-log] Failed to log notification:", err);
    });
}

/**
 * Deletes notification log entries older than 30 days.
 *
 * Registered as a daily cron job (`notification-log-cleanup`).
 *
 * @returns Cron job result (always `{ sent: 0, failed: 0 }`)
 */
export async function cleanupNotificationLog(): Promise<CronJobResult> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(notificationLog).where(lt(notificationLog.sentAt, cutoff));
  return { sent: 0, failed: 0 };
}
