/**
 * Integration tests for lib/users.ts.
 *
 * Covers: deleteUser (cascade, not-found error),
 * updateUserProfile (name, email uniqueness enforcement).
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users, tasks, topics } from "@/lib/db/schema";
import { deleteUser, updateUserProfile } from "@/lib/users";
import { createTestUser, createTestTopic, createTestTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe("deleteUser", () => {
  it("removes the user row from the database", async () => {
    const user = await createTestUser({ timezone: TZ });

    await deleteUser(user.id);

    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row).toBeUndefined();
  });

  it("throws 'User not found' for a non-existent user ID", async () => {
    await expect(
      deleteUser("00000000-0000-0000-0000-000000000000")
    ).rejects.toThrow("User not found");
  });

  it("cascades to tasks when user is deleted", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { title: "Cascade Task" });

    await deleteUser(user.id);

    const [taskRow] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.id, task.id));
    expect(taskRow).toBeUndefined();
  });

  it("cascades to topics when user is deleted", async () => {
    const user = await createTestUser({ timezone: TZ });
    const topic = await createTestTopic(user.id, { title: "Cascade Topic" });

    await deleteUser(user.id);

    const [topicRow] = await db
      .select({ id: topics.id })
      .from(topics)
      .where(eq(topics.id, topic.id));
    expect(topicRow).toBeUndefined();
  });
});

// ─── updateUserProfile ────────────────────────────────────────────────────────

describe("updateUserProfile", () => {
  it("updates the user's name", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await updateUserProfile(user.id, { name: "New Name" });
    expect(result.name).toBe("New Name");

    const [row] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row.name).toBe("New Name");
  });

  it("updates the user's email when it is not taken", async () => {
    const user = await createTestUser({ timezone: TZ });

    const result = await updateUserProfile(user.id, {
      email: `new-${Date.now()}@example.com`,
    });
    expect(result.email).toMatch(/@example\.com$/);
  });

  it("throws EMAIL_TAKEN when the email belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    // userB tries to claim userA's email
    await expect(
      updateUserProfile(userB.id, { email: userA.email! })
    ).rejects.toThrow("EMAIL_TAKEN");
  });

  it("allows updating email to the same address (no-op for uniqueness check)", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Should not throw — same user's own email
    await expect(
      updateUserProfile(user.id, { email: user.email! })
    ).resolves.not.toThrow();
  });
});
