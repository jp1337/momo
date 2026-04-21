/**
 * Tests for lib/webhooks.ts.
 *
 * Covers endpoint CRUD, ownership checks, secret encryption,
 * delivery-list authorization, and the cleanup cron job.
 *
 * `fireWebhookEvent` and `testWebhookEndpoint` make real HTTP calls and are
 * excluded — they require a mock HTTP server.
 */

import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookDeliveries,
  cleanupWebhookDeliveries,
  MAX_WEBHOOK_ENDPOINTS,
} from "@/lib/webhooks";
import { createTestUser } from "./helpers/fixtures";

const TZ = "Europe/Berlin";
const HTTPS_URL = "https://example.com/webhook";

// ─── listWebhookEndpoints ─────────────────────────────────────────────────────

describe("listWebhookEndpoints", () => {
  it("returns an empty array for a user with no endpoints", async () => {
    const user = await createTestUser({ timezone: TZ });
    const result = await listWebhookEndpoints(user.id);
    expect(result).toEqual([]);
  });

  it("returns created endpoints in creation order", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, { name: "First", url: HTTPS_URL, events: [] });
    await createWebhookEndpoint(user.id, { name: "Second", url: HTTPS_URL, events: [] });

    const result = await listWebhookEndpoints(user.id);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("First");
    expect(result[1].name).toBe("Second");
  });

  it("never exposes the raw secret — hasSecret is true when a secret was set", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, {
      name: "Signed",
      url: HTTPS_URL,
      secret: "my-super-secret",
      events: [],
    });

    const [ep] = await listWebhookEndpoints(user.id);
    expect(ep.hasSecret).toBe(true);
    // The summary type has no `secret` field — the raw value must not leak
    expect("secret" in ep).toBe(false);
  });

  it("hasSecret is false when no secret was provided", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(user.id, { name: "Unsigned", url: HTTPS_URL, events: [] });

    const [ep] = await listWebhookEndpoints(user.id);
    expect(ep.hasSecret).toBe(false);
  });

  it("isolates endpoints by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createWebhookEndpoint(userA.id, { name: "A's endpoint", url: HTTPS_URL, events: [] });

    const result = await listWebhookEndpoints(userB.id);
    expect(result).toHaveLength(0);
  });
});

// ─── createWebhookEndpoint ────────────────────────────────────────────────────

describe("createWebhookEndpoint", () => {
  it("returns the created endpoint summary", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, {
      name: "My Webhook",
      url: HTTPS_URL,
      events: ["task.created"],
    });

    expect(ep.name).toBe("My Webhook");
    expect(ep.url).toBe(HTTPS_URL);
    expect(ep.events).toEqual(["task.created"]);
    expect(ep.enabled).toBe(true);
    expect(ep.hasSecret).toBe(false);
    expect(ep.id).toBeTruthy();
  });

  it("stores endpoint as disabled when enabled=false is passed", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, {
      name: "Disabled",
      url: HTTPS_URL,
      events: [],
      enabled: false,
    });

    expect(ep.enabled).toBe(false);
  });

  it("throws 'limit_exceeded' when user already has MAX_WEBHOOK_ENDPOINTS endpoints", async () => {
    const user = await createTestUser({ timezone: TZ });

    // Create MAX_WEBHOOK_ENDPOINTS endpoints
    for (let i = 0; i < MAX_WEBHOOK_ENDPOINTS; i++) {
      await createWebhookEndpoint(user.id, {
        name: `Endpoint ${i}`,
        url: HTTPS_URL,
        events: [],
      });
    }

    await expect(
      createWebhookEndpoint(user.id, { name: "Over limit", url: HTTPS_URL, events: [] })
    ).rejects.toThrow("limit_exceeded");
  });

  it("limit is enforced per user — another user is not affected", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });

    for (let i = 0; i < MAX_WEBHOOK_ENDPOINTS; i++) {
      await createWebhookEndpoint(userA.id, {
        name: `Endpoint ${i}`,
        url: HTTPS_URL,
        events: [],
      });
    }

    // userB should still be able to create endpoints
    const ep = await createWebhookEndpoint(userB.id, { name: "B's endpoint", url: HTTPS_URL, events: [] });
    expect(ep.id).toBeTruthy();
  });
});

// ─── updateWebhookEndpoint ────────────────────────────────────────────────────

describe("updateWebhookEndpoint", () => {
  it("updates the name", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, { name: "Old Name", url: HTTPS_URL, events: [] });

    const updated = await updateWebhookEndpoint(ep.id, user.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });

  it("updates enabled to false", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, { name: "Active", url: HTTPS_URL, events: [] });

    const updated = await updateWebhookEndpoint(ep.id, user.id, { enabled: false });
    expect(updated.enabled).toBe(false);
  });

  it("updates events list", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, {
      name: "EP",
      url: HTTPS_URL,
      events: ["task.created"],
    });

    const updated = await updateWebhookEndpoint(ep.id, user.id, {
      events: ["task.completed", "task.deleted"],
    });
    expect(updated.events).toEqual(["task.completed", "task.deleted"]);
  });

  it("sets hasSecret=true when a new secret string is provided", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, { name: "EP", url: HTTPS_URL, events: [] });
    expect(ep.hasSecret).toBe(false);

    const updated = await updateWebhookEndpoint(ep.id, user.id, { secret: "new-secret" });
    expect(updated.hasSecret).toBe(true);
  });

  it("sets hasSecret=false when secret=null is passed (removes secret)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, {
      name: "Signed EP",
      url: HTTPS_URL,
      secret: "initial-secret",
      events: [],
    });
    expect(ep.hasSecret).toBe(true);

    const updated = await updateWebhookEndpoint(ep.id, user.id, { secret: null });
    expect(updated.hasSecret).toBe(false);
  });

  it("leaves secret unchanged when secret is omitted (undefined)", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, {
      name: "Signed",
      url: HTTPS_URL,
      secret: "keep-me",
      events: [],
    });

    // Update only the name — secret must stay
    const updated = await updateWebhookEndpoint(ep.id, user.id, { name: "New Name" });
    expect(updated.hasSecret).toBe(true);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(userA.id, { name: "A's EP", url: HTTPS_URL, events: [] });

    await expect(
      updateWebhookEndpoint(ep.id, userB.id, { name: "Stolen" })
    ).rejects.toThrow("not_found");
  });
});

// ─── deleteWebhookEndpoint ────────────────────────────────────────────────────

describe("deleteWebhookEndpoint", () => {
  it("removes the endpoint from the DB", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, { name: "To Delete", url: HTTPS_URL, events: [] });

    await deleteWebhookEndpoint(ep.id, user.id);

    const remaining = await db
      .select({ id: webhookEndpoints.id })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, ep.id));
    expect(remaining).toHaveLength(0);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(userA.id, { name: "A's EP", url: HTTPS_URL, events: [] });

    await expect(deleteWebhookEndpoint(ep.id, userB.id)).rejects.toThrow("not_found");
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
    const ep = await createWebhookEndpoint(user.id, { name: "Clean EP", url: HTTPS_URL, events: [] });

    const deliveries = await listWebhookDeliveries(ep.id, user.id);
    expect(deliveries).toHaveLength(0);
  });

  it("throws 'not_found' when endpoint belongs to a different user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(userA.id, { name: "A's EP", url: HTTPS_URL, events: [] });

    await expect(listWebhookDeliveries(ep.id, userB.id)).rejects.toThrow("not_found");
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
    const ep = await createWebhookEndpoint(user.id, { name: "EP", url: HTTPS_URL, events: [] });

    // Insert a delivery row with a deliveredAt 31 days ago
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await db.insert(webhookDeliveries).values({
      endpointId: ep.id,
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
      .where(eq(webhookDeliveries.endpointId, ep.id));
    expect(before).toHaveLength(1);

    await cleanupWebhookDeliveries();

    const after = await db
      .select({ id: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, ep.id));
    expect(after).toHaveLength(0);
  });

  it("keeps delivery rows newer than 30 days", async () => {
    const user = await createTestUser({ timezone: TZ });
    const ep = await createWebhookEndpoint(user.id, { name: "EP2", url: HTTPS_URL, events: [] });

    // Insert a delivery row with a deliveredAt 1 day ago (well within retention)
    const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await db.insert(webhookDeliveries).values({
      endpointId: ep.id,
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
      .where(eq(webhookDeliveries.endpointId, ep.id));
    expect(after).toHaveLength(1);
  });
});
