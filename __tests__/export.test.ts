/**
 * Integration tests for lib/export.ts.
 *
 * Covers: exportUserData shape and section completeness, user data isolation
 * (no cross-user leakage), and the not-found error for unknown userIds.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";
import { exportUserData } from "@/lib/export";
import {
  createTestUser,
  createTestTask,
  createTestTopic,
  createTestWishlistItem,
} from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── exportUserData ───────────────────────────────────────────────────────────

describe("exportUserData", () => {
  it("throws when the user does not exist", async () => {
    await expect(
      exportUserData("00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow("User not found");
  });

  it("returns an object with all required top-level sections", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await exportUserData(user.id);

    expect(result.version).toBe("1");
    expect(typeof result.exportedAt).toBe("string");
    expect(result.profile).toBeDefined();
    expect(Array.isArray(result.topics)).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(Array.isArray(result.taskCompletions)).toBe(true);
    expect(Array.isArray(result.wishlistItems)).toBe(true);
    expect(Array.isArray(result.achievements)).toBe(true);
    expect(Array.isArray(result.notificationLog)).toBe(true);
  });

  it("exportedAt is a valid ISO 8601 timestamp", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await exportUserData(user.id);

    expect(() => new Date(result.exportedAt)).not.toThrow();
    expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
  });

  it("profile contains key user fields", async () => {
    const user = await createTestUser({ timezone: TZ, coins: 77, level: 4 });

    const result = await exportUserData(user.id);

    expect(result.profile.id).toBe(user.id);
    expect(result.profile.coins).toBe(77);
    expect(result.profile.level).toBe(4);
    expect(result.profile.createdAt).toBeInstanceOf(Date);
  });

  it("tasks section includes tasks belonging to the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTask(user.id, { title: "My Task" });

    const result = await exportUserData(user.id);

    expect(result.tasks.some((t) => t.title === "My Task")).toBe(true);
  });

  it("topics section includes topics belonging to the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestTopic(user.id, { title: "My Topic" });

    const result = await exportUserData(user.id);

    expect(result.topics.some((t) => t.title === "My Topic")).toBe(true);
  });

  it("taskCompletions section includes completion records", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id);
    await db.insert(taskCompletions).values({
      taskId: task.id,
      userId: user.id,
      completedAt: new Date(),
    });

    const result = await exportUserData(user.id);

    expect(result.taskCompletions.some((c) => c.taskId === task.id)).toBe(true);
  });

  it("wishlistItems section includes wishlist entries", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createTestWishlistItem(user.id, { title: "Export Item" });

    const result = await exportUserData(user.id);

    expect(result.wishlistItems.some((i) => i.title === "Export Item")).toBe(true);
  });

  it("user with no data returns empty arrays for all collection sections", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await exportUserData(user.id);

    expect(result.topics).toHaveLength(0);
    expect(result.tasks).toHaveLength(0);
    expect(result.taskCompletions).toHaveLength(0);
    expect(result.wishlistItems).toHaveLength(0);
    expect(result.achievements).toHaveLength(0);
    expect(result.notificationLog).toHaveLength(0);
  });

  it("isolates data by user — another user's data is not exported", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createTestTask(userA.id, { title: "Private Task" });
    await createTestWishlistItem(userA.id, { title: "Private Item" });

    const result = await exportUserData(userB.id);

    expect(result.tasks.some((t) => t.title === "Private Task")).toBe(false);
    expect(result.wishlistItems.some((i) => i.title === "Private Item")).toBe(false);
  });
});
