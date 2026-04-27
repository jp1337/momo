/**
 * Error-path tests for /api/push/devices (GET) and /api/push/devices/:id (PATCH, DELETE).
 *
 * The 500 catch blocks require the DB to throw.
 * @/lib/db is mocked with a Drizzle-compatible chain so individual
 * operations can be made to reject.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

const { mockSelect, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
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
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

import { resolveApiUser } from "@/lib/api-auth";
import { GET as devicesGET } from "@/app/api/push/devices/route";
import {
  PATCH as deviceByIdPATCH,
  DELETE as deviceByIdDELETE,
} from "@/app/api/push/devices/[id]/route";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
  mockSelect.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
});

function authAs(userId: string): void {
  mockAuth.mockResolvedValue({ userId, readonly: false } as ApiUser);
}

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

describe("GET /api/push/devices — error path", () => {
  it("returns 500 when the DB select throws an unexpected error", async () => {
    authAs("user-1");
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockRejectedValueOnce(new Error("DB error")),
        }),
      }),
    });

    const res = await devicesGET(
      new Request("http://localhost/api/push/devices") as never
    );
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/push/devices/:id — error path", () => {
  it("returns 500 when the DB update throws an unexpected error", async () => {
    authAs("user-2");
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValueOnce(new Error("DB error")),
        }),
      }),
    });

    const res = await deviceByIdPATCH(
      new Request(`http://localhost/api/push/devices/${FAKE_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/push/devices/:id — error path", () => {
  it("returns 500 when the DB delete throws an unexpected error", async () => {
    authAs("user-3");
    mockDelete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockRejectedValueOnce(new Error("DB error")),
      }),
    });

    const res = await deviceByIdDELETE(
      new Request(`http://localhost/api/push/devices/${FAKE_ID}`, {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: FAKE_ID }) }
    );
    expect(res.status).toBe(500);
  });
});
