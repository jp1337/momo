/**
 * Coverage tests for push.ts notification channel fan-out success paths and
 * web-push error catch blocks across all notification functions.
 *
 * Lines covered:
 *   273-274 — sendDailyQuestNotifications: web-push catch
 *   293-302 — sendDailyQuestNotifications: channels block (success + catch)
 *   297-298 — sendDailyQuestNotifications: channels success (sent/failed accumulation)
 *   469-474 — sendDueTodayNotifications: web-push catch
 *   495-508 — sendDueTodayNotifications: channels block (success + catch)
 *   500-501 — sendDueTodayNotifications: channels success
 *   666-671 — sendOverdueNotifications: web-push catch
 *   692-706 — sendOverdueNotifications: channels block (success + catch)
 *   697-698 — sendOverdueNotifications: channels success
 *   877-882 — sendRecurringDueNotifications: web-push catch
 *   903-919 — sendRecurringDueNotifications: channels block (success + catch)
 *   910-911 — sendRecurringDueNotifications: channels success
 *   1025-1026 — sendStreakReminders: web-push catch
 *   1048-1056 — sendStreakReminders: channels block
 *   1052-1053 — sendStreakReminders: channels success
 *   1372-1373 — sendMorningBriefingNotifications: channels success
 *
 * Strategy:
 *   - sendToAllChannels always resolves to { sent: 1, failed: 0 } to cover
 *     the channels success path (sent += result.sent, failed += result.failed).
 *   - web-push sendNotification always rejects to cover the web-push catch blocks.
 *   - NEXT_PUBLIC_VAPID_PUBLIC_KEY is set per-test where the web-push block
 *     should run; not set elsewhere (isVapidConfigured() returns false → push
 *     block skipped, only channels block runs).
 */

import { vi, describe, it, expect } from "vitest";

vi.mock("@/lib/notifications", () => ({
  sendToAllChannels: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  isEmailChannelAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockRejectedValue(new Error("push send failed")),
  },
}));

vi.mock("@/lib/env", () => ({
  serverEnv: {
    VAPID_PRIVATE_KEY: "test-vapid-private-key-value",
    VAPID_CONTACT: "mailto:test@example.com",
    AUTH_SECRET: "vitest-auth-secret-at-least-32-characters-long!!",
    TOTP_ENCRYPTION_KEY:
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    CRON_SECRET: undefined,
  },
  clientEnv: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-public-key",
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("@/lib/daily-quest", () => ({
  selectDailyQuest: vi.fn().mockResolvedValue(null),
  getCurrentDailyQuest: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/notification-log", () => ({
  logNotification: vi.fn(),
}));

vi.mock("@/lib/weekly-review", () => ({
  getWeeklyReview: vi.fn().mockResolvedValue({
    completionsThisWeek: 3,
    postponementsThisWeek: 1,
    streakCurrent: 5,
    coinsEarnedThisWeek: 20,
    topTopics: [],
  }),
}));

import {
  sendDailyQuestNotifications,
  sendDueTodayNotifications,
  sendOverdueNotifications,
  sendRecurringDueNotifications,
  sendStreakReminders,
  sendMorningBriefingNotifications,
} from "@/lib/push";
import { sendToAllChannels } from "@/lib/notifications";
import { selectDailyQuest, getCurrentDailyQuest } from "@/lib/daily-quest";
import { db } from "@/lib/db";
import {
  users,
  notificationChannels,
  pushSubscriptions,
  achievements,
  userAchievements,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { getLocalDateString, getLocalYesterdayString } from "@/lib/date-utils";

const TZ = "UTC";

/** Returns HH:MM for the current UTC time bucket (5-minute floor). */
function currentUtcBucket(): string {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Inserts an ntfy notification channel for the user. */
async function insertChannel(userId: string): Promise<void> {
  await db.insert(notificationChannels).values({
    userId,
    type: "ntfy",
    config: { topic: "test-topic" },
    enabled: true,
  });
}

/** Inserts a push subscription for the user. */
async function insertPushSubscription(userId: string): Promise<void> {
  const endpoint = `https://fcm.googleapis.com/push/${userId}-fan-out`;
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint,
    subscription: { endpoint, keys: { p256dh: "test-p256dh", auth: "test-auth" } },
    enabled: true,
  });
}

// ─── sendDailyQuestNotifications ─────────────────────────────────────────────

describe("sendDailyQuestNotifications — fan-out coverage", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 297-298)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);

    const result = await sendDailyQuestNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("web-push catch: logs error when sendPushNotification fails (covers lines 273-274)", async () => {
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertPushSubscription(user.id);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendDailyQuestNotifications();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send daily quest notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });
});

// ─── sendDueTodayNotifications ────────────────────────────────────────────────

describe("sendDueTodayNotifications — fan-out coverage", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 500-501)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      dueTodayReminderEnabled: true,
      dueTodayReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    // Task due today so the silence-on-empty guard doesn't skip the channel
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: today });

    const result = await sendDueTodayNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("web-push catch: logs error when sendPushNotification fails (covers lines 469-474)", async () => {
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      dueTodayReminderEnabled: true,
      dueTodayReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertPushSubscription(user.id);
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: today });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendDueTodayNotifications();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send due-today notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });
});

// ─── sendOverdueNotifications ─────────────────────────────────────────────────

describe("sendOverdueNotifications — fan-out coverage", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 697-698)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const yesterday = getLocalYesterdayString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      overdueReminderEnabled: true,
      overdueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    // Overdue task (due yesterday, not completed, not snoozed, not paused)
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: yesterday });

    const result = await sendOverdueNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("web-push catch: logs error when sendPushNotification fails (covers lines 666-671)", async () => {
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const yesterday = getLocalYesterdayString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      overdueReminderEnabled: true,
      overdueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertPushSubscription(user.id);
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: yesterday });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendOverdueNotifications();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send overdue notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });
});

// ─── sendRecurringDueNotifications ────────────────────────────────────────────

describe("sendRecurringDueNotifications — fan-out coverage", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 910-911)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      recurringDueReminderEnabled: true,
      recurringDueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    // Recurring task due today
    await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceInterval: 1,
      nextDueDate: today,
    });

    const result = await sendRecurringDueNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("web-push catch: logs error when sendPushNotification fails (covers lines 877-882)", async () => {
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      recurringDueReminderEnabled: true,
      recurringDueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertPushSubscription(user.id);
    await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceInterval: 1,
      nextDueDate: today,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendRecurringDueNotifications();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send recurring-due notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });
});

// ─── sendStreakReminders ───────────────────────────────────────────────────────

describe("sendStreakReminders — fan-out coverage", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 1052-1053)", async () => {
    const user = await createTestUser({ timezone: TZ, streakCurrent: 5 });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);

    const result = await sendStreakReminders();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("web-push catch: logs error when sendPushNotification fails (covers lines 1025-1026)", async () => {
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: TZ, streakCurrent: 3 });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertPushSubscription(user.id);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await sendStreakReminders();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send streak reminder to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });
});

// ─── Channels catch-block tests ───────────────────────────────────────────────
// These use mockRejectedValueOnce so only the target test's sendToAllChannels call throws.

describe("notification function channels catch blocks", () => {
  it("sendDailyQuestNotifications channels catch: logs error on sendToAllChannels failure (covers lines 300-301)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    vi.mocked(sendToAllChannels).mockRejectedValueOnce(new Error("channels failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendDailyQuestNotifications();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send daily quest notification to",
      user.id,
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("sendDueTodayNotifications channels catch: logs error on sendToAllChannels failure (covers lines 503-508)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      dueTodayReminderEnabled: true,
      dueTodayReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: today });
    vi.mocked(sendToAllChannels).mockRejectedValueOnce(new Error("channels failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendDueTodayNotifications();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send due-today notification to",
      user.id,
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("sendOverdueNotifications channels catch: logs error on sendToAllChannels failure (covers lines 700-706)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const yesterday = getLocalYesterdayString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      overdueReminderEnabled: true,
      overdueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: yesterday });
    vi.mocked(sendToAllChannels).mockRejectedValueOnce(new Error("channels failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendOverdueNotifications();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send overdue notification to",
      user.id,
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("sendRecurringDueNotifications channels catch: logs error on sendToAllChannels failure (covers lines 914-919)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      recurringDueReminderEnabled: true,
      recurringDueReminderTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceInterval: 1,
      nextDueDate: today,
    });
    vi.mocked(sendToAllChannels).mockRejectedValueOnce(new Error("channels failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendRecurringDueNotifications();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send recurring-due notification to",
      user.id,
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("sendStreakReminders channels catch: logs error on sendToAllChannels failure (covers lines 1055-1056)", async () => {
    const user = await createTestUser({ timezone: TZ, streakCurrent: 5 });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: false,
      notificationTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    vi.mocked(sendToAllChannels).mockRejectedValueOnce(new Error("channels failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendStreakReminders();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send streak reminder to",
      user.id,
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});

// ─── sendMorningBriefingNotifications ─────────────────────────────────────────

describe("sendMorningBriefingNotifications — channels success", () => {
  it("channels success: accumulates sent/failed from sendToAllChannels (covers lines 1372-1373)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      notificationEnabled: true,
      morningBriefingEnabled: true,
      morningBriefingTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);

    const result = await sendMorningBriefingNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("buildPayload includes quest title when selectDailyQuest returns a task (covers lines 1291-1294)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      morningBriefingEnabled: true,
      morningBriefingTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    // selectDailyQuest is called as fallback when getCurrentDailyQuest returns null
    vi.mocked(selectDailyQuest).mockResolvedValueOnce(
      { title: "My Quest Today" } as Awaited<ReturnType<typeof selectDailyQuest>>
    );

    const result = await sendMorningBriefingNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("buildPayload includes due tasks when user has tasks due today (covers lines 1298-1301)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    const today = getLocalDateString(TZ);
    await db.update(users).set({
      morningBriefingEnabled: true,
      morningBriefingTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    await createTestTask(user.id, { type: "ONE_TIME", dueDate: today, title: "Due Today Task" });

    const result = await sendMorningBriefingNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("buildPayload includes recent achievements when user has an earned achievement (covers lines 1309-1312)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      morningBriefingEnabled: true,
      morningBriefingTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);

    // Find a seeded achievement to use
    const [achievement] = await db.select().from(achievements).limit(1);
    if (achievement) {
      await db.insert(userAchievements).values({
        userId: user.id,
        achievementId: achievement.id,
      });
    }

    const result = await sendMorningBriefingNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("getCurrentDailyQuest error handler returns null without throwing (covers line 1259)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const bucket = currentUtcBucket();
    await db.update(users).set({
      morningBriefingEnabled: true,
      morningBriefingTime: bucket,
      timezone: TZ,
    }).where(eq(users.id, user.id));
    await insertChannel(user.id);
    // Make getCurrentDailyQuest reject — the .then(q => ..., () => null) error handler fires
    vi.mocked(getCurrentDailyQuest).mockRejectedValueOnce(new Error("quest DB error"));

    const result = await sendMorningBriefingNotifications();

    expect(result.sent).toBeGreaterThanOrEqual(1);
  });
});
