/**
 * Tests for lib/webhooks.ts.
 *
 * Covers endpoint CRUD, ownership checks, secret encryption,
 * delivery-list authorization, the cleanup cron job, and
 * fireWebhookEvent / testWebhookEndpoint with a local mock HTTP server.
 *
 * Note: deliverToEndpoint enforces HTTPS at runtime. HTTP test-server URLs
 * result in a logged "failure" delivery (not a thrown error), which lets us
 * verify DB logging without a real TLS certificate.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createServer } from "http";
import type { AddressInfo } from "net";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { CreateWebhookEndpointInput } from "@/lib/validators/webhooks";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  cleanupWebhookDeliveries,
  fireWebhookEvent,
  testWebhookEndpoint,
  MAX_WEBHOOK_ENDPOINTS,
} from "@/lib/webhooks";
import type { WebhookTaskPayload } from "@/lib/webhooks";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";
const HTTPS_URL = "https://example.com/webhook";

/** Minimal valid input for createWebhookEndpoint. */
function ep(overrides: Partial<CreateWebhookEndpointInput> = {}): CreateWebhookEndpointInput {
  return { name: "Test EP", url: HTTPS_URL, events: [], enabled: true, ...overrides };
}

/**
 * Waits for the fire-and-forget delivery log in `fireWebhookEvent` to land.
 *
 * `lib/webhooks.ts` deliberately does not await its `db.insert` for the
 * delivery record, so that a slow or broken log never delays a webhook
 * delivery. That makes "the row exists" eventually-true rather than true on
 * return, and asserting it directly is a race the test loses locally and
 * usually wins in CI. Polling turns the race into a bounded wait.
 *
 * @param timeoutMs - How long to keep polling before giving up
 * @returns The most recent webhook delivery row
 * @throws If no delivery row appears within the timeout
 */
async function waitForLatestDelivery(
  timeoutMs = 2_000
): Promise<typeof webhookDeliveries.$inferSelect> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const [row] = await db
      .select()
      .from(webhookDeliveries)
      .orderBy(desc(webhookDeliveries.deliveredAt))
      .limit(1);
    if (row) return row;
    if (Date.now() >= deadline) {
      throw new Error(
        `No webhook delivery row appeared within ${timeoutMs}ms — the ` +
          `fire-and-forget insert in lib/webhooks.ts never completed.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

// ─── listWebhookEndpoints ─────────────────────────────────────────────────────

describe("listWebhookEndpoints", () => {
  it("returns an empty array for a user with no endpoints", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await listWebhookEndpoints(user.id);
    expect(result).toEqual([]);
  });

  it("returns created endpoints in creation order", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, ep({ name: "First" }));
    await createWebhookEndpoint(user.id, ep({ name: "Second" }));

    const result = await listWebhookEndpoints(user.id);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("First");
    expect(result[1].name).toBe("Second");
  });

  it("never exposes the raw secret — hasSecret is true when a secret was set", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, ep({ name: "Signed", secret: "my-super-secret" }));

    const [result] = await listWebhookEndpoints(user.id);
    expect(result.hasSecret).toBe(true);
    // The summary type has no `secret` field — the raw value must not leak
    expect("secret" in result).toBe(false);
  });

  it("hasSecret is false when no secret was provided", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, ep({ name: "Unsigned" }));

    const [result] = await listWebhookEndpoints(user.id);
    expect(result.hasSecret).toBe(false);
  });

  it("isolates endpoints by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(userA.id, ep({ name: "A's endpoint" }));

    const result = await listWebhookEndpoints(userB.id);
    expect(result).toHaveLength(0);
  });
});

// ─── createWebhookEndpoint ────────────────────────────────────────────────────

describe("createWebhookEndpoint", () => {
  it("returns the created endpoint summary", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(
      user.id,
      ep({ name: "My Webhook", events: ["task.created"] })
    );

    expect(created.name).toBe("My Webhook");
    expect(created.url).toBe(HTTPS_URL);
    expect(created.events).toEqual(["task.created"]);
    expect(created.enabled).toBe(true);
    expect(created.hasSecret).toBe(false);
    expect(created.id).toBeTruthy();
  });

  it("stores endpoint as disabled when enabled=false is passed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "Disabled", enabled: false }));

    expect(created.enabled).toBe(false);
  });

  it("throws 'limit_exceeded' when user already has MAX_WEBHOOK_ENDPOINTS endpoints", async () => {
    const user = await createTestUser({ timezone: TZ });

    for (let i = 0; i < MAX_WEBHOOK_ENDPOINTS; i++) {
      await createWebhookEndpoint(user.id, ep({ name: `Endpoint ${i}` }));
    }

    await expect(
      createWebhookEndpoint(user.id, ep({ name: "Over limit" }))
    ).rejects.toThrow("limit_exceeded");
  });

  it("limit is enforced per user — another user is not affected", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    for (let i = 0; i < MAX_WEBHOOK_ENDPOINTS; i++) {
      await createWebhookEndpoint(userA.id, ep({ name: `Endpoint ${i}` }));
    }

    const created = await createWebhookEndpoint(userB.id, ep({ name: "B's endpoint" }));
    expect(created.id).toBeTruthy();
  });
});

// ─── updateWebhookEndpoint ────────────────────────────────────────────────────

describe("updateWebhookEndpoint", () => {
  it("updates the name", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "Old Name" }));

    const updated = await updateWebhookEndpoint(created.id, user.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });

  it("updates enabled to false", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "Active" }));

    const updated = await updateWebhookEndpoint(created.id, user.id, { enabled: false });
    expect(updated.enabled).toBe(false);
  });

  it("updates events list", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ events: ["task.created"] }));

    const updated = await updateWebhookEndpoint(created.id, user.id, {
      events: ["task.completed", "task.deleted"],
    });
    expect(updated.events).toEqual(["task.completed", "task.deleted"]);
  });

  it("sets hasSecret=true when a new secret string is provided", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep());
    expect(created.hasSecret).toBe(false);

    const updated = await updateWebhookEndpoint(created.id, user.id, { secret: "new-secret" });
    expect(updated.hasSecret).toBe(true);
  });

  it("sets hasSecret=false when secret=null is passed (removes secret)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ secret: "initial-secret" }));
    expect(created.hasSecret).toBe(true);

    const updated = await updateWebhookEndpoint(created.id, user.id, { secret: null });
    expect(updated.hasSecret).toBe(false);
  });

  it("leaves secret unchanged when secret is omitted (undefined)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ secret: "keep-me" }));

    // Update only the name — secret must stay
    const updated = await updateWebhookEndpoint(created.id, user.id, { name: "New Name" });
    expect(updated.hasSecret).toBe(true);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(userA.id, ep({ name: "A's EP" }));

    await expect(
      updateWebhookEndpoint(created.id, userB.id, { name: "Stolen" })
    ).rejects.toThrow("not_found");
  });
});

// ─── deleteWebhookEndpoint ────────────────────────────────────────────────────

describe("deleteWebhookEndpoint", () => {
  it("removes the endpoint from the DB", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "To Delete" }));

    await deleteWebhookEndpoint(created.id, user.id);

    const remaining = await db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, created.id));
    expect(remaining).toHaveLength(0);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(userA.id, ep({ name: "A's EP" }));

    await expect(deleteWebhookEndpoint(created.id, userB.id)).rejects.toThrow("not_found");
  });

  it("throws 'not_found' for a completely unknown ID", async () => {
    const user = await createTestUser({ timezone: TZ });
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await expect(deleteWebhookEndpoint(fakeId, user.id)).rejects.toThrow("not_found");
  });
});

// ─── listWebhookDeliveries ────────────────────────────────────────────────────

describe("listWebhookDeliveries", () => {
  it("returns an empty array for an endpoint with no deliveries", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "Clean EP" }));

    const deliveries = await listWebhookDeliveries(created.id, user.id);
    expect(deliveries).toHaveLength(0);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(userA.id, ep({ name: "A's EP" }));

    await expect(listWebhookDeliveries(created.id, userB.id)).rejects.toThrow("not_found");
  });

  it("throws 'not_found' for a completely unknown endpoint ID", async () => {
    const user = await createTestUser({ timezone: TZ });
    const fakeId = "00000000-0000-0000-0000-000000000001";
    await expect(listWebhookDeliveries(fakeId, user.id)).rejects.toThrow("not_found");
  });
});

// ─── cleanupWebhookDeliveries ─────────────────────────────────────────────────

describe("cleanupWebhookDeliveries", () => {
  it("returns { sent: 0, failed: 0 }", async () => {
    const result = await cleanupWebhookDeliveries();
    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("deletes delivery rows older than 30 days", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "EP" }));

    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await db.insert(webhookDeliveries).values({
      endpointId: created.id,
      userId: user.id,
      event: "task.created",
      payload: { event: "task.created", timestamp: oldDate.toISOString(), task: {} },
      httpStatus: 200,
      status: "success",
      errorMessage: null,
      durationMs: 42,
      deliveredAt: oldDate,
    });

    const before = await db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, created.id));
    expect(before).toHaveLength(1);

    await cleanupWebhookDeliveries();

    const after = await db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, created.id));
    expect(after).toHaveLength(0);
  });

  it("keeps delivery rows newer than 30 days", async () => {
    const user = await createTestUser({ timezone: TZ });
    const created = await createWebhookEndpoint(user.id, ep({ name: "EP2" }));

    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await db.insert(webhookDeliveries).values({
      endpointId: created.id,
      userId: user.id,
      event: "task.completed",
      payload: { event: "task.completed", timestamp: recentDate.toISOString(), task: {} },
      httpStatus: 200,
      status: "success",
      errorMessage: null,
      durationMs: 55,
      deliveredAt: recentDate,
    });

    await cleanupWebhookDeliveries();

    const after = await db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, created.id));
    expect(after).toHaveLength(1);
  });
});

// ─── fireWebhookEvent + testWebhookEndpoint (mock HTTP server) ────────────────

/**
 * Minimal task payload for fireWebhookEvent tests.
 */
function makeTaskPayload(overrides: Partial<WebhookTaskPayload> = {}): WebhookTaskPayload {
  return {
    id: "task-123",
    title: "Test Task",
    type: "TASK",
    priority: "MEDIUM",
    topicId: null,
    dueDate: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Helper to start a local HTTP server and return its URL + a stop function.
 * Note: deliverToEndpoint enforces HTTPS at runtime, so deliveries to this
 * server will be logged as failures with "Non-HTTPS endpoint" error.
 * That still exercises the DB logging and event-filter paths.
 */
async function startLocalServer(
  handler: (
    method: string | undefined,
    body: string,
    respond: (status: number) => void
  ) => void
): Promise<{ url: string; stop: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => {
        handler(req.method, data, (status) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: status < 400 }));
        });
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}/hook`,
        stop: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

describe("fireWebhookEvent", () => {
  it("logs a failure delivery when endpoint URL is HTTP (HTTPS enforced at runtime)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { url, stop } = await startLocalServer((_method, _body, respond) => {
      respond(200);
    });

    try {
      // Endpoint stored with the HTTP test-server URL
      await createWebhookEndpoint(user.id, ep({ url, name: "HTTP Test" }));
      await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

      // Give the async fire-and-forget DB write time to settle
      await new Promise((r) => setTimeout(r, 300));

      const [endpoint] = await listWebhookEndpoints(user.id);
      const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
      expect(deliveries.length).toBeGreaterThan(0);
      // The delivery should be a failure because HTTP is rejected
      expect(deliveries[0].status).toBe("failure");
      expect(deliveries[0].errorMessage).toContain("Non-HTTPS");
    } finally {
      await stop();
    }
  });

  it("only sends to endpoints subscribed to the event", async () => {
    const user = await createTestUser({ timezone: TZ });
    let hitCount = 0;

    const { url, stop } = await startLocalServer((_method, _body, respond) => {
      hitCount++;
      respond(200);
    });

    try {
      // Endpoint subscribes only to task.completed — should NOT fire on task.created
      await createWebhookEndpoint(
        user.id,
        ep({ url, name: "Selective EP", events: ["task.completed"] })
      );
      await fireWebhookEvent(user.id, "task.created", makeTaskPayload());
      await new Promise((r) => setTimeout(r, 200));

      // The HTTP server should never have been reached
      expect(hitCount).toBe(0);
    } finally {
      await stop();
    }
  });

  it("does not fire when endpoint is disabled", async () => {
    const user = await createTestUser({ timezone: TZ });
    let hitCount = 0;

    const { url, stop } = await startLocalServer((_method, _body, respond) => {
      hitCount++;
      respond(200);
    });

    try {
      await createWebhookEndpoint(
        user.id,
        ep({ url, name: "Disabled EP", enabled: false })
      );
      await fireWebhookEvent(user.id, "task.created", makeTaskPayload());
      await new Promise((r) => setTimeout(r, 200));

      expect(hitCount).toBe(0);
    } finally {
      await stop();
    }
  });

  it("returns without error when user has no endpoints", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Should resolve without throwing
    await expect(
      fireWebhookEvent(user.id, "task.created", makeTaskPayload())
    ).resolves.toBeUndefined();
  });
});

describe("testWebhookEndpoint", () => {
  it("throws 'not_found' on ownership violation", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    const { url, stop } = await startLocalServer((_method, _body, respond) => {
      respond(200);
    });

    try {
      const created = await createWebhookEndpoint(userA.id, ep({ url }));
      await expect(testWebhookEndpoint(created.id, userB.id)).rejects.toThrow("not_found");
    } finally {
      await stop();
    }
  });

  it("throws 'not_found' for a completely unknown endpoint ID", async () => {
    const user = await createTestUser({ timezone: TZ });
    const fakeId = "00000000-0000-0000-0000-000000000099";
    await expect(testWebhookEndpoint(fakeId, user.id)).rejects.toThrow("not_found");
  });

  it("logs a delivery attempt to the DB after testWebhookEndpoint", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { url, stop } = await startLocalServer((_method, _body, respond) => {
      respond(200);
    });

    try {
      const endpoint = await createWebhookEndpoint(user.id, ep({ url, name: "Test EP" }));
      // testWebhookEndpoint calls deliverToEndpoint — even HTTP URLs log to DB
      await testWebhookEndpoint(endpoint.id, user.id);

      // Give the fire-and-forget DB write time to settle
      await new Promise((r) => setTimeout(r, 300));

      const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
      expect(deliveries.length).toBeGreaterThan(0);
      // HTTP enforces a failure, but a delivery log entry must exist
      expect(deliveries[0].event).toBe("task.test");
    } finally {
      await stop();
    }
  });
});

// ─── HTTPS delivery path (fetch-stubbed) ─────────────────────────────────────

describe("fireWebhookEvent — HTTPS delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("records a success delivery when the endpoint responds 2xx", async () => {
    const user = await createTestUser({ timezone: TZ });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const endpoint = await createWebhookEndpoint(user.id, ep({ name: "HTTPS OK" }));
    await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

    // deliverToEndpoint logs via fire-and-forget — wait for the DB write
    await new Promise((r) => setTimeout(r, 300));

    const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries[0].status).toBe("success");
    expect(deliveries[0].httpStatus).toBe(200);
  });

  it("records a failure delivery when the endpoint responds non-2xx", async () => {
    const user = await createTestUser({ timezone: TZ });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const endpoint = await createWebhookEndpoint(user.id, ep({ name: "HTTPS 500" }));
    await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

    await new Promise((r) => setTimeout(r, 300));

    const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries[0].status).toBe("failure");
    expect(deliveries[0].httpStatus).toBe(500);
    expect(deliveries[0].errorMessage).toContain("Internal Server Error");
  });

  it("uses HTTP status as error message when response body is empty (covers line 457)", async () => {
    const user = await createTestUser({ timezone: TZ });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const endpoint = await createWebhookEndpoint(user.id, ep({ name: "Empty Body EP" }));
    await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

    await new Promise((r) => setTimeout(r, 300));

    const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries[0].status).toBe("failure");
    expect(deliveries[0].errorMessage).toBe("HTTP 503");
  });

  it("includes X-Momo-Signature header when endpoint has a signing secret", async () => {
    const user = await createTestUser({ timezone: TZ });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    await createWebhookEndpoint(user.id, ep({ name: "Signed EP", secret: "super-secret-key" }));
    await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

    await new Promise((r) => setTimeout(r, 300));

    expect(mockFetch).toHaveBeenCalledOnce();
    const [, callOptions] = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(callOptions.headers["X-Momo-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(callOptions.headers["X-Momo-Event"]).toBe("task.created");
  });

  it("records a failure when fetch throws (network error)", async () => {
    const user = await createTestUser({ timezone: TZ });

    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", mockFetch);

    const endpoint = await createWebhookEndpoint(user.id, ep({ name: "Network Fail" }));
    await fireWebhookEvent(user.id, "task.created", makeTaskPayload());

    await new Promise((r) => setTimeout(r, 300));

    const deliveries = await listWebhookDeliveries(endpoint.id, user.id);
    expect(deliveries.length).toBeGreaterThan(0);
    expect(deliveries[0].status).toBe("failure");
    expect(deliveries[0].errorMessage).toContain("ECONNREFUSED");
  });

  it("swallows DB errors when the delivery log insert fails (covers line 482)", async () => {
    const user = await createTestUser({ timezone: TZ });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    }));

    await createWebhookEndpoint(user.id, ep({ name: "DB Fail EP" }));

    // Intercept the next db.insert() — that will be the delivery-log insert inside
    // deliverToEndpoint — and make its .catch() handler fire with a fake error.
    const insertSpy = vi.spyOn(db, "insert").mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        catch: vi.fn((handler: (err: unknown) => void) => {
          handler(new Error("delivery log failed"));
          return Promise.resolve();
        }),
      }),
    } as never);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fireWebhookEvent(user.id, "task.completed", makeTaskPayload());

    expect(consoleSpy).toHaveBeenCalledWith(
      "[webhooks] Failed to log delivery:",
      expect.any(Error)
    );

    insertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("aborts fetch via AbortController when delivery takes longer than timeout (covers line 440)", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, ep({ name: "Timeout EP" }));

    // Intercept setTimeout to call the delivery-timeout callback immediately.
    // DELIVERY_TIMEOUT_MS = 5000; we identify it by delay value.
    // Other setTimeout calls (e.g. from the DB driver) are passed through.
    const originalSetTimeout = globalThis.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(((fn: (...args: unknown[]) => void, delay: number, ...args: unknown[]) => {
        if (delay === 5000) {
          // Invoke the abort callback synchronously so fetch rejects immediately
          fn(...args);
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
        return originalSetTimeout(fn, delay, ...args);
      }) as typeof setTimeout);

    // With abort triggered immediately, fetch will reject because signal.aborted = true
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, opts: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            if (opts.signal?.aborted) {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            } else if (opts.signal) {
              opts.signal.addEventListener("abort", () =>
                reject(new DOMException("The operation was aborted.", "AbortError"))
              );
            }
          })
      )
    );

    await fireWebhookEvent(user.id, "task.completed", makeTaskPayload());

    setTimeoutSpy.mockRestore();

    // Delivery should be logged as a failure. The insert is fire-and-forget,
    // so wait for it rather than racing it — see waitForLatestDelivery.
    const delivery = await waitForLatestDelivery();

    expect(delivery.status).toBe("failure");
    expect(delivery.errorMessage).toContain("aborted");
  });

});
