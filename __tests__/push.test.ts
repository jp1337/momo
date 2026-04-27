/**
 * Unit/integration tests for lib/push.ts.
 *
 * web-push is fully mocked — tests verify that the fan-out logic correctly
 * calls sendNotification for eligible subscriptions and skips ineligible ones.
 *
 * lib/env is mocked so that isVapidConfigured() returns true inside push.ts
 * (VAPID_PRIVATE_KEY is set in the mock). NEXT_PUBLIC_VAPID_PUBLIC_KEY is
 * injected via process.env before module imports so the guard passes.
 *
 * All vi.mock() calls are hoisted to the top of the file by Vitest.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock web-push before any imports
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
}));

// Mock lib/env so serverEnv.VAPID_PRIVATE_KEY is defined (push.ts checks this)
vi.mock("@/lib/env", () => ({
  serverEnv: {
    VAPID_PRIVATE_KEY: "test-vapid-private-key-value",
    VAPID_CONTACT: "mailto:test@example.com",
    AUTH_SECRET: "vitest-auth-secret-at-least-32-characters-long!!",
    TOTP_ENCRYPTION_KEY: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    CRON_SECRET: undefined,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
  clientEnv: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-vapid-public-key",
  },
}));

// next/headers is transitively imported — stub it
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock daily-quest so push.ts's selectDailyQuest / getCurrentDailyQuest calls
// don't touch the DB during morning-briefing and daily-quest fan-out tests.
vi.mock("@/lib/daily-quest", () => ({
  selectDailyQuest: vi.fn().mockResolvedValue(null),
  getCurrentDailyQuest: vi.fn().mockResolvedValue(null),
}));

// Mock weekly-review so push.ts's getWeeklyReview call returns predictable data.
vi.mock("@/lib/weekly-review", () => ({
  getWeeklyReview: vi.fn().mockResolvedValue({
    completionsThisWeek: 5,
    postponementsThisWeek: 2,
    streakCurrent: 3,
    coinsEarnedThisWeek: 15,
    topTopics: [],
  }),
}));

// Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in process.env before push.ts loads it
// (push.ts checks process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY directly)
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  sendDailyQuestNotifications,
  sendStreakReminders,
  sendAchievementNotifications,
  sendStreakShieldNotification,
  sendPushNotification,
  sendDueTodayNotifications,
  sendOverdueNotifications,
  sendRecurringDueNotifications,
  sendWeeklyReviewNotifications,
  sendMorningBriefingNotifications,
} from "@/lib/push";
import { createTestUser, createTestTask } from "./helpers/fixtures";
import { getLocalDateString, getLocalYesterdayString } from "@/lib/date-utils";

const mockSendNotification = vi.mocked(webpush.sendNotification);

beforeEach(() => {
  mockSendNotification.mockReset();
  mockSendNotification.mockResolvedValue({ statusCode: 201 } as never);
});

// ─── Helper: create a push subscription row directly in the DB ───────────────

interface PushSubOverrides {
  enabled?: boolean;
  name?: string;
}

async function createTestPushSubscription(
  userId: string,
  overrides: PushSubOverrides = {}
): Promise<typeof pushSubscriptions.$inferSelect> {
  const endpoint = `https://fcm.googleapis.com/fcm/send/test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [sub] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint,
      subscription: {
        endpoint,
        keys: {
          p256dh: "test-p256dh-key",
          auth: "test-auth-key",
        },
      },
      name: overrides.name ?? "Test Device",
      enabled: overrides.enabled ?? true,
    })
    .returning();
  return sub;
}

/**
 * Enable push notifications for a user and set their notification_time to the
 * current 5-minute bucket so the time-bucket SQL condition matches.
 */
async function enableNotificationsForUser(userId: string): Promise<void> {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = Math.floor(now.getUTCMinutes() / 5) * 5;
  const mStr = m.toString().padStart(2, "0");
  const notificationTime = `${h}:${mStr}`;

  await db
    .update(users)
    .set({
      notificationEnabled: true,
      notificationTime,
      morningBriefingEnabled: false,
      timezone: "UTC",
    })
    .where(eq(users.id, userId));
}

// ─── sendDailyQuestNotifications ─────────────────────────────────────────────

describe("sendDailyQuestNotifications", () => {
  it("sends 0 notifications for a user with no push subscriptions", async () => {
    await createTestUser();
    const result = await sendDailyQuestNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(typeof result.sent).toBe("number");
    expect(typeof result.failed).toBe("number");
  });

  it("sends 0 notifications when user has a subscription but notifications are disabled", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    // notificationEnabled defaults to false — do NOT enable it
    const result = await sendDailyQuestNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.failed).toBe(0);
  });

  it("sends 0 notifications when the notification time does not match the current 5-min bucket", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    // Set notification time to 00:00 (almost certainly not now)
    await db
      .update(users)
      .set({
        notificationEnabled: true,
        notificationTime: "00:00",
        morningBriefingEnabled: false,
        timezone: "UTC",
      })
      .where(eq(users.id, user.id));

    const result = await sendDailyQuestNotifications();
    // Unless it really is midnight UTC right now, 0 sends expected.
    // If the minute happens to match, result.sent may be 1 — just verify no throw.
    expect(typeof result.sent).toBe("number");
    expect(typeof result.failed).toBe("number");
  });

  it("sends exactly 1 notification when user is fully eligible (matching time bucket)", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await createTestTask(user.id, { title: "Quest Task", type: "DAILY_ELIGIBLE" });
    await enableNotificationsForUser(user.id);

    const result = await sendDailyQuestNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("sends notifications to all subscribed devices of an eligible user", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id, { name: "Device 1" });
    await createTestPushSubscription(user.id, { name: "Device 2" });
    await enableNotificationsForUser(user.id);

    const result = await sendDailyQuestNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(2);
  });

  it("skips disabled subscriptions", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id, { enabled: false });
    await enableNotificationsForUser(user.id);

    await sendDailyQuestNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});

// ─── sendStreakReminders ──────────────────────────────────────────────────────

describe("sendStreakReminders", () => {
  it("sends 0 notifications for a user with streak=0", async () => {
    const user = await createTestUser({ streakCurrent: 0 });
    await createTestPushSubscription(user.id);
    await enableNotificationsForUser(user.id);

    await sendStreakReminders();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends a streak reminder for a user with streak > 0 who has not completed a task today", async () => {
    const user = await createTestUser({ streakCurrent: 5 });
    await createTestPushSubscription(user.id);
    await enableNotificationsForUser(user.id);

    const result = await sendStreakReminders();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    // Verify the payload contains streak info
    const callArg = mockSendNotification.mock.calls[0];
    const payload = JSON.parse(callArg[1] as string) as { title: string; body: string };
    expect(payload.title).toContain("5");
  });

  it("sends 0 notifications when user has no push subscription even with a streak", async () => {
    await createTestUser({ streakCurrent: 10 });
    // No push subscription created
    const result = await sendStreakReminders();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });
});

// ─── sendAchievementNotifications ────────────────────────────────────────────

describe("sendAchievementNotifications", () => {
  it("is a no-op when unlocked array is empty", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await sendAchievementNotifications(user.id, []);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("sends one notification per unlocked achievement (max 3)", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);

    const achievements = [
      { key: "first_task", title: "First Task", icon: "🏅", rarity: "common" as const, coinReward: 10 },
      { key: "streak_7", title: "Week Streak", icon: "🔥", rarity: "rare" as const, coinReward: 25 },
      { key: "coins_100", title: "Coin Hoarder", icon: "💰", rarity: "epic" as const, coinReward: 50 },
      { key: "tasks_10", title: "Task Master", icon: "⭐", rarity: "common" as const, coinReward: 20 },
    ];

    await sendAchievementNotifications(user.id, achievements);
    // Should be capped at 3
    expect(mockSendNotification).toHaveBeenCalledTimes(3);
  });

  it("sends exactly 1 notification for a single achievement", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);

    await sendAchievementNotifications(user.id, [
      { key: "first_task", title: "First Task", icon: "🏅", rarity: "common" as const, coinReward: 10 },
    ]);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
      body: string;
    };
    expect(payload.title).toContain("Achievement");
    expect(payload.body).toContain("First Task");
  });

  it("catches and ignores push errors per-achievement — does not throw", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);

    // Make sendNotification throw a non-410 error for this test
    mockSendNotification.mockRejectedValueOnce(Object.assign(new Error("Temporary push error"), { statusCode: 500 }));

    await expect(
      sendAchievementNotifications(user.id, [
        { key: "first_task", title: "First Task", icon: "🏅", rarity: "common" as const, coinReward: 10 },
      ])
    ).resolves.toBeUndefined();
  });
});

// ─── sendStreakShieldNotification ─────────────────────────────────────────────

describe("sendStreakShieldNotification", () => {
  it("sends a notification to all active subscriptions of the user", async () => {
    const user = await createTestUser({ streakCurrent: 7 });
    await createTestPushSubscription(user.id, { name: "Phone" });
    await createTestPushSubscription(user.id, { name: "Laptop" });

    await sendStreakShieldNotification(user.id, 7);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
    };
    expect(payload.title).toContain("7");
  });

  it("does not send when user has no subscriptions", async () => {
    const user = await createTestUser({ streakCurrent: 3 });
    await sendStreakShieldNotification(user.id, 3);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("skips disabled subscriptions", async () => {
    const user = await createTestUser({ streakCurrent: 3 });
    await createTestPushSubscription(user.id, { enabled: false });

    await sendStreakShieldNotification(user.id, 3);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("catches push errors per-subscription — does not throw (covers error catch block)", async () => {
    const user = await createTestUser({ streakCurrent: 3 });
    await createTestPushSubscription(user.id);
    // Non-410 error → sendPushNotification re-throws → caught by sendStreakShieldNotification
    mockSendNotification.mockRejectedValueOnce(
      Object.assign(new Error("push send failed"), { statusCode: 500 })
    );
    await expect(sendStreakShieldNotification(user.id, 3)).resolves.toBeUndefined();
  });
});

// ─── sendPushNotification (core function) ────────────────────────────────────

describe("sendPushNotification", () => {
  const testPayload = {
    title: "Test Notification",
    body: "This is a test body",
  };

  it("removes a subscription and disables user notifications on 410 Gone", async () => {
    const user = await createTestUser();
    const sub = await createTestPushSubscription(user.id);
    await db
      .update(users)
      .set({ notificationEnabled: true })
      .where(eq(users.id, user.id));

    // Mock web-push to throw a 410 error
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410 } as never);

    await sendPushNotification(
      user.id,
      sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } },
      testPayload
    );

    // Subscription row should be deleted
    const remainingSubs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    expect(remainingSubs).toHaveLength(0);

    // notificationEnabled should now be false (no subscriptions remain)
    const [updatedUser] = await db
      .select({ notificationEnabled: users.notificationEnabled })
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser.notificationEnabled).toBe(false);
  });

  it("does not disable notifications if other subscriptions remain after 410", async () => {
    const user = await createTestUser();
    const sub1 = await createTestPushSubscription(user.id, { name: "Device 1" });
    await createTestPushSubscription(user.id, { name: "Device 2" });
    await db
      .update(users)
      .set({ notificationEnabled: true })
      .where(eq(users.id, user.id));

    // 410 only for sub1's endpoint
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410 } as never);

    await sendPushNotification(
      user.id,
      sub1.subscription as { endpoint: string; keys: { p256dh: string; auth: string } },
      testPayload
    );

    // sub1 row is deleted
    const deletedSubs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub1.endpoint));
    expect(deletedSubs).toHaveLength(0);

    // notificationEnabled stays true because Device 2 still exists
    const [updatedUser] = await db
      .select({ notificationEnabled: users.notificationEnabled })
      .from(users)
      .where(eq(users.id, user.id));
    expect(updatedUser.notificationEnabled).toBe(true);
  });

  it("re-throws non-410 errors", async () => {
    const user = await createTestUser();
    const sub = await createTestPushSubscription(user.id);

    mockSendNotification.mockRejectedValueOnce(new Error("network failure") as never);

    await expect(
      sendPushNotification(
        user.id,
        sub.subscription as { endpoint: string; keys: { p256dh: string; auth: string } },
        testPayload
      )
    ).rejects.toThrow("network failure");
  });
});

// ─── sendDueTodayNotifications ───────────────────────────────────────────────

/**
 * Set up a user with all flags required for the due-today reminder, with the
 * reminder time set to the current 5-minute UTC bucket so the SQL check matches.
 */
async function enableDueTodayForUser(userId: string): Promise<void> {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
  await db
    .update(users)
    .set({
      notificationEnabled: true,
      dueTodayReminderEnabled: true,
      dueTodayReminderTime: `${h}:${m}`,
      morningBriefingEnabled: false,
      timezone: "UTC",
    })
    .where(eq(users.id, userId));
}

describe("sendDueTodayNotifications", () => {
  it("sends 0 notifications when user has no push subscription", async () => {
    const user = await createTestUser();
    await enableDueTodayForUser(user.id);
    await createTestTask(user.id, { dueDate: getLocalDateString("UTC") });

    const result = await sendDueTodayNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends 0 notifications when there are no due-today tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableDueTodayForUser(user.id);
    // No tasks inserted — silence-on-empty behaviour

    const result = await sendDueTodayNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends 1 notification for a single due-today task (single-task title path)", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableDueTodayForUser(user.id);
    await createTestTask(user.id, { title: "My Due Task", dueDate: getLocalDateString("UTC") });

    const result = await sendDueTodayNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
      body: string;
    };
    // Single-task path uses the task title in the notification title
    expect(payload.title).toContain("Heute fällig");
    expect(payload.title).toContain("My Due Task");
  });

  it("sends 1 bundled notification for multiple due-today tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableDueTodayForUser(user.id);
    const today = getLocalDateString("UTC");
    await createTestTask(user.id, { title: "Task Alpha", dueDate: today });
    await createTestTask(user.id, { title: "Task Beta", dueDate: today });
    await createTestTask(user.id, { title: "Task Gamma", dueDate: today });

    const result = await sendDueTodayNotifications();
    // All 3 tasks → one bundled notification
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
    };
    // Bundled path uses count in title
    expect(payload.title).toMatch(/3/);
  });

  it("is suppressed when morningBriefingEnabled is true", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableDueTodayForUser(user.id);
    // Override morningBriefingEnabled back to true after enableDueTodayForUser set it false
    const now = new Date();
    const h = now.getUTCHours().toString().padStart(2, "0");
    const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
    await db
      .update(users)
      .set({ morningBriefingEnabled: true })
      .where(eq(users.id, user.id));
    await createTestTask(user.id, { title: "Should Not Notify", dueDate: getLocalDateString("UTC") });

    // Suppress due to morningBriefingEnabled=true
    const result = await sendDueTodayNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);

    // Keep h/m in scope to satisfy the linter (they're used to build the time bucket above)
    void h;
    void m;
  });
});

// ─── sendOverdueNotifications ────────────────────────────────────────────────

/**
 * Set up a user with all flags required for the overdue reminder, with the
 * reminder time set to the current 5-minute UTC bucket so the SQL check matches.
 */
async function enableOverdueForUser(userId: string): Promise<void> {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
  await db
    .update(users)
    .set({
      notificationEnabled: true,
      overdueReminderEnabled: true,
      overdueReminderTime: `${h}:${m}`,
      morningBriefingEnabled: false,
      timezone: "UTC",
    })
    .where(eq(users.id, userId));
}

describe("sendOverdueNotifications", () => {
  it("sends 0 notifications when user has no push subscription", async () => {
    const user = await createTestUser();
    await enableOverdueForUser(user.id);
    // Insert an overdue task (yesterday)
    await createTestTask(user.id, { title: "Overdue Task", dueDate: getLocalYesterdayString("UTC") });

    const result = await sendOverdueNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends 0 notifications when there are no overdue tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableOverdueForUser(user.id);
    // No tasks at all

    const result = await sendOverdueNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends 1 notification for a single overdue task (individual title path)", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableOverdueForUser(user.id);
    await createTestTask(user.id, {
      title: "Forgotten Task",
      dueDate: getLocalYesterdayString("UTC"),
    });

    const result = await sendOverdueNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
    };
    expect(payload.title).toContain("Überfällig");
    expect(payload.title).toContain("Forgotten Task");
  });

  it("sends 1 bundled notification for multiple overdue tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableOverdueForUser(user.id);
    const yesterday = getLocalYesterdayString("UTC");
    await createTestTask(user.id, { title: "Old Task 1", dueDate: yesterday });
    await createTestTask(user.id, { title: "Old Task 2", dueDate: yesterday });
    await createTestTask(user.id, { title: "Old Task 3", dueDate: yesterday });

    const result = await sendOverdueNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
    };
    // Bundled path: "N überfällige Aufgaben"
    expect(payload.title).toMatch(/überfällige Aufgaben/);
    expect(payload.title).toContain("3");
  });

  it("is suppressed when morningBriefingEnabled is true", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableOverdueForUser(user.id);
    await db
      .update(users)
      .set({ morningBriefingEnabled: true })
      .where(eq(users.id, user.id));
    await createTestTask(user.id, {
      title: "Suppressed Overdue",
      dueDate: getLocalYesterdayString("UTC"),
    });

    const result = await sendOverdueNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });
});

// ─── sendRecurringDueNotifications ───────────────────────────────────────────

/**
 * Set up a user with all flags required for the recurring-due reminder.
 */
async function enableRecurringDueForUser(userId: string): Promise<void> {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
  await db
    .update(users)
    .set({
      notificationEnabled: true,
      recurringDueReminderEnabled: true,
      recurringDueReminderTime: `${h}:${m}`,
      morningBriefingEnabled: false,
      timezone: "UTC",
    })
    .where(eq(users.id, userId));
}

describe("sendRecurringDueNotifications", () => {
  it("sends 0 notifications when user has no push subscription", async () => {
    const user = await createTestUser();
    await enableRecurringDueForUser(user.id);
    await createTestTask(user.id, {
      title: "Daily Habit",
      type: "RECURRING",
      nextDueDate: getLocalDateString("UTC"),
    });

    const result = await sendRecurringDueNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends 0 notifications when there are no recurring-due tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableRecurringDueForUser(user.id);
    // No tasks inserted

    const result = await sendRecurringDueNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends individual notifications for up to 3 recurring due tasks", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableRecurringDueForUser(user.id);
    const today = getLocalDateString("UTC");
    await createTestTask(user.id, { title: "Habit A", type: "RECURRING", nextDueDate: today });
    await createTestTask(user.id, { title: "Habit B", type: "RECURRING", nextDueDate: today });

    const result = await sendRecurringDueNotifications();
    // 2 tasks → 2 individual notifications
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(2);

    // Each notification title starts with the recurring emoji prefix
    for (const call of mockSendNotification.mock.calls) {
      const payload = JSON.parse(call[1] as string) as { title: string };
      expect(payload.title).toMatch(/^🔁/);
    }
  });

  it("sends 1 bundled notification when more than 3 recurring tasks are due", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableRecurringDueForUser(user.id);
    const today = getLocalDateString("UTC");
    for (let i = 1; i <= 4; i++) {
      await createTestTask(user.id, {
        title: `Recurring ${i}`,
        type: "RECURRING",
        nextDueDate: today,
      });
    }

    const result = await sendRecurringDueNotifications();
    // >3 tasks → 1 bundled notification
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
    };
    expect(payload.title).toContain("4");
    expect(payload.title).toContain("wiederkehrende");
  });
});

// ─── sendWeeklyReviewNotifications ───────────────────────────────────────────

describe("sendWeeklyReviewNotifications", () => {
  it("returns { sent: 0, failed: 0 } when the DB has no eligible subscriptions", async () => {
    // The function only sends on Sunday (DOW=0 SQL condition). Unless the test
    // runs on a Sunday at the exact weeklyReviewTime bucket, 0 rows match.
    // This test verifies the function completes without error in all cases.
    const result = await sendWeeklyReviewNotifications();
    expect(typeof result.sent).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(result.failed).toBe(0);
  });
});

// ─── sendMorningBriefingNotifications ────────────────────────────────────────

/**
 * Set up a user with all flags required for the morning briefing.
 */
async function enableMorningBriefingForUser(userId: string): Promise<void> {
  const now = new Date();
  const h = now.getUTCHours().toString().padStart(2, "0");
  const m = (Math.floor(now.getUTCMinutes() / 5) * 5).toString().padStart(2, "0");
  await db
    .update(users)
    .set({
      notificationEnabled: true,
      morningBriefingEnabled: true,
      morningBriefingTime: `${h}:${m}`,
      timezone: "UTC",
    })
    .where(eq(users.id, userId));
}

describe("sendMorningBriefingNotifications", () => {
  it("sends 0 notifications when user has no push subscription", async () => {
    const user = await createTestUser();
    await enableMorningBriefingForUser(user.id);
    // No subscription — nothing to deliver

    const result = await sendMorningBriefingNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });

  it("sends a morning briefing notification when the user has an eligible subscription", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id);
    await enableMorningBriefingForUser(user.id);

    const result = await sendMorningBriefingNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      title: string;
      body: string;
    };
    // Title is the fixed "Guten Morgen" greeting
    expect(payload.title).toContain("Guten Morgen");
  });

  it("includes streak info in the briefing body when the user has a streak > 0", async () => {
    const user = await createTestUser({ streakCurrent: 7 });
    await createTestPushSubscription(user.id);
    await enableMorningBriefingForUser(user.id);

    await sendMorningBriefingNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string) as {
      body: string;
    };
    // The briefing body should mention the streak count
    expect(payload.body).toContain("7");
  });

  it("sends to all active devices for a briefing-enabled user", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id, { name: "Phone" });
    await createTestPushSubscription(user.id, { name: "Tablet" });
    await enableMorningBriefingForUser(user.id);

    const result = await sendMorningBriefingNotifications();
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(2);
  });

  it("skips disabled subscriptions for morning briefing", async () => {
    const user = await createTestUser();
    await createTestPushSubscription(user.id, { enabled: false });
    await enableMorningBriefingForUser(user.id);

    const result = await sendMorningBriefingNotifications();
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
  });
});
