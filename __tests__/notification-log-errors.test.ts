/**
 * Error-path test for lib/notification-log.ts logNotification().
 *
 * logNotification() is fire-and-forget: it calls db.insert().catch(...).
 * When the DB insert rejects, the .catch callback (line 52) runs but the
 * rejection is swallowed. This file uses a DB mock so the insert throws.
 */

import { vi, describe, it, expect } from "vitest";

const { mockInsert } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
}));

import { logNotification } from "@/lib/notification-log";

describe("logNotification — DB error path", () => {
  it("swallows DB errors without throwing (covers .catch callback on line 52)", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        catch: vi.fn((handler) => {
          // Synchronously invoke the .catch handler with a fake error
          handler(new Error("DB insert failed"));
          return Promise.resolve();
        }),
      }),
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Fire-and-forget — must not throw
    expect(() =>
      logNotification({
        userId: "user-1",
        channel: "email",
        title: "Test",
        status: "sent",
      })
    ).not.toThrow();

    // Wait a tick for any async work to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      "[notification-log] Failed to log notification:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
