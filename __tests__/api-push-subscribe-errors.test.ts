/**
 * Error-path tests for /api/push/subscribe (POST and DELETE).
 *
 * The 500 catch blocks in POST and DELETE require the DB to throw.
 * @/lib/db is mocked with a Drizzle-compatible chain so individual
 * operations can be made to reject.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockInsert, mockDelete } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiUser: vi.fn(),
  readonlyKeyResponse: () =>
    Response.json(
      { error: "Forbidden", message: "This API key is read-only." },
      { status: 403 }
    ),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("web-push", () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    delete: mockDelete,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

import { resolveApiUser } from "@/lib/api-auth";
import {
  POST as subscribePOST,
  DELETE as subscribeDELETE,
} from "@/app/api/push/subscribe/route";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
  mockInsert.mockReset();
  mockDelete.mockReset();
});

function authAs(userId: string): void {
  mockAuth.mockResolvedValue({ userId, readonly: false } as ApiUser);
}

const VALID_SUBSCRIPTION = {
  subscription: {
    endpoint: "https://fcm.googleapis.com/push/test-endpoint-abc123",
    keys: { p256dh: "dGVzdA==", auth: "dGVzdA==" },
  },
};

describe("POST /api/push/subscribe — error path", () => {
  it("returns 500 when the DB insert throws an unexpected error", async () => {
    authAs("user-1");
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockRejectedValueOnce(new Error("DB error")),
      }),
    });

    const res = await subscribePOST(
      new Request("http://localhost/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_SUBSCRIPTION),
      }) as never
    );
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/push/subscribe — error path", () => {
  it("returns 500 when the DB delete throws an unexpected error", async () => {
    authAs("user-2");
    mockDelete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValueOnce(new Error("DB error")),
      }),
    });

    const res = await subscribeDELETE(
      new Request("http://localhost/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: "https://fcm.googleapis.com/push/test" }),
      }) as never
    );
    expect(res.status).toBe(500);
  });
});
