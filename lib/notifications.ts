/**
 * Multi-channel notification system for Momo.
 *
 * This module defines the NotificationChannel interface and provides a registry
 * of channel implementations. New channels (Webhook) only need to implement
 * the interface and register in createChannel().
 *
 * Currently supported channels:
 *  - ntfy:     Push via ntfy.sh or self-hosted ntfy server
 *  - pushover: Push via Pushover API (user key + app token)
 *  - telegram: Push via Telegram Bot API (bot token + chat ID)
 *  - email:    SMTP email via nodemailer (instance-wide SMTP_* env vars
 *              + per-user destination address)
 *
 * Most channels use native `fetch` — only the email channel adds nodemailer
 * (the SMTP protocol is unavoidable).
 *
 * This module is SERVER-SIDE ONLY.
 */

import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv, clientEnv } from "@/lib/env";
import { renderEmailTemplate } from "@/lib/email-templates";

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

// ─── Channel: Pushover ──────────────────────────────────────────────────────

/** JSONB config shape for the Pushover channel. */
export interface PushoverConfig {
  userKey: string;
  appToken: string;
}

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json";

/**
 * Pushover notification channel.
 *
 * Sends notifications via HTTP POST to the Pushover API.
 * Requires a user key and application API token.
 *
 * @see https://pushover.net/api
 */
class PushoverChannel implements NotificationChannel {
  private readonly userKey: string;
  private readonly appToken: string;

  constructor(config: PushoverConfig) {
    this.userKey = config.userKey;
    this.appToken = config.appToken;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const body: Record<string, string> = {
      token: this.appToken,
      user: this.userKey,
      message: payload.body,
      title: payload.title,
    };

    if (payload.url) {
      body.url = payload.url;
      body.url_title = "Open Momo";
    }

    const response = await fetch(PUSHOVER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Pushover responded with ${response.status}: ${await response.text().catch(() => "no body")}`
      );
    }
  }
}

// ─── Channel: Telegram ───────────────────────────────────────────────────────

/** JSONB config shape for the Telegram channel. */
export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

/**
 * Telegram Bot notification channel.
 *
 * Sends notifications via the Telegram Bot API sendMessage endpoint.
 * Uses HTML parse mode — robust escaping is handled here so payloads
 * with task titles containing &, <, > render correctly.
 *
 * @see https://core.telegram.org/bots/api#sendmessage
 */
class TelegramChannel implements NotificationChannel {
  private readonly botToken: string;
  private readonly chatId: string;

  constructor(config: TelegramConfig) {
    this.botToken = config.botToken;
    this.chatId = config.chatId;
  }

  /**
   * HTML-escape a string for Telegram's strict HTML parse mode.
   *
   * Escapes all five HTML-significant characters (`& < > " '`) so the
   * value is safe for both element-content context (`<b>{title}</b>`)
   * and attribute-value context (`href="{url}"`). Telegram itself only
   * cares about `& < >` for parse_mode=HTML, but escaping the quote
   * characters is required to prevent attribute injection if a payload
   * URL ever contains a `"`.
   */
  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async send(payload: NotificationPayload): Promise<void> {
    const title = this.escapeHtml(payload.title);
    const body = this.escapeHtml(payload.body);

    let text = `<b>${title}</b>\n${body}`;
    if (payload.url) {
      // Telegram requires the href value itself to be HTML-escaped too
      const href = this.escapeHtml(payload.url);
      text += `\n\n<a href="${href}">Open Momo</a>`;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Telegram responded with ${response.status}: ${await response.text().catch(() => "no body")}`
      );
    }
  }
}

// ─── Channel: Email (SMTP via nodemailer) ────────────────────────────────────

/** JSONB config shape for the Email channel. */
export interface EmailConfig {
  address: string;
}

/** Lazily-initialised SMTP transporter — created once per process. */
let cachedTransporter: Transporter | null = null;

/**
 * Returns the singleton nodemailer transporter, creating it on first use.
 * Throws if SMTP_HOST is not configured on the instance.
 */
function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = serverEnv.SMTP_HOST;
  if (!host) {
    throw new Error("Email notifications are not configured on this server");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: serverEnv.SMTP_PORT ?? 587,
    secure: serverEnv.SMTP_SECURE ?? false,
    auth:
      serverEnv.SMTP_USER && serverEnv.SMTP_PASS
        ? { user: serverEnv.SMTP_USER, pass: serverEnv.SMTP_PASS }
        : undefined,
  });

  return cachedTransporter;
}

/**
 * Returns true if the instance has SMTP configured (SMTP_HOST set).
 * Used by the settings UI to hide the email channel when unavailable.
 */
export function isEmailChannelAvailable(): boolean {
  return Boolean(serverEnv.SMTP_HOST && serverEnv.SMTP_FROM);
}

/**
 * Email notification channel.
 *
 * Sends notifications as HTML emails (with a plain-text alternative) via
 * the instance-wide SMTP transporter. The user only configures the
 * destination address — SMTP credentials live in env vars.
 */
class EmailChannel implements NotificationChannel {
  private readonly address: string;

  constructor(config: EmailConfig) {
    this.address = config.address;
  }

  async send(payload: NotificationPayload): Promise<void> {
    if (!isEmailChannelAvailable()) {
      throw new Error("Email notifications are not configured on this server");
    }

    const transporter = getTransporter();
    const appUrl = clientEnv.NEXT_PUBLIC_APP_URL;
    const html = renderEmailTemplate(payload, appUrl);
    const textParts = [payload.title, "", payload.body];
    if (payload.url) textParts.push("", payload.url);
    textParts.push(
      "",
      "—",
      `You're receiving this because email notifications are enabled in Momo. Manage settings: ${appUrl}/settings`
    );

    await transporter.sendMail({
      from: serverEnv.SMTP_FROM,
      to: this.address,
      subject: payload.title,
      text: textParts.join("\n"),
      html,
    });
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
    case "pushover":
      return new PushoverChannel(config as unknown as PushoverConfig);
    case "telegram":
      return new TelegramChannel(config as unknown as TelegramConfig);
    case "email":
      return new EmailChannel(config as unknown as EmailConfig);
    // Future channels:
    // case "webhook": return new WebhookChannel(config as unknown as WebhookConfig);
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
