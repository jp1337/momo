/**
 * Error-path tests for lib/push.ts → sendStreakShieldNotification and
 * sendAchievementNotifications when sendToAllChannels rejects.
 *
 * Lines covered:
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

import { sendStreakShieldNotification, sendAchievementNotifications } from "@/lib/push";
import { createTestUser } from "./helpers/fixtures";
import type { UnlockedAchievement } from "@/lib/gamification";

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
});
