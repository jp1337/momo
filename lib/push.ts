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
import { users, pushSubscriptions, taskCompletions, notificationChannels, tasks, userAchievements, achievements } from "@/lib/db/schema";
import { eq, and, gt, gte, or, isNull, lte, asc, desc, sql } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { getCurrentDailyQuest, selectDailyQuest } from "@/lib/daily-quest";
import { getWeeklyReview } from "@/lib/weekly-review";
import { sendToAllChannels, type NotificationPayload as ChannelPayload } from "@/lib/notifications";
import { logNotification } from "@/lib/notification-log";

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
    logNotification({ userId, channel: "web-push", title: payload.title, body: payload.body, status: "sent" });
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
      logNotification({ userId, channel: "web-push", title: payload.title, body: payload.body, status: "failed", error: "Subscription expired (410)" });
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
    // Log the failure before re-throwing
    logNotification({
      userId,
      channel: "web-push",
      title: payload.title,
      body: payload.body,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
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
      .where(and(
        eq(users.notificationEnabled, true),
        eq(users.morningBriefingEnabled, false), // digest users get this via morning briefing
        timeBucketCondition,
      ));

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
    .where(and(
      eq(notificationChannels.enabled, true),
      eq(users.morningBriefingEnabled, false), // digest users get this via morning briefing
      timeBucketCondition,
    ));

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

// ─── Due Today reminder ───────────────────────────────────────────────────────

/**
 * Fetches up to 10 tasks that are due today in the given user's timezone,
 * excluding completed and snoozed tasks.
 *
 * "Due today" means:
 *  - tasks.due_date equals today in the user's timezone, OR
 *  - tasks.type = 'RECURRING' AND tasks.next_due_date equals today
 * AND
 *  - completed_at IS NULL
 *  - snoozed_until IS NULL OR snoozed_until <= today
 *
 * Ordered by priority (ascending enum order, URGENT first) then title.
 *
 * @param userId - The user whose tasks to query
 * @returns Array of { id, title } for each due-today task (max 10)
 */
async function fetchDueTodayTasks(
  userId: string
): Promise<Array<{ id: string; title: string }>> {
  // "Today" in the user's own timezone, computed on the database side
  const today = sql<string>`((NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))::date)`;

  const rows = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .innerJoin(users, eq(tasks.userId, users.id))
    .where(
      and(
        eq(tasks.userId, userId),
        isNull(tasks.completedAt),
        or(
          eq(tasks.dueDate, today),
          and(eq(tasks.type, "RECURRING"), eq(tasks.nextDueDate, today))
        ),
        or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, today)),
        isNull(tasks.pausedUntil)
      )
    )
    .orderBy(asc(tasks.priority), asc(tasks.title))
    .limit(10);

  return rows;
}

/**
 * Sends "due today" reminder notifications to all users who have
 *   - notification_enabled = true
 *   - due_today_reminder_enabled = true
 *   - notification_time matching the current 5-minute bucket (in their tz)
 *   - at least one non-completed, non-snoozed task with due_date = today
 *     (or a RECURRING task with next_due_date = today)
 *
 * Silent on empty: users with no due tasks receive *no* ping. This is a
 * deliberate UX choice — a "nothing due today" notification is muda and
 * trains users to swipe away the reminder.
 *
 * Runs in the same 5-minute bucket as the daily-quest job. Registered
 * *before* daily-quest in the dispatcher so the due-today ping arrives
 * first when both match.
 *
 * @returns Object with sent and failed counts
 */
export async function sendDueTodayNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Same bucket SQL fragment as sendDailyQuestNotifications
  const timeBucketCondition = and(
    sql`EXTRACT(HOUR FROM ${users.notificationTime})
        = EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC')))`,
    sql`FLOOR(EXTRACT(MINUTE FROM ${users.notificationTime}) / 5)
        = FLOOR(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) / 5)`
  );

  // Cache due-tasks per user so multi-device and multi-channel fan-out
  // doesn't re-query. `null` sentinel = already checked and nothing due.
  const dueCache = new Map<string, Array<{ id: string; title: string }> | null>();

  /** Resolve due tasks once per user, using the cache. */
  async function resolveDueTasks(
    userId: string
  ): Promise<Array<{ id: string; title: string }>> {
    if (dueCache.has(userId)) return dueCache.get(userId) ?? [];
    const rows = await fetchDueTodayTasks(userId);
    dueCache.set(userId, rows.length > 0 ? rows : null);
    return rows;
  }

  /**
   * Builds the notification payload for a user's due-today tasks.
   * Uses German/English fallback copy identical in spirit to the
   * daily-quest payload (no per-user i18n in cron jobs — there's no
   * request locale).
   */
  function buildPayload(
    dueTasks: Array<{ id: string; title: string }>
  ): NotificationPayload & ChannelPayload {
    if (dueTasks.length === 1) {
      const title = dueTasks[0].title.length > 80
        ? `${dueTasks[0].title.slice(0, 77)}...`
        : dueTasks[0].title;
      return {
        title: `Heute fällig: ${title}`,
        body: "Open Momo to tick it off before the day moves on.",
        icon: "/icon-192.png",
        url: "/tasks",
        tag: "due-today",
      };
    }

    const preview = dueTasks.slice(0, 3).map((t) => t.title).join(" · ");
    const remaining = dueTasks.length - 3;
    const body =
      remaining > 0
        ? `${preview} · und ${remaining} weitere`
        : preview;
    return {
      title: `${dueTasks.length} Tasks heute fällig`,
      body,
      icon: "/icon-192.png",
      url: "/tasks",
      tag: "due-today",
    };
  }

  // ── Web Push block (only if VAPID is configured) ──
  if (isVapidConfigured()) {
    const eligibleSubscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        subscription: pushSubscriptions.subscription,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(
        and(
          eq(users.notificationEnabled, true),
          eq(users.dueTodayReminderEnabled, true),
          eq(users.morningBriefingEnabled, false), // digest users get this via morning briefing
          timeBucketCondition
        )
      );

    for (const row of eligibleSubscriptions) {
      try {
        const dueTasks = await resolveDueTasks(row.userId);
        if (dueTasks.length === 0) continue; // silence-on-empty
        await sendPushNotification(
          row.userId,
          row.subscription as PushSubscriptionData,
          buildPayload(dueTasks)
        );
        sent++;
      } catch (err) {
        console.error(
          "[push] Failed to send due-today notification to",
          row.userId,
          err
        );
        failed++;
      }
    }
  }

  // ── Notification channels block (ntfy, pushover, telegram, email) ──
  const channelUsers = await db
    .selectDistinct({
      userId: notificationChannels.userId,
    })
    .from(notificationChannels)
    .innerJoin(users, eq(notificationChannels.userId, users.id))
    .where(
      and(
        eq(notificationChannels.enabled, true),
        eq(users.dueTodayReminderEnabled, true),
        eq(users.morningBriefingEnabled, false), // digest users get this via morning briefing
        timeBucketCondition
      )
    );

  for (const row of channelUsers) {
    try {
      const dueTasks = await resolveDueTasks(row.userId);
      if (dueTasks.length === 0) continue; // silence-on-empty
      const result = await sendToAllChannels(row.userId, buildPayload(dueTasks));
      sent += result.sent;
      failed += result.failed;
    } catch (err) {
      console.error(
        "[channels] Failed to send due-today notification to",
        row.userId,
        err
      );
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

// ─── Morning Briefing (Daily Digest) ────────────────────────────────────────

/**
 * Data gathered for a single user's morning briefing.
 */
interface BriefingData {
  questTitle: string | null;
  dueTasks: Array<{ id: string; title: string }>;
  streakCurrent: number;
  recentAchievements: Array<{ title: string; icon: string }>;
}

/**
 * Sends morning briefing (daily digest) notifications to all users who have
 *   - morning_briefing_enabled = true
 *   - morning_briefing_time matching the current 5-minute bucket (in their tz)
 *   - at least one delivery method (Web Push or notification channel)
 *
 * The briefing consolidates: daily quest, due-today tasks, current streak,
 * and achievements unlocked in the last 24 hours into one message.
 *
 * Always sends when enabled — even on a "light" day with nothing due, because
 * the user opted in to a daily ritual. Uses a motivational fallback message.
 *
 * Users with morning briefing enabled are excluded from the individual
 * daily-quest and due-today cron jobs to avoid duplicate pings.
 *
 * Called by the unified dispatcher in lib/cron.ts.
 *
 * @returns Object with sent and failed counts
 */
export async function sendMorningBriefingNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  let sent = 0;
  let failed = 0;

  // Time-bucket WHERE clause using morningBriefingTime (not notificationTime)
  const timeBucketCondition = and(
    eq(users.morningBriefingEnabled, true),
    sql`EXTRACT(HOUR FROM ${users.morningBriefingTime})
        = EXTRACT(HOUR FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC')))`,
    sql`FLOOR(EXTRACT(MINUTE FROM ${users.morningBriefingTime}) / 5)
        = FLOOR(EXTRACT(MINUTE FROM (NOW() AT TIME ZONE COALESCE(${users.timezone}, 'UTC'))) / 5)`
  );

  // Cache briefing data per user for multi-device + channel fan-out
  const briefingCache = new Map<string, BriefingData>();

  /** Fetch achievements unlocked in the last 24 hours for a user. */
  async function fetchRecentAchievements(
    userId: string
  ): Promise<Array<{ title: string; icon: string }>> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        title: achievements.title,
        icon: achievements.icon,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(
        and(
          eq(userAchievements.userId, userId),
          gte(userAchievements.earnedAt, cutoff)
        )
      )
      .orderBy(desc(userAchievements.earnedAt))
      .limit(5);
    return rows;
  }

  /** Resolve briefing data once per user, using cache. */
  async function resolveBriefing(
    userId: string,
    timezone: string | null,
    streakCurrent: number
  ): Promise<BriefingData> {
    if (briefingCache.has(userId)) return briefingCache.get(userId)!;

    const [questTitle, dueTasks, recentAchievements] = await Promise.all([
      getCurrentDailyQuest(userId).then(
        (q) => q?.title ?? null,
        () => null
      ),
      fetchDueTodayTasks(userId),
      fetchRecentAchievements(userId),
    ]);

    // If no existing quest, try to select one (triggers selection for the day)
    let finalQuestTitle = questTitle;
    if (!finalQuestTitle) {
      try {
        const quest = await selectDailyQuest(userId, timezone);
        finalQuestTitle = quest?.title ?? null;
      } catch {
        // Non-critical — briefing still sends without quest
      }
    }

    const data: BriefingData = {
      questTitle: finalQuestTitle,
      dueTasks,
      streakCurrent,
      recentAchievements,
    };
    briefingCache.set(userId, data);
    return data;
  }

  /** Build the briefing notification payload. */
  function buildPayload(data: BriefingData): NotificationPayload & ChannelPayload {
    const lines: string[] = [];

    if (data.questTitle) {
      const title = data.questTitle.length > 60
        ? `${data.questTitle.slice(0, 57)}...`
        : data.questTitle;
      lines.push(`🎯 Quest: ${title}`);
    }

    if (data.dueTasks.length > 0) {
      const preview = data.dueTasks.slice(0, 3).map((t) => t.title).join(", ");
      const remaining = data.dueTasks.length - 3;
      const suffix = remaining > 0 ? ` +${remaining}` : "";
      lines.push(`📋 Fällig: ${preview}${suffix}`);
    }

    if (data.streakCurrent > 0) {
      lines.push(`🔥 Streak: ${data.streakCurrent} Tage`);
    }

    if (data.recentAchievements.length > 0) {
      const achievementList = data.recentAchievements
        .map((a) => `${a.icon} ${a.title}`)
        .join(", ");
      lines.push(`🏆 Neu: ${achievementList}`);
    }

    const body = lines.length > 0
      ? lines.join(" · ")
      : "Keine Aufgaben heute — genieß den freien Tag! ☀️";

    return {
      title: "Guten Morgen! Dein Momo-Briefing",
      body,
      icon: "/icon-192.png",
      url: "/dashboard",
      tag: "morning-briefing",
    };
  }

  // ── Web Push block (only if VAPID is configured) ──
  if (isVapidConfigured()) {
    const eligibleSubscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        subscription: pushSubscriptions.subscription,
        timezone: users.timezone,
        streakCurrent: users.streakCurrent,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(and(eq(users.notificationEnabled, true), timeBucketCondition));

    for (const row of eligibleSubscriptions) {
      try {
        const data = await resolveBriefing(row.userId, row.timezone, row.streakCurrent);
        await sendPushNotification(
          row.userId,
          row.subscription as PushSubscriptionData,
          buildPayload(data)
        );
        sent++;
      } catch (err) {
        console.error("[push] Failed to send morning briefing to", row.userId, err);
        failed++;
      }
    }
  }

  // ── Notification channels block (ntfy, pushover, telegram, email) ──
  const channelUsers = await db
    .selectDistinct({
      userId: notificationChannels.userId,
      timezone: users.timezone,
      streakCurrent: users.streakCurrent,
    })
    .from(notificationChannels)
    .innerJoin(users, eq(notificationChannels.userId, users.id))
    .where(and(eq(notificationChannels.enabled, true), timeBucketCondition));

  for (const row of channelUsers) {
    try {
      const data = await resolveBriefing(row.userId, row.timezone, row.streakCurrent);
      const result = await sendToAllChannels(row.userId, buildPayload(data));
      sent += result.sent;
      failed += result.failed;
    } catch (err) {
      console.error("[channels] Failed to send morning briefing to", row.userId, err);
      failed++;
    }
  }

  return { sent, failed };
}

// ─── Streak Shield Notification ──────────────────────────────────────────────

/**
 * Sends a one-off notification to a single user informing them that their
 * streak shield was consumed and their streak was preserved.
 *
 * Fires via both Web Push (all registered devices) and all configured
 * notification channels (ntfy, pushover, telegram, email). Errors are
 * logged but never thrown — callers should fire-and-forget.
 *
 * @param userId        - The user whose shield was consumed
 * @param streakCurrent - The preserved streak length
 */
export async function sendStreakShieldNotification(
  userId: string,
  streakCurrent: number
): Promise<void> {
  const payload: NotificationPayload & ChannelPayload = {
    title: `Your streak shield saved your ${streakCurrent}-day streak! 🛡️`,
    body: "You missed a day, but your monthly Streak Shield kept your streak alive.",
    icon: "/icon-192.png",
    url: "/dashboard",
    tag: "streak-shield",
  };

  // Web Push
  if (isVapidConfigured()) {
    const subs = await db
      .select({ subscription: pushSubscriptions.subscription })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    for (const row of subs) {
      try {
        await sendPushNotification(
          userId,
          row.subscription as PushSubscriptionData,
          payload
        );
      } catch (err) {
        console.error("[push] Failed to send streak shield notification to", userId, err);
      }
    }
  }

  // Notification channels (ntfy, pushover, telegram, email)
  try {
    await sendToAllChannels(userId, payload);
  } catch (err) {
    console.error("[channels] Failed to send streak shield notification to", userId, err);
  }
}

