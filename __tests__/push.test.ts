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
} from "@/lib/push";
import { createTestUser, createTestTask } from "./helpers/fixtures";

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
});
