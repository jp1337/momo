/**
 * Error-path tests for lib/tasks.ts → createTask / updateTask / deleteTask
 * webhook fire-and-forget catch blocks, and updateTask field coverage.
 *
 * Lines covered:
 *   309 — createTask: fireWebhookEvent rejects
 *   358 — updateTask: recurrenceFixed field update path
 *   381 — updateTask: fireWebhookEvent rejects
 *   416 — deleteTask: fireWebhookEvent rejects
 *
 * fireWebhookEvent is mocked to always reject so the catch blocks run on
 * every task mutation. The actual DB operations use the real test DB.
 */

import { vi, describe, it, expect } from "vitest";

// fireWebhookEvent always rejects → covers lines 309, 381, 416
vi.mock("@/lib/webhooks", () => ({
  fireWebhookEvent: vi.fn().mockRejectedValue(new Error("webhook fire failed")),
}));

import { createTask, updateTask, deleteTask } from "@/lib/tasks";
import { createTestUser, createTestTask } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

describe("task mutations — webhook fire-and-forget error paths", () => {
  it("createTask swallows webhook fire errors without throwing (covers line 309)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const task = await createTask(user.id, { title: "Webhook error task", type: "ONE_TIME" }, TZ);
    await new Promise((r) => setTimeout(r, 50));

    expect(task).toBeDefined();
    expect(task.title).toBe("Webhook error task");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[createTask] webhook failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("updateTask swallows webhook fire errors without throwing (covers line 381)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const updated = await updateTask(task.id, user.id, { title: "Updated title" });
    await new Promise((r) => setTimeout(r, 50));

    expect(updated).toBeDefined();
    expect(updated.title).toBe("Updated title");
    expect(consoleSpy).toHaveBeenCalledWith(
      "[updateTask] webhook failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("deleteTask swallows webhook fire errors without throwing (covers line 416)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, { type: "ONE_TIME" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await deleteTask(task.id, user.id);
    await new Promise((r) => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledWith(
      "[deleteTask] webhook failed (non-fatal):",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("updateTask persists recurrenceFixed when provided (covers line 358)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceFixed: false,
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const updated = await updateTask(task.id, user.id, { recurrenceFixed: true });
    await new Promise((r) => setTimeout(r, 50));

    expect(updated.recurrenceFixed).toBe(true);
    consoleSpy.mockRestore();
  });

  it("updateTask sets recurrenceWeekdays to null when passed null (covers line 354)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const task = await createTestTask(user.id, {
      type: "RECURRING",
      recurrenceType: "INTERVAL",
      recurrenceWeekdays: "[0,1]",
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const updated = await updateTask(task.id, user.id, { recurrenceWeekdays: null });
    await new Promise((r) => setTimeout(r, 50));

    expect(updated.recurrenceWeekdays).toBeNull();
    consoleSpy.mockRestore();
  });
});
