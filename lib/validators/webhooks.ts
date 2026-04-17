/**
 * Zod validation schemas for the Outbound Webhook System.
 *
 * Separate from validators/index.ts to keep webhook-specific types isolated.
 * Re-exported from validators/index.ts.
 */

import { z } from "zod";

/** All supported outbound webhook event names. */
export const WEBHOOK_EVENTS = [
  "task.created",
  "task.completed",
  "task.deleted",
  "task.updated",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/**
 * Validates a HTTPS-only URL for use as a webhook endpoint.
 * Enforced at both validation time and runtime delivery.
 */
const HttpsUrlSchema = z
  .string()
  .min(1, "URL is required")
  .max(2000, "URL must be at most 2000 characters")
  .url("Must be a valid URL")
  .refine(
    (url) => url.startsWith("https://"),
    "Webhook URL must use HTTPS"
  );

/**
 * Schema for creating a new outbound webhook endpoint.
 *
 * @field name    - Human-readable label (e.g. "Zapier automation")
 * @field url     - HTTPS endpoint URL
 * @field secret  - Optional HMAC-SHA256 signing secret
 * @field events  - Subscribed event types; empty array = subscribe to all
 * @field enabled - Whether the endpoint is active (defaults to true)
 */
export const CreateWebhookEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  url: HttpsUrlSchema,
  secret: z.string().max(200, "Secret must be at most 200 characters").optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).max(4).optional().default([]),
  enabled: z.boolean().optional().default(true),
});

export type CreateWebhookEndpointInput = z.infer<typeof CreateWebhookEndpointSchema>;

/**
 * Schema for updating an existing webhook endpoint (partial update).
 *
 * @field secret - Pass a non-null string to replace the secret,
 *                 null to remove it, or omit to keep the existing one.
 */
export const UpdateWebhookEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: HttpsUrlSchema.optional(),
  secret: z.string().max(200).nullable().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).max(4).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateWebhookEndpointInput = z.infer<typeof UpdateWebhookEndpointSchema>;
