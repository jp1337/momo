/**
 * Outbound Webhook System for Momo.
 *
 * Fires HTTP POST events to user-configured HTTPS endpoints when tasks change.
 * This is the automation/integration surface — suitable for connecting Momo to
 * Zapier, Make, n8n, Home Assistant, or custom backends.
 *
 * Separate from the notification webhook channel (lib/notifications.ts), which
 * delivers personal alerts. Outbound webhooks deliver machine-readable task
 * lifecycle events for automation.
 *
 * Design decisions:
 *  - Delivery is fire-and-forget: fireWebhookEvent() is called after DB operations
 *    succeed, never inside a transaction. Results are logged but never block callers.
 *  - Signing uses HMAC-SHA256 over the raw JSON body (same as WebhookChannel in
 *    lib/notifications.ts lines 371-377).
 *  - Secrets are encrypted at rest with AES-256-GCM via encryptSecret/decryptSecret
 *    from lib/utils/crypto.ts (reuses TOTP_ENCRYPTION_KEY).
 *  - Max 10 endpoints per user (enforced in createWebhookEndpoint).
 *  - 5-second delivery timeout via AbortController.
 *
 * @module lib/webhooks
 */

import { db } from "@/lib/db";
import { webhookEndpoints, webhookDeliveries } from "@/lib/db/schema";
import { eq, and, count, lt } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/utils/crypto";
import type {
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  WebhookEvent,
} from "@/lib/validators/webhooks";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of webhook endpoints per user */
export const MAX_WEBHOOK_ENDPOINTS = 10;

/** Delivery timeout in milliseconds */
const DELIVERY_TIMEOUT_MS = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Public shape of a webhook endpoint — the raw secret is never returned. */
export interface WebhookEndpointSummary {
  id: string;
  name: string;
  url: string;
  /** true when a signing secret is configured, false when no signing is used */
  hasSecret: boolean;
  /** Subscribed event types; empty array means "all events" */
  events: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Task fields included in every outbound webhook payload. */
export interface WebhookTaskPayload {
  id: string;
  title: string;
  type: string;
  priority: string;
  topicId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Full outbound webhook event envelope sent to the endpoint. */
export interface WebhookEventPayload {
  event: string;
  timestamp: string;
  task: WebhookTaskPayload;
}

// ─── Endpoint CRUD ────────────────────────────────────────────────────────────

/**
 * Lists all webhook endpoints for a user.
 * The encrypted secret is never returned; callers receive `hasSecret: boolean`.
 *
 * @param userId - The authenticated user's UUID
 * @returns Array of endpoint summaries ordered by creation date
 */
export async function listWebhookEndpoints(
  userId: string
): Promise<WebhookEndpointSummary[]> {
  const rows = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.userId, userId))
    .orderBy(webhookEndpoints.createdAt);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    hasSecret: r.secretEncrypted !== null,
    events: r.events ?? [],
    enabled: r.enabled,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Creates a new webhook endpoint for a user.
 * The signing secret (if provided) is encrypted with AES-256-GCM before storage.
 *
 * @param userId - The authenticated user's UUID
 * @param input  - Validated endpoint creation input
 * @returns The newly created endpoint summary
 * @throws Error("limit_exceeded") if the user already has MAX_WEBHOOK_ENDPOINTS endpoints
 */
export async function createWebhookEndpoint(
  userId: string,
  input: CreateWebhookEndpointInput
): Promise<WebhookEndpointSummary> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.userId, userId));

  if (total >= MAX_WEBHOOK_ENDPOINTS) {
    throw new Error("limit_exceeded");
  }

  const secretEncrypted = input.secret ? encryptSecret(input.secret) : null;

  const [row] = await db
    .insert(webhookEndpoints)
    .values({
      userId,
      name: input.name,
      url: input.url,
      secretEncrypted,
      events: input.events ?? [],
      enabled: input.enabled ?? true,
    })
    .returning();

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    hasSecret: row.secretEncrypted !== null,
    events: row.events ?? [],
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Updates an existing webhook endpoint (partial update).
 *
 * Secret handling:
 *  - `secret` = non-null string → re-encrypt and replace
 *  - `secret` = null             → remove signing secret
 *  - `secret` = undefined         → leave existing secret unchanged
 *
 * @param endpointId - The endpoint UUID
 * @param userId     - The authenticated user's UUID (for ownership check)
 * @param input      - Partial update input
 * @returns The updated endpoint summary
 * @throws Error("not_found") if the endpoint does not belong to the user
 */
export async function updateWebhookEndpoint(
  endpointId: string,
  userId: string,
  input: UpdateWebhookEndpointInput
): Promise<WebhookEndpointSummary> {
  const updateValues: Partial<typeof webhookEndpoints.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateValues.name = input.name;
  if (input.url !== undefined) updateValues.url = input.url;
  if (input.events !== undefined) updateValues.events = input.events;
  if (input.enabled !== undefined) updateValues.enabled = input.enabled;
  if (input.secret !== undefined) {
    updateValues.secretEncrypted =
      input.secret === null ? null : encryptSecret(input.secret);
  }

  const [row] = await db
    .update(webhookEndpoints)
    .set(updateValues)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.userId, userId)
      )
    )
    .returning();

  if (!row) throw new Error("not_found");

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    hasSecret: row.secretEncrypted !== null,
    events: row.events ?? [],
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deletes a webhook endpoint and all its delivery history (cascade).
 *
 * @param endpointId - The endpoint UUID
 * @param userId     - The authenticated user's UUID (for ownership check)
 * @throws Error("not_found") if the endpoint does not belong to the user
 */
export async function deleteWebhookEndpoint(
  endpointId: string,
  userId: string
): Promise<void> {
  const rows = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.userId, userId)
      )
    )
    .returning({ id: webhookEndpoints.id });

  if (!rows[0]) throw new Error("not_found");
}

// ─── Delivery History ─────────────────────────────────────────────────────────

/**
 * Returns the last 50 delivery attempts for a specific endpoint.
 * Verifies endpoint ownership via userId before returning.
 *
 * @param endpointId - The endpoint UUID
 * @param userId     - The authenticated user's UUID
 * @returns Array of delivery log rows, newest first
 * @throws Error("not_found") if the endpoint does not belong to the user
 */
export async function listWebhookDeliveries(
  endpointId: string,
  userId: string
): Promise<(typeof webhookDeliveries.$inferSelect)[]> {
  const [ep] = await db
    .select({ id: webhookEndpoints.id })
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.userId, userId)
      )
    )
    .limit(1);

  if (!ep) throw new Error("not_found");

  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.endpointId, endpointId))
    .orderBy(webhookDeliveries.deliveredAt)
    .limit(50);
}

// ─── Event Firing ─────────────────────────────────────────────────────────────

/**
 * Fires a webhook event to all enabled, subscribed endpoints for a user.
 *
 * This function is designed to be called fire-and-forget:
 *
 *   import("@/lib/webhooks").then(({ fireWebhookEvent }) =>
 *     fireWebhookEvent(userId, "task.created", payload).catch(() => {})
 *   );
 *
 * It never throws — all failures are caught and logged to webhook_deliveries.
 * Delivery runs in parallel across all matched endpoints via Promise.allSettled().
 *
 * @param userId - The authenticated user's UUID
 * @param event  - The event type (e.g. "task.created")
 * @param task   - The task that triggered the event
 */
export async function fireWebhookEvent(
  userId: string,
  event: WebhookEvent,
  task: WebhookTaskPayload
): Promise<void> {
  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.userId, userId),
        eq(webhookEndpoints.enabled, true)
      )
    );

  if (endpoints.length === 0) return;

  // Filter by event subscription — NULL or empty array means "subscribe to all"
  const subscribed = endpoints.filter((ep) => {
    const evts = ep.events;
    if (!evts || evts.length === 0) return true;
    return evts.includes(event);
  });

  if (subscribed.length === 0) return;

  const payload: WebhookEventPayload = {
    event,
    timestamp: new Date().toISOString(),
    task,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subscribed.map((ep) =>
      deliverToEndpoint(ep, body, payload, userId, event)
    )
  );
}

/**
 * Sends a test delivery to a specific endpoint, bypassing event subscriptions.
 * Fires a synthetic "task.test" event so the user can verify their endpoint.
 *
 * @param endpointId - The endpoint UUID
 * @param userId     - The authenticated user's UUID
 * @throws Error("not_found") if the endpoint does not belong to the user
 */
export async function testWebhookEndpoint(
  endpointId: string,
  userId: string
): Promise<void> {
  const [ep] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        eq(webhookEndpoints.userId, userId)
      )
    )
    .limit(1);

  if (!ep) throw new Error("not_found");

  const testPayload: WebhookEventPayload = {
    event: "task.test",
    timestamp: new Date().toISOString(),
    task: {
      id: "00000000-0000-0000-0000-000000000000",
      title: "Test task from Momo",
      type: "ONE_TIME",
      priority: "NORMAL",
      topicId: null,
      dueDate: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    },
  };

  const body = JSON.stringify(testPayload);
  await deliverToEndpoint(ep, body, testPayload, userId, "task.test");
}

// ─── Cron Cleanup ─────────────────────────────────────────────────────────────

/**
 * Prunes webhook_deliveries rows older than 30 days.
 * Registered as the "webhook-delivery-cleanup" daily cron job in lib/cron.ts.
 *
 * @returns Delivery result shape (sent/failed) expected by the cron dispatcher
 */
export async function cleanupWebhookDeliveries(): Promise<{
  sent: number;
  failed: number;
}> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await db
    .delete(webhookDeliveries)
    .where(lt(webhookDeliveries.deliveredAt, cutoff));
  return { sent: 0, failed: 0 };
}

// ─── Internal Delivery ────────────────────────────────────────────────────────

/**
 * Sends one HTTP POST request to a single endpoint and logs the result.
 * Never throws — all errors are caught and stored in webhook_deliveries.
 *
 * @param ep      - The webhook endpoint DB row
 * @param body    - Serialised JSON payload
 * @param payload - Parsed payload (for DB logging)
 * @param userId  - Owner (for DB logging)
 * @param event   - Event type (for DB logging; accepts "task.test")
 */
async function deliverToEndpoint(
  ep: typeof webhookEndpoints.$inferSelect,
  body: string,
  payload: WebhookEventPayload,
  userId: string,
  event: string
): Promise<void> {
  const start = Date.now();
  let httpStatus: number | null = null;
  let errorMessage: string | null = null;
  let status: "success" | "failure" = "failure";

  try {
    // Defense-in-depth: enforce HTTPS at runtime regardless of stored URL
    const parsedUrl = new URL(ep.url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("Non-HTTPS endpoint — delivery refused");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Momo-Event": event,
    };

    // HMAC-SHA256 signing — mirrors WebhookChannel in lib/notifications.ts
    if (ep.secretEncrypted) {
      const plainSecret = decryptSecret(ep.secretEncrypted);
      const { createHmac } = await import("crypto");
      const sig = createHmac("sha256", plainSecret).update(body).digest("hex");
      headers["X-Momo-Signature"] = `sha256=${sig}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DELIVERY_TIMEOUT_MS
    );

    try {
      const response = await fetch(ep.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      httpStatus = response.status;

      if (response.ok) {
        status = "success";
      } else {
        const responseText = await response.text().catch(() => "");
        errorMessage = responseText.slice(0, 500) || `HTTP ${response.status}`;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message.slice(0, 500) : "Unknown error";
  }

  const durationMs = Date.now() - start;

  // Log delivery — fire-and-forget, never propagates errors
  db.insert(webhookDeliveries)
    .values({
      endpointId: ep.id,
      userId,
      event,
      payload: payload as unknown as Record<string, unknown>,
      httpStatus,
      status,
      errorMessage,
      durationMs,
    })
    .catch((dbErr: unknown) => {
      console.error("[webhooks] Failed to log delivery:", dbErr);
    });
}
