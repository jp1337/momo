/**
 * Multi-channel notification system for Momo.
 *
 * This module defines the NotificationChannel interface and provides a registry
 * of channel implementations. New channels (Pushover, Telegram, Email, Webhook)
 * only need to implement the interface and register in createChannel().
 *
 * Currently supported channels:
 *  - ntfy: Push via ntfy.sh or self-hosted ntfy server
 *
 * All channels use native `fetch` — no additional containers or npm packages.
 *
 * This module is SERVER-SIDE ONLY.
 */

import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Universal notification payload — shared by all channels. */
export interface NotificationPayload {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** URL to open when the user taps the notification */
  url?: string;
  /** Dedup tag — channels that support it use this to replace prior notifications */
  tag?: string;
}

/** Interface every notification channel must implement. */
export interface NotificationChannel {
  /** Send a notification via this channel. Must not throw — log errors internally. */
  send(payload: NotificationPayload): Promise<void>;
}

// ─── Channel: ntfy ───────────────────────────────────────────────────────────

/** JSONB config shape for the ntfy channel. */
export interface NtfyConfig {
  topic: string;
  server?: string;
}

const NTFY_DEFAULT_SERVER = "https://ntfy.sh";

/**
 * ntfy.sh notification channel.
 *
 * Sends notifications via HTTP POST to a ntfy.sh topic (public or self-hosted).
 * Uses headers for metadata (Title, Click, Tags) and the request body for the message.
 *
 * @see https://docs.ntfy.sh/publish/
 */
class NtfyChannel implements NotificationChannel {
  private readonly url: string;

  constructor(config: NtfyConfig) {
    const server = config.server || NTFY_DEFAULT_SERVER;
    // Strip trailing slash from server URL
    this.url = `${server.replace(/\/+$/, "")}/${config.topic}`;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const headers: Record<string, string> = {
      Title: payload.title,
    };
    if (payload.url) {
      headers["Click"] = payload.url;
    }
    if (payload.tag) {
      headers["Tags"] = payload.tag;
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers,
      body: payload.body,
    });

    if (!response.ok) {
      throw new Error(
        `ntfy responded with ${response.status}: ${await response.text().catch(() => "no body")}`
      );
    }
  }
}

// ─── Channel Registry ────────────────────────────────────────────────────────

/**
 * Creates a NotificationChannel instance from the stored type + config.
 *
 * Returns null for unknown/unsupported channel types so callers can skip them.
 *
 * @param type - Channel type identifier (e.g. "ntfy")
 * @param config - Channel-specific configuration from the JSONB column
 */
export function createChannel(
  type: string,
  config: Record<string, unknown>
): NotificationChannel | null {
  switch (type) {
    case "ntfy":
      return new NtfyChannel(config as unknown as NtfyConfig);
    // Future channels:
    // case "pushover": return new PushoverChannel(config as unknown as PushoverConfig);
    // case "telegram": return new TelegramChannel(config as unknown as TelegramConfig);
    // case "email":    return new EmailChannel(config as unknown as EmailConfig);
    // case "webhook":  return new WebhookChannel(config as unknown as WebhookConfig);
    default:
      console.warn(`[notifications] Unknown channel type: ${type}`);
      return null;
  }
}

// ─── Fan-out Helper ──────────────────────────────────────────────────────────

/**
 * Sends a notification to all enabled channels of a given user.
 *
 * Channels are sent in parallel via Promise.allSettled — one channel's failure
 * never blocks another. Errors are logged but not thrown.
 *
 * @param userId - The user's UUID
 * @param payload - Notification content to send
 * @returns Counts of successful and failed channel deliveries
 */
export async function sendToAllChannels(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  const channels = await db
    .select({
      type: notificationChannels.type,
      config: notificationChannels.config,
    })
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.enabled, true)
      )
    );

  if (channels.length === 0) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    channels.map(async (ch) => {
      const channel = createChannel(ch.type, ch.config as Record<string, unknown>);
      if (!channel) {
        throw new Error(`Unsupported channel type: ${ch.type}`);
      }
      await channel.send(payload);
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      sent++;
    } else {
      console.error(
        `[notifications] Channel delivery failed for user ${userId}:`,
        result.reason
      );
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Sends a test notification to a specific channel type for a user.
 *
 * @param userId - The user's UUID
 * @param channelType - The channel type to test (e.g. "ntfy")
 * @returns true if sent successfully, false otherwise
 */
export async function sendTestNotification(
  userId: string,
  channelType: string
): Promise<boolean> {
  const rows = await db
    .select({
      type: notificationChannels.type,
      config: notificationChannels.config,
    })
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.userId, userId),
        eq(notificationChannels.type, channelType)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return false;
  }

  const channel = createChannel(rows[0].type, rows[0].config as Record<string, unknown>);
  if (!channel) {
    return false;
  }

  try {
    await channel.send({
      title: "Momo Test",
      body: "If you see this, your notification channel is working!",
      url: "/settings",
      tag: "test",
    });
    return true;
  } catch (err) {
    console.error(`[notifications] Test send failed for ${channelType}:`, err);
    return false;
  }
}
