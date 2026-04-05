/**
 * Web Push / VAPID notification logic for Momo.
 *
 * This module is SERVER-SIDE ONLY. Never import it in client components.
 *
 * Responsibilities:
 *  - Configure VAPID credentials from environment variables
 *  - Send push notifications to individual subscribers
 *  - Fan out daily quest and streak reminder notifications to all eligible users
 *
 * Push notifications require VAPID keys to be set in the environment:
 *   VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_CONTACT
 *
 * If VAPID keys are not configured, notification functions are no-ops and
 * log a warning rather than throwing — the app continues to function without push.
 */

import webpush from "web-push";
import { db } from "@/lib/db";
import { users, taskCompletions } from "@/lib/db/schema";
import { eq, and, isNotNull, gt, gte, sql } from "drizzle-orm";
import { serverEnv } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The push subscription data stored in the database.
 * Mirrors the PushSubscription Web API shape.
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * The notification payload sent to the browser via web-push.
 */
export interface NotificationPayload {
  /** Notification title (shown in the system notification) */
  title: string;
  /** Notification body text */
  body: string;
  /** Icon URL (defaults to /favicon.ico) */
  icon?: string;
  /** Badge URL for Android (defaults to /favicon.ico) */
  badge?: string;
  /** URL to open when the user clicks the notification */
  url?: string;
  /** Dedup tag — replaces previous notifications with the same tag */
  tag?: string;
}

// ─── VAPID Setup ──────────────────────────────────────────────────────────────

/**
 * Returns true if VAPID credentials are fully configured.
 * Push notifications are silently skipped when this returns false.
 */
function isVapidConfigured(): boolean {
  return (
    !!serverEnv.VAPID_PRIVATE_KEY &&
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

/**
 * Lazily configures web-push with VAPID credentials.
 * Called before every send to ensure credentials are always fresh.
 * No-ops if VAPID is not configured.
 */
function configureVapid(): void {
  if (!isVapidConfigured()) return;

  webpush.setVapidDetails(
    serverEnv.VAPID_CONTACT ?? "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    serverEnv.VAPID_PRIVATE_KEY!
  );
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Sends a push notification to a single subscriber.
 *
 * Automatically removes the DB subscription if the push endpoint responds
 * with 410 Gone (subscription expired or revoked by the user).
 *
 * No-ops (with a console warning) if VAPID is not configured.
 *
 * @param userId - The user's UUID — used to clean up stale subscriptions
 * @param subscription - The PushSubscription object stored in the DB
 * @param payload - The notification content to display
 */
export async function sendPushNotification(
  userId: string,
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<void> {
  if (!isVapidConfigured()) {
    console.warn(
      "[push] VAPID keys not configured — skipping push notification for user",
      userId
    );
    return;
  }

  configureVapid();

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/icon-192.png",
        badge: payload.badge ?? "/icon-192.png",
        url: payload.url ?? "/dashboard",
        tag: payload.tag ?? "momo-notification",
      })
    );
  } catch (err: unknown) {
    // 410 Gone = subscription is no longer valid; clean it up
    if (
      err &&
      typeof err === "object" &&
      "statusCode" in err &&
      (err as { statusCode: number }).statusCode === 410
    ) {
      console.info(
        "[push] Subscription expired (410) for user",
        userId,
        "— removing from DB"
      );
      await db
        .update(users)
        .set({
          pushSubscription: null,
          notificationEnabled: false,
        })
        .where(eq(users.id, userId));
      return;
    }
    // Re-throw all other errors so callers can count failures
    throw err;
  }
}

// ─── Fan-out helpers ──────────────────────────────────────────────────────────

/**
 * Sends the daily quest notification to all eligible users whose notification_time
 * falls within the current UTC hour (e.g. cron runs at 08:00 UTC → sends to all
 * users with notification_time between 08:00 and 08:59).
 *
 * Eligible users must have:
 *  - notification_enabled = true
 *  - push_subscription set (non-null)
 *  - notification_time hour matching the current UTC hour
 *
 * The cron must be scheduled to run every full hour (e.g. "0 * * * *").
 * Called by the POST /api/cron/daily-quest route.
 *
 * @returns Object with sent and failed counts
 */
export async function sendDailyQuestNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  if (!isVapidConfigured()) {
    console.warn("[push] VAPID keys not configured — skipping daily quest notifications");
    return { sent: 0, failed: 0 };
  }

  // Match users whose notification_time falls within the current 5-minute UTC bucket.
  // Cron runs every 5 minutes, so a user who sets 06:30 is reached by the 06:30 run.
  // Bucket formula: FLOOR(minute / 5) — e.g. minutes 30–34 all map to bucket 6.
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentBucket = Math.floor(now.getUTCMinutes() / 5);

  const eligibleUsers = await db
    .select({
      id: users.id,
      pushSubscription: users.pushSubscription,
    })
    .from(users)
    .where(
      and(
        eq(users.notificationEnabled, true),
        isNotNull(users.pushSubscription),
        sql`EXTRACT(HOUR FROM ${users.notificationTime}) = ${currentHour}`,
        sql`FLOOR(EXTRACT(MINUTE FROM ${users.notificationTime}) / 5) = ${currentBucket}`
      )
    );

  let sent = 0;
  let failed = 0;

  for (const user of eligibleUsers) {
    try {
      const subscription = user.pushSubscription as PushSubscriptionData;

      await sendPushNotification(user.id, subscription, {
        title: "Your daily quest awaits",
        body: "Open Momo to see today's mission. One small step forward.",
        icon: "/icon-192.png",
        url: "/dashboard",
        tag: "daily-quest",
      });

      sent++;
    } catch (err) {
      console.error("[push] Failed to send daily quest notification to", user.id, err);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Sends streak reminder notifications to users who are at risk of losing their streak.
 *
 * Eligible users must have:
 *  - notification_enabled = true
 *  - push_subscription set
 *  - streak_current > 0
 *  - No task completion recorded today
 *
 * Called by the POST /api/cron/streak-reminder route.
 *
 * @returns Object with sent and failed counts
 */
export async function sendStreakReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  if (!isVapidConfigured()) {
    console.warn("[push] VAPID keys not configured — skipping streak reminders");
    return { sent: 0, failed: 0 };
  }

  // Start of today in UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Fetch users with active streaks and notifications enabled
  const eligibleUsers = await db
    .select({
      id: users.id,
      pushSubscription: users.pushSubscription,
      streakCurrent: users.streakCurrent,
    })
    .from(users)
    .where(
      and(
        eq(users.notificationEnabled, true),
        isNotNull(users.pushSubscription),
        gt(users.streakCurrent, 0)
      )
    );

  let sent = 0;
  let failed = 0;

  for (const user of eligibleUsers) {
    try {
      // Check whether the user has already completed a task today — filter in DB
      const completionsToday = await db
        .select({ id: taskCompletions.id })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.userId, user.id),
            gte(taskCompletions.completedAt, todayStart)
          )
        )
        .limit(1);

      // Skip if they've already done something today
      const hasCompletedToday = completionsToday.length > 0;

      if (hasCompletedToday) continue;

      const subscription = user.pushSubscription as PushSubscriptionData;

      await sendPushNotification(user.id, subscription, {
        title: `Keep your ${user.streakCurrent}-day streak alive!`,
        body: "You haven't completed a task today yet. Don't let your streak slip.",
        icon: "/icon-192.png",
        url: "/dashboard",
        tag: "streak-reminder",
      });

      sent++;
    } catch (err) {
      console.error("[push] Failed to send streak reminder to", user.id, err);
      failed++;
    }
  }

  return { sent, failed };
}

