/**
 * Integration tests for POST /api/settings/webhooks/:id/test.
 *
 * testWebhookEndpoint is mocked to avoid real HTTPS network calls.
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

// Mock only testWebhookEndpoint — keep rest of webhooks lib real
vi.mock("@/lib/webhooks", async (orig) => {
  const actual = await orig<typeof import("@/lib/webhooks")>();
  return {
    ...actual,
    testWebhookEndpoint: vi.fn().mockResolvedValue({ id: "delivery-1", status: "failure" }),
  };
});

import { resolveApiUser } from "@/lib/api-auth";
import { testWebhookEndpoint } from "@/lib/webhooks";
import { POST } from "@/app/api/settings/webhooks/[id]/test/route";
import { createTestUser } from "./helpers/fixtures";
import type { ApiUser } from "@/lib/api-auth";

const mockAuth = vi.mocked(resolveApiUser);
const mockTestEndpoint = vi.mocked(testWebhookEndpoint);

beforeEach(() => {
  mockAuth.mockReset();
  mockTestEndpoint.mockReset();
  mockTestEndpoint.mockResolvedValue({ id: "delivery-1", status: "failure" } as never);
});

function req(method: string, url: string): Request {
  return new Request(`http://localhost${url}`, { method });
}

function authAs(userId: string, readonly = false): void {
  mockAuth.mockResolvedValue({ userId, readonly } as ApiUser);
}

const FAKE_ID = "00000000-0000-0000-0000-000000000000";

describe("POST /api/settings/webhooks/:id/test", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with { success: true } when endpoint exists", async () => {
    const user = await createTestUser();
    authAs(user.id);

    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
    expect(mockTestEndpoint).toHaveBeenCalledWith(FAKE_ID, user.id);
  });

  it("returns 404 when testWebhookEndpoint throws 'not_found'", async () => {
    const user = await createTestUser();
    authAs(user.id);
    mockTestEndpoint.mockRejectedValueOnce(new Error("not_found"));

    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 500 when testWebhookEndpoint throws an unexpected error", async () => {
    const user = await createTestUser();
    authAs(user.id);
    mockTestEndpoint.mockRejectedValueOnce(new Error("something unexpected"));

    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(500);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    const user = await createTestUser();
    authAs(user.id);

    // Rate limit is 5/min — exhaust it
    for (let i = 0; i < 5; i++) {
      await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
        params: Promise.resolve({ id: FAKE_ID }),
      });
    }
    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 403 for a readonly key", async () => {
    const user = await createTestUser();
    authAs(user.id, true);
    const res = await POST(req("POST", `/api/settings/webhooks/${FAKE_ID}/test`) as never, {
      params: Promise.resolve({ id: FAKE_ID }),
    });
    expect(res.status).toBe(403);
  });
});
