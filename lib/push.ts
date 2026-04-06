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
import { users, pushSubscriptions, taskCompletions, notificationChannels } from "@/lib/db/schema";
import { eq, and, gt, gte, sql } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { getCurrentDailyQuest, selectDailyQuest } from "@/lib/daily-quest";
import { getWeeklyReview } from "@/lib/weekly-review";
import { sendToAllChannels, type NotificationPayload as ChannelPayload } from "@/lib/notifications";

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
      }),
      { TTL: 3600 } // 1 hour — deliver even if browser is momentarily disconnected
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
      // Remove only this specific device subscription
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      // If no subscriptions remain, disable notifications for the user
      const remaining = await db
        .select({ id: pushSubscriptions.id })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
        .limit(1);
      if (remaining.length === 0) {
        await db
          .update(users)
          .set({ notificationEnabled: false })
          .where(eq(users.id, userId));
      }
      return;
    }
    // Re-throw all other errors so callers can count failures
    throw err;
  }
}

// ─── Fan-out helpers ──────────────────────────────────────────────────────────

/**
 * Sends the daily quest notification to all eligible device subscriptions whose
 * notification_time (in the user's local timezone) falls within the current
 * 5-minute bucket. Each user may have multiple devices — all are notified.
 *
 * Eligible subscriptions must belong to a user with:
 *  - notification_enabled = true
 *  - notification_time matching the current local time (in the user's timezone)
 *
 * The cron runs every 5 minutes. Called by the unified dispatcher in lib/cron.ts.
 *
 * @returns Object with sent and failed counts
 */
export async function sendDailyQuestNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Time-bucket WHERE clause (reused for both Web Push and channels)
  const timeBucketCondition = and(
    sql`EXTRACT(HOUR FROM ${users.notificationTime})
        = EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC')))`,
    sql`FLOOR(EXTRACT(MINUTE FROM ${users.notificationTime}) / 5)
        = FLOOR(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) / 5)`
  );

  // Cache quests per user so multiple device subscriptions don't re-query
  const questCache = new Map<string, string | null>();

  /** Resolve quest title once per user, using cache. */
  async function resolveQuestTitle(userId: string, timezone: string | null): Promise<string | null> {
    if (questCache.has(userId)) return questCache.get(userId)!;
    const quest =
      (await getCurrentDailyQuest(userId)) ??
      (await selectDailyQuest(userId, timezone));
    const title = quest?.title ?? null;
    questCache.set(userId, title);
    return title;
  }

  /** Build the notification payload for a user's daily quest. */
  function buildPayload(questTitle: string | null): NotificationPayload & ChannelPayload {
    return questTitle
      ? {
          title: "Deine Daily Quest wartet",
          body: `Heutige Mission: ${questTitle}`,
          icon: "/icon-192.png",
          url: "/dashboard",
          tag: "daily-quest",
        }
      : {
          title: "Your daily quest awaits",
          body: "Open Momo to see today's mission. One small step forward.",
          icon: "/icon-192.png",
          url: "/dashboard",
          tag: "daily-quest",
        };
  }

  // ── Web Push block (only if VAPID is configured) ──
  if (isVapidConfigured()) {
    const eligibleSubscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        subscription: pushSubscriptions.subscription,
        timezone: users.timezone,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(and(eq(users.notificationEnabled, true), timeBucketCondition));

    for (const row of eligibleSubscriptions) {
      try {
        const questTitle = await resolveQuestTitle(row.userId, row.timezone);
        await sendPushNotification(
          row.userId,
          row.subscription as PushSubscriptionData,
          buildPayload(questTitle)
        );
        sent++;
      } catch (err) {
        console.error("[push] Failed to send daily quest notification to", row.userId, err);
        failed++;
      }
    }
  }

  // ── Notification channels block (ntfy, pushover, telegram, etc.) ──
  const channelUsers = await db
    .selectDistinct({
      userId: notificationChannels.userId,
      timezone: users.timezone,
    })
    .from(notificationChannels)
    .innerJoin(users, eq(notificationChannels.userId, users.id))
    .where(and(eq(notificationChannels.enabled, true), timeBucketCondition));

  for (const row of channelUsers) {
    try {
      const questTitle = await resolveQuestTitle(row.userId, row.timezone);
      const result = await sendToAllChannels(row.userId, buildPayload(questTitle));
      sent += result.sent;
      failed += result.failed;
    } catch (err) {
      console.error("[channels] Failed to send daily quest notification to", row.userId, err);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Sends streak reminder notifications to all devices of users who are at risk
 * of losing their streak.
 *
 * Eligible subscriptions belong to users with:
 *  - notification_enabled = true
 *  - streak_current > 0
 *  - No task completion recorded today
 *
 * Called by the unified dispatcher in lib/cron.ts.
 *
 * @returns Object with sent and failed counts
 */
export async function sendStreakReminders(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Start of today in UTC
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Cache: has user completed a task today? (avoid re-querying for multi-device + channels)
  const completionCache = new Map<string, boolean>();

  /** Check if a user completed a task today, with caching. */
  async function hasCompletedToday(userId: string): Promise<boolean> {
    if (completionCache.has(userId)) return completionCache.get(userId)!;
    const rows = await db
      .select({ id: taskCompletions.id })
      .from(taskCompletions)
      .where(
        and(
          eq(taskCompletions.userId, userId),
          gte(taskCompletions.completedAt, todayStart)
        )
      )
      .limit(1);
    const done = rows.length > 0;
    completionCache.set(userId, done);
    return done;
  }

  /** Build streak reminder payload. */
  function buildPayload(streakCurrent: number): NotificationPayload & ChannelPayload {
    return {
      title: `Keep your ${streakCurrent}-day streak alive!`,
      body: "You haven't completed a task today yet. Don't let your streak slip.",
      icon: "/icon-192.png",
      url: "/dashboard",
      tag: "streak-reminder",
    };
  }

  // ── Web Push block ──
  if (isVapidConfigured()) {
    const eligibleSubscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        subscription: pushSubscriptions.subscription,
        streakCurrent: users.streakCurrent,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          eq(users.notificationEnabled, true),
          gt(users.streakCurrent, 0)
        )
      );

    for (const row of eligibleSubscriptions) {
      try {
        if (await hasCompletedToday(row.userId)) continue;
        await sendPushNotification(
          row.userId,
          row.subscription as PushSubscriptionData,
          buildPayload(row.streakCurrent)
        );
        sent++;
      } catch (err) {
        console.error("[push] Failed to send streak reminder to", row.userId, err);
        failed++;
      }
    }
  }

  // ── Notification channels block ──
  const channelUsers = await db
    .selectDistinct({
      userId: notificationChannels.userId,
      streakCurrent: users.streakCurrent,
    })
    .from(notificationChannels)
    .innerJoin(users, eq(notificationChannels.userId, users.id))
    .where(
      and(
        eq(notificationChannels.enabled, true),
        gt(users.streakCurrent, 0)
      )
    );

  for (const row of channelUsers) {
    try {
      if (await hasCompletedToday(row.userId)) continue;
      const result = await sendToAllChannels(row.userId, buildPayload(row.streakCurrent));
      sent += result.sent;
      failed += result.failed;
    } catch (err) {
      console.error("[channels] Failed to send streak reminder to", row.userId, err);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Sends weekly review notifications to all eligible device subscriptions
 * whose local time is Sunday between 18:00–18:04 (the 5-minute bucket).
 *
 * Eligible subscriptions belong to users with:
 *  - notification_enabled = true
 *  - Current local time is Sunday 18:00–18:04
 *
 * The cron runs every 5 minutes. On non-Sunday/non-18:00 calls, the query
 * returns 0 rows, making this effectively a no-op.
 *
 * Called by the unified dispatcher in lib/cron.ts.
 *
 * @returns Object with sent and failed counts
 */
export async function sendWeeklyReviewNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Sunday 18:00–18:04 in user's local timezone
  const sundayCondition = and(
    sql`EXTRACT(DOW FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) = 0`,
    sql`EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) = 18`,
    sql`FLOOR(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) / 5) = 0`
  );

  // Cache review data per user for multi-device + channel fan-out
  const reviewCache = new Map<string, { completed: number; postponed: number; streak: number }>();

  /** Resolve weekly review once per user, using cache. */
  async function resolveReview(userId: string, timezone: string | null) {
    if (reviewCache.has(userId)) return reviewCache.get(userId)!;
    const review = await getWeeklyReview(userId, timezone);
    const summary = {
      completed: review.completionsThisWeek,
      postponed: review.postponementsThisWeek,
      streak: review.streakCurrent,
    };
    reviewCache.set(userId, summary);
    return summary;
  }

  /** Build weekly review payload. */
  function buildPayload(summary: { completed: number; postponed: number; streak: number }): NotificationPayload & ChannelPayload {
    return {
      title: "Dein Wochenrückblick",
      body: `Diese Woche: ${summary.completed} erledigt, ${summary.postponed} verschoben, Streak ${summary.streak}`,
      icon: "/icon-192.png",
      url: "/review",
      tag: "weekly-review",
    };
  }

  // ── Web Push block ──
  if (isVapidConfigured()) {
    const eligibleSubscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        subscription: pushSubscriptions.subscription,
        timezone: users.timezone,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(and(eq(users.notificationEnabled, true), sundayCondition));

    for (const row of eligibleSubscriptions) {
      try {
        const summary = await resolveReview(row.userId, row.timezone);
        await sendPushNotification(
          row.userId,
          row.subscription as PushSubscriptionData,
          buildPayload(summary)
        );
        sent++;
      } catch (err) {
        console.error("[push] Failed to send weekly review notification to", row.userId, err);
        failed++;
      }
    }
  }

  // ── Notification channels block ──
  const channelUsers = await db
    .selectDistinct({
      userId: notificationChannels.userId,
      timezone: users.timezone,
    })
    .from(notificationChannels)
    .innerJoin(users, eq(notificationChannels.userId, users.id))
    .where(and(eq(notificationChannels.enabled, true), sundayCondition));

  for (const row of channelUsers) {
    try {
      const summary = await resolveReview(row.userId, row.timezone);
      const result = await sendToAllChannels(row.userId, buildPayload(summary));
      sent += result.sent;
      failed += result.failed;
    } catch (err) {
      console.error("[channels] Failed to send weekly review notification to", row.userId, err);
      failed++;
    }
  }

  return { sent, failed };
}

