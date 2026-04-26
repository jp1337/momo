/**
 * Integration tests for the Push Notification API routes.
 *
 * Covers:
 *   POST/PATCH/DELETE /api/push/subscribe
 *   GET               /api/push/devices
 *   PATCH/DELETE      /api/push/devices/:id
 *   POST              /api/push/test
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

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

import { resolveApiUser } from "@/lib/api-auth";
import {
  POST as subscribePOST,
  PATCH as subscribePATCH,
  DELETE as subscribeDELETE,
} from "@/app/api/push/subscribe/route";
import { GET as devicesGET } from "@/app/api/push/devices/route";
import {
  PATCH as deviceByIdPATCH,
  DELETE as deviceByIdDELETE,
} from "@/app/api/push/devices/[id]/route";
import { POST as pushTestPOST } from "@/app/api/push/test/route";
import { createTestUser } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);

beforeEach(() => {
  mockAuth.mockReset();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function req(method: string, url: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function asUser(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

/** A valid FCM push subscription object for test purposes. */
const VALID_SUBSCRIPTION = {
  subscription: {
    endpoint: "https://fcm.googleapis.com/push/test-endpoint-abc123",
    keys: {
      p256dh: "dGVzdA==",
      auth: "dGVzdA==",
    },
  },
  timezone: "Europe/Berlin",
};

// ─── POST /api/push/subscribe ─────────────────────────────────────────────────

describe("POST /api/push/subscribe", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    expect(res.status).toBe(403);
  });

  it("returns 422 when subscription keys are missing", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePOST(
      req("POST", "/api/push/subscribe", {
        subscription: { endpoint: "https://fcm.googleapis.com/push/test" },
      }) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 400 for non-HTTPS endpoint", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePOST(
      req("POST", "/api/push/subscribe", {
        subscription: {
          endpoint: "http://fcm.googleapis.com/push/test",
          keys: { p256dh: "dGVzdA==", auth: "dGVzdA==" },
        },
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-allowlisted push host", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePOST(
      req("POST", "/api/push/subscribe", {
        subscription: {
          endpoint: "https://attacker.example.com/push/test",
          keys: { p256dh: "dGVzdA==", auth: "dGVzdA==" },
        },
      }) as never
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with valid FCM subscription", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 idempotently when subscribing twice with same endpoint", async () => {
    const user = await createTestUser();
    asUser(user.id);
    await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    asUser(user.id);
    const res = await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    expect(res.status).toBe(200);
  });
});

// ─── PATCH /api/push/subscribe ────────────────────────────────────────────────

describe("PATCH /api/push/subscribe", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", { notificationTime: "08:00" }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", { notificationTime: "08:00" }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when no field is provided", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", {}) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 when updating notificationTime", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", { notificationTime: "08:00" }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when updating timezone", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", { timezone: "America/New_York" }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when updating multiple fields", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribePATCH(
      req("PATCH", "/api/push/subscribe", {
        notificationTime: "08:00",
        timezone: "Europe/Berlin",
        dueTodayReminderEnabled: true,
        morningBriefingEnabled: false,
      }) as never
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/push/subscribe ───────────────────────────────────────────────

describe("DELETE /api/push/subscribe", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await subscribeDELETE(
      req("DELETE", "/api/push/subscribe", {
        endpoint: "https://fcm.googleapis.com/push/test-endpoint-abc123",
      }) as never
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await subscribeDELETE(
      req("DELETE", "/api/push/subscribe", {
        endpoint: "https://fcm.googleapis.com/push/test-endpoint-abc123",
      }) as never
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when endpoint is missing", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribeDELETE(
      req("DELETE", "/api/push/subscribe", {}) as never
    );
    expect(res.status).toBe(422);
  });

  it("returns 200 after deleting existing subscription", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // First subscribe
    await subscribePOST(req("POST", "/api/push/subscribe", VALID_SUBSCRIPTION) as never);
    // Then unsubscribe
    asUser(user.id);
    const res = await subscribeDELETE(
      req("DELETE", "/api/push/subscribe", {
        endpoint: VALID_SUBSCRIPTION.subscription.endpoint,
      }) as never
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 even if endpoint was not in DB (idempotent)", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await subscribeDELETE(
      req("DELETE", "/api/push/subscribe", {
        endpoint: "https://fcm.googleapis.com/push/nonexistent-endpoint",
      }) as never
    );
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/push/devices ────────────────────────────────────────────────────

describe("GET /api/push/devices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await devicesGET(req("GET", "/api/push/devices") as never);
    expect(res.status).toBe(401);
  });

  it("returns empty devices list for new user", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await devicesGET(req("GET", "/api/push/devices") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("devices");
    expect(Array.isArray(body.devices)).toBe(true);
    expect(body.devices).toHaveLength(0);
  });

  it("returns registered device after subscribing", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Subscribe first
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: "https://fcm.googleapis.com/push/devices-test-endpoint",
      },
    }) as never);
    // List devices
    asUser(user.id);
    const res = await devicesGET(req("GET", "/api/push/devices") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.devices.length).toBeGreaterThan(0);
    expect(body.devices[0]).toHaveProperty("id");
    expect(body.devices[0]).toHaveProperty("endpoint");
    // Raw subscription keys must not leak
    expect(body.devices[0]).not.toHaveProperty("subscription");
  });
});

// ─── PATCH /api/push/devices/:id ─────────────────────────────────────────────

describe("PATCH /api/push/devices/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${fakeId}`, { enabled: false }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${fakeId}`, { enabled: false }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 422 when no field is provided", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${fakeId}`, {}) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(422);
  });

  it("returns 404 for non-existent device", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${fakeId}`, { enabled: false }) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 when disabling a device", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Register a subscription
    const uniqueEndpoint = "https://fcm.googleapis.com/push/patch-device-test";
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: uniqueEndpoint,
      },
    }) as never);
    // Get device id
    asUser(user.id);
    const devicesRes = await devicesGET(req("GET", "/api/push/devices") as never);
    const devicesBody = await devicesRes.json();
    const device = devicesBody.devices.find((d: { endpoint: string }) => d.endpoint === uniqueEndpoint);
    expect(device).toBeDefined();
    // Disable the device
    asUser(user.id);
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${device.id}`, { enabled: false }) as never,
      { params: Promise.resolve({ id: device.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 200 when renaming a device", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Register a subscription
    const uniqueEndpoint = "https://fcm.googleapis.com/push/rename-device-test";
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: uniqueEndpoint,
      },
    }) as never);
    // Get device id
    asUser(user.id);
    const devicesRes = await devicesGET(req("GET", "/api/push/devices") as never);
    const devicesBody = await devicesRes.json();
    const device = devicesBody.devices.find((d: { endpoint: string }) => d.endpoint === uniqueEndpoint);
    expect(device).toBeDefined();
    // Rename the device
    asUser(user.id);
    const res = await deviceByIdPATCH(
      req("PATCH", `/api/push/devices/${device.id}`, { name: "My Phone" }) as never,
      { params: Promise.resolve({ id: device.id }) }
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/push/devices/:id ────────────────────────────────────────────

describe("DELETE /api/push/devices/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdDELETE(
      req("DELETE", `/api/push/devices/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdDELETE(
      req("DELETE", `/api/push/devices/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent device", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await deviceByIdDELETE(
      req("DELETE", `/api/push/devices/${fakeId}`) as never,
      { params: Promise.resolve({ id: fakeId }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 when deleting own device", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Register a subscription
    const uniqueEndpoint = "https://fcm.googleapis.com/push/delete-device-test";
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: uniqueEndpoint,
      },
    }) as never);
    // Get device id
    asUser(user.id);
    const devicesRes = await devicesGET(req("GET", "/api/push/devices") as never);
    const devicesBody = await devicesRes.json();
    const device = devicesBody.devices.find((d: { endpoint: string }) => d.endpoint === uniqueEndpoint);
    expect(device).toBeDefined();
    // Delete the device
    asUser(user.id);
    const res = await deviceByIdDELETE(
      req("DELETE", `/api/push/devices/${device.id}`) as never,
      { params: Promise.resolve({ id: device.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("cannot delete another user's device", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    asUser(userA.id);
    // Register a subscription for user A
    const uniqueEndpoint = "https://fcm.googleapis.com/push/other-user-device";
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: uniqueEndpoint,
      },
    }) as never);
    // Get device id as user A
    asUser(userA.id);
    const devicesRes = await devicesGET(req("GET", "/api/push/devices") as never);
    const devicesBody = await devicesRes.json();
    const device = devicesBody.devices.find((d: { endpoint: string }) => d.endpoint === uniqueEndpoint);
    expect(device).toBeDefined();
    // Try to delete as user B
    asUser(userB.id);
    const res = await deviceByIdDELETE(
      req("DELETE", `/api/push/devices/${device.id}`) as never,
      { params: Promise.resolve({ id: device.id }) }
    );
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/push/test ──────────────────────────────────────────────────────

describe("POST /api/push/test", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await pushTestPOST(req("POST", "/api/push/test"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for readonly key", async () => {
    const user = await createTestUser();
    asUser(user.id, true);
    const res = await pushTestPOST(req("POST", "/api/push/test"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when user has no subscriptions", async () => {
    const user = await createTestUser();
    asUser(user.id);
    const res = await pushTestPOST(req("POST", "/api/push/test"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No push subscription");
  });

  it("returns 200 with sent count when subscriptions exist", async () => {
    const user = await createTestUser();
    asUser(user.id);
    // Register a subscription
    const uniqueEndpoint = "https://fcm.googleapis.com/push/push-test-endpoint";
    await subscribePOST(req("POST", "/api/push/subscribe", {
      ...VALID_SUBSCRIPTION,
      subscription: {
        ...VALID_SUBSCRIPTION.subscription,
        endpoint: uniqueEndpoint,
      },
    }) as never);
    // Send test notification
    asUser(user.id);
    const res = await pushTestPOST(req("POST", "/api/push/test"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sent).toBeGreaterThan(0);
  });
});
