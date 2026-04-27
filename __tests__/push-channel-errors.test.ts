/**
 * Error-path tests for lib/push.ts when sendToAllChannels rejects.
 *
 * Lines covered:
 *   1369-1376 — sendMorningBriefingNotifications: notification channels loop + catch
 *   1432 — sendStreakShieldNotification: sendToAllChannels catch block
 *   1489 — sendAchievementNotifications: sendToAllChannels catch block
 *
 * A separate file is required because vi.mock() is hoisted, and here we need
 * @/lib/notifications to throw rather than the silent success in push.test.ts.
 */

import { vi, describe, it, expect } from "vitest";

// Make sendToAllChannels always reject → covers lines 1432 and 1489
vi.mock("@/lib/notifications", () => ({
  sendToAllChannels: vi.fn().mockRejectedValue(new Error("channels failed")),
  isEmailChannelAvailable: vi.fn().mockReturnValue(false),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
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

import webpush from "web-push";
import {
  sendStreakShieldNotification,
  sendAchievementNotifications,
  sendMorningBriefingNotifications,
} from "@/lib/push";
import { db } from "@/lib/db";
import { users, notificationChannels, pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createTestUser } from "./helpers/fixtures";
import type { UnlockedAchievement } from "@/lib/gamification";

/** Mirror of push.test.ts helper — sets morningBriefingTime to the current UTC time bucket */
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

describe("push — sendToAllChannels error paths", () => {
  it("sendStreakShieldNotification swallows sendToAllChannels errors (covers line 1432)", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendStreakShieldNotification(user.id, 5)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send streak shield notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("sendAchievementNotifications swallows sendToAllChannels errors (covers line 1489)", async () => {
    const user = await createTestUser({ timezone: "Europe/Berlin" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const achievement: UnlockedAchievement = {
      key: "first_task",
      title: "First Task",
      icon: "🏅",
      rarity: "common",
      coinReward: 10,
    };

    await expect(
      sendAchievementNotifications(user.id, [achievement])
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send achievement notification to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("sendMorningBriefingNotifications catches push subscription send errors (covers line 1352)", async () => {
    // isVapidConfigured() reads process.env directly, not clientEnv — stub it here
    const origKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public-key";

    const user = await createTestUser({ timezone: "UTC" });
    await enableMorningBriefingForUser(user.id);

    const endpoint = `https://fcm.googleapis.com/push/${user.id}`;
    await db.insert(pushSubscriptions).values({
      userId: user.id,
      endpoint,
      subscription: { endpoint, keys: { p256dh: "test-p256dh", auth: "test-auth" } },
      enabled: true,
    });

    // Make webpush.sendNotification reject — sendPushNotification re-throws non-410 errors
    vi.mocked(webpush.sendNotification).mockRejectedValueOnce(new Error("push delivery failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendMorningBriefingNotifications();

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[push] Failed to send morning briefing to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origKey;
  });

  it("sendMorningBriefingNotifications catches notification channel send errors (covers lines 1369-1376)", async () => {
    const user = await createTestUser({ timezone: "UTC" });
    await enableMorningBriefingForUser(user.id);

    // Insert an active notification channel (sendToAllChannels is mocked to reject)
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "test-topic" },
      enabled: true,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendMorningBriefingNotifications();

    // sendToAllChannels always rejects in this file → catch block fires → failed++
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[channels] Failed to send morning briefing to",
      user.id,
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
