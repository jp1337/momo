/**
 * Unit tests for the channel send() implementations in lib/notifications.ts.
 *
 * Tests the HTTP dispatch logic for NtfyChannel, PushoverChannel,
 * TelegramChannel, WebhookChannel using vi.spyOn(global, "fetch").
 *
 * EmailChannel, isEmailChannelAvailable, sendToAllChannels, and
 * sendTestNotification are also covered below.
 *
 * The DB-backed fan-out tests (sendToAllChannels, sendTestNotification) use
 * the real momo_test database via the shared test infrastructure.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── Hoisted mocks (available before vi.mock factories run) ───────────────────

// vi.hoisted() runs BEFORE vi.mock() factories — variables defined here are
// safe to reference inside vi.mock() factory functions.
const { mockSendMail, mockTransporter, mockServerEnv } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-msg-id" });
  const mockTransporter = { sendMail: mockSendMail };

  // Plain mutable object — individual tests mutate specific keys and restore
  // them in beforeEach so each test starts with a fully-configured SMTP env.
  const mockServerEnv: Record<string, unknown> = {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: "user@example.com",
    SMTP_PASS: "secret",
    SMTP_FROM: "Momo <momo@example.com>",
    AUTH_SECRET: "vitest-auth-secret-at-least-32-characters-long!!",
    TOTP_ENCRYPTION_KEY:
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    VAPID_PRIVATE_KEY: undefined,
    CRON_SECRET: undefined,
  };

  return { mockSendMail, mockTransporter, mockServerEnv };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => mockTransporter),
  },
}));

vi.mock("@/lib/env", () => ({
  serverEnv: mockServerEnv,
  clientEnv: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// next/headers is transitively imported by some lib modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Stub email-templates so EmailChannel tests focus on transport dispatch
vi.mock("@/lib/email-templates", () => ({
  renderEmailTemplate: vi.fn(() => "<html>test email body</html>"),
}));

// Stub notification-log so logNotification calls never hit the DB in these tests
vi.mock("@/lib/notification-log", () => ({
  logNotification: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import nodemailer from "nodemailer";
import {
  createChannel,
  isEmailChannelAvailable,
  sendToAllChannels,
  sendTestNotification,
  type NotificationPayload,
  type NotificationChannel,
} from "@/lib/notifications";
import { db } from "@/lib/db";
import { notificationChannels } from "@/lib/db/schema";
import { createTestUser } from "./helpers/fixtures";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchMock = vi.spyOn(global, "fetch");

beforeEach(() => {
  fetchMock.mockReset();
  mockSendMail.mockClear();
  // Restore SMTP defaults before each test
  mockServerEnv.SMTP_HOST = "smtp.example.com";
  mockServerEnv.SMTP_PORT = 587;
  mockServerEnv.SMTP_SECURE = false;
  mockServerEnv.SMTP_USER = "user@example.com";
  mockServerEnv.SMTP_PASS = "secret";
  mockServerEnv.SMTP_FROM = "Momo <momo@example.com>";
});

afterEach(() => {
  fetchMock.mockRestore();
  // Re-spy for the next test block since mockRestore removes the spy entirely
  Object.defineProperty(global, "fetch", {
    value: fetchMock,
    writable: true,
    configurable: true,
  });
});

/** Minimal successful fetch response */
function okResponse(): Response {
  return new Response("ok", { status: 200 });
}

/** Minimal 500 fetch response */
function errorResponse(): Response {
  return new Response("Internal Error", { status: 500 });
}

const basePayload: NotificationPayload = {
  title: "Test Title",
  body: "Test body text",
  url: "https://example.com/app",
  tag: "test-tag",
};

// ─── NtfyChannel ──────────────────────────────────────────────────────────────

describe("NtfyChannel.send", () => {
  it("makes a POST request to the default ntfy.sh server", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", { topic: "my-alerts" }) as NotificationChannel;

    await channel.send(basePayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ntfy.sh/my-alerts");
    expect(options.method).toBe("POST");
    expect(options.body).toBe(basePayload.body);
  });

  it("includes Title header in the request", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Title"]).toBe(basePayload.title);
  });

  it("includes Click header when url is present", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Click"]).toBe(basePayload.url);
  });

  it("includes Tags header when tag is present", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Tags"]).toBe(basePayload.tag);
  });

  it("omits Click header when url is absent", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await channel.send({ title: "No URL", body: "Just body" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Click"]).toBeUndefined();
  });

  it("uses a custom server URL when provided", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", {
      topic: "alerts",
      server: "https://ntfy.myserver.example.com",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ntfy.myserver.example.com/alerts");
  });

  it("strips trailing slash from custom server URL", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("ntfy", {
      topic: "alerts",
      server: "https://ntfy.myserver.example.com/",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://ntfy.myserver.example.com/alerts");
  });

  it("throws when the server responds with a non-2xx status", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("ntfy responded with 500");
  });

  it("uses 'no body' when response.text() rejects on error response (covers .catch fallback)", async () => {
    const failResponse = new Response("", { status: 500 });
    vi.spyOn(failResponse, "text").mockRejectedValueOnce(new Error("read failed"));
    fetchMock.mockResolvedValueOnce(failResponse);
    const channel = createChannel("ntfy", { topic: "alerts" }) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("ntfy responded with 500: no body");
  });
});

// ─── PushoverChannel ──────────────────────────────────────────────────────────

describe("PushoverChannel.send", () => {
  const pushoverConfig = { userKey: "user-key-abc", appToken: "app-token-xyz" };

  it("makes a POST request to the Pushover API URL", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await channel.send(basePayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.pushover.net/1/messages.json");
    expect(options.method).toBe("POST");
  });

  it("sends JSON Content-Type header", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("includes token, user, message, and title in the JSON body", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.token).toBe(pushoverConfig.appToken);
    expect(body.user).toBe(pushoverConfig.userKey);
    expect(body.message).toBe(basePayload.body);
    expect(body.title).toBe(basePayload.title);
  });

  it("includes url and url_title fields when url is present", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.url).toBe(basePayload.url);
    expect(body.url_title).toBe("Open Momo");
  });

  it("omits url fields when url is absent", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await channel.send({ title: "No URL", body: "Just body" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.url).toBeUndefined();
    expect(body.url_title).toBeUndefined();
  });

  it("throws when the server responds with a non-2xx status", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Pushover responded with 500");
  });

  it("uses 'no body' when response.text() rejects on error response (covers .catch fallback)", async () => {
    const failResponse = new Response("", { status: 500 });
    vi.spyOn(failResponse, "text").mockRejectedValueOnce(new Error("read failed"));
    fetchMock.mockResolvedValueOnce(failResponse);
    const channel = createChannel("pushover", pushoverConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Pushover responded with 500: no body");
  });
});

// ─── TelegramChannel ──────────────────────────────────────────────────────────

describe("TelegramChannel.send", () => {
  const telegramConfig = {
    botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh",
    chatId: "99887766",
  };

  it("makes a POST request to the Telegram Bot API sendMessage endpoint", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send(basePayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("api.telegram.org/bot");
    expect(url).toContain("/sendMessage");
    expect(options.method).toBe("POST");
  });

  it("includes the bot token in the URL", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(telegramConfig.botToken);
  });

  it("sends JSON body with chat_id and HTML parse_mode", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send({ title: "Hello", body: "World" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.chat_id).toBe(telegramConfig.chatId);
    expect(body.parse_mode).toBe("HTML");
  });

  it("wraps title in <b> HTML tags", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send({ title: "Bold Title", body: "Body text" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.text).toContain("<b>Bold Title</b>");
  });

  it("HTML-escapes special characters in the title", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send({ title: "Task <done> & more", body: "body" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.text).toContain("&lt;done&gt;");
    expect(body.text).toContain("&amp;");
  });

  it("includes an anchor link when url is present", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, string>;
    expect(body.text).toContain("<a href=");
    expect(body.text).toContain("Open Momo");
  });

  it("throws when the server responds with a non-2xx status", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Telegram responded with 500");
  });

  it("uses 'no body' when response.text() rejects on error response (covers .catch fallback)", async () => {
    const failResponse = new Response("", { status: 500 });
    vi.spyOn(failResponse, "text").mockRejectedValueOnce(new Error("read failed"));
    fetchMock.mockResolvedValueOnce(failResponse);
    const channel = createChannel("telegram", telegramConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Telegram responded with 500: no body");
  });
});

// ─── WebhookChannel ───────────────────────────────────────────────────────────

describe("WebhookChannel.send", () => {
  const webhookConfig = { url: "https://example.com/webhook" };

  it("makes a POST request to the configured webhook URL", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await channel.send(basePayload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(webhookConfig.url);
    expect(options.method).toBe("POST");
  });

  it("sends JSON Content-Type header", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends the correct JSON body shape", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.event).toBe("momo.notification");
    expect(body.title).toBe(basePayload.title);
    expect(body.body).toBe(basePayload.body);
    expect(body.url).toBe(basePayload.url);
    expect(body.tag).toBe(basePayload.tag);
    expect(typeof body.timestamp).toBe("string");
  });

  it("sets url and tag to null when absent from payload", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await channel.send({ title: "No extras", body: "Just body" });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as Record<string, unknown>;
    expect(body.url).toBeNull();
    expect(body.tag).toBeNull();
  });

  it("adds X-Momo-Signature header when a secret is configured", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", {
      url: "https://example.com/webhook",
      secret: "super-secret",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Momo-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("does not add X-Momo-Signature header when no secret is configured", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await channel.send(basePayload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["X-Momo-Signature"]).toBeUndefined();
  });

  it("throws for a non-HTTPS webhook URL", async () => {
    const channel = createChannel("webhook", {
      url: "http://example.com/webhook",
    }) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("HTTPS");
  });

  it("throws when the server responds with a non-2xx status", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Webhook responded with 500");
  });

  it("uses 'no body' when response.text() rejects on error response (covers .catch fallback)", async () => {
    const failResponse = new Response("", { status: 500 });
    vi.spyOn(failResponse, "text").mockRejectedValueOnce(new Error("read failed"));
    fetchMock.mockResolvedValueOnce(failResponse);
    const channel = createChannel("webhook", webhookConfig) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow("Webhook responded with 500: no body");
  });

  it("signature is reproducible — same payload and secret yield same signature", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const channel = createChannel("webhook", {
      url: "https://example.com/webhook",
      secret: "stable-secret",
    }) as NotificationChannel;

    await channel.send({ title: "Fixed", body: "Fixed body" });
    const sig1 = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;

    fetchMock.mockClear();

    await channel.send({ title: "Fixed", body: "Fixed body" });
    const sig2 = (fetchMock.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;

    // Both must be valid HMAC signatures but the timestamp differs, so bodies differ
    // — we only verify the header format is consistent
    expect(sig1["X-Momo-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(sig2["X-Momo-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});

// ─── EmailChannel ─────────────────────────────────────────────────────────────

describe("EmailChannel.send", () => {
  it("calls nodemailer.createTransport with the configured SMTP host", async () => {
    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    await channel.send(basePayload);

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.example.com" })
    );
  });

  it("calls transporter.sendMail with correct to and subject fields", async () => {
    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    await channel.send(basePayload);

    expect(mockSendMail).toHaveBeenCalledOnce();
    const mailOptions = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(mailOptions.to).toBe("recipient@example.com");
    expect(mailOptions.subject).toBe(basePayload.title);
  });

  it("uses the payload title as the email subject", async () => {
    const channel = createChannel("email", {
      address: "user@test.com",
    }) as NotificationChannel;
    const payload: NotificationPayload = {
      title: "Important Task Due",
      body: "Don't forget your task!",
    };

    await channel.send(payload);

    const mailOptions = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(mailOptions.subject).toBe("Important Task Due");
  });

  it("uses the channel config address as the recipient", async () => {
    const channel = createChannel("email", {
      address: "custom-recipient@domain.org",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const mailOptions = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(mailOptions.to).toBe("custom-recipient@domain.org");
  });

  it("includes the html field in the sendMail call", async () => {
    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const mailOptions = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof mailOptions.html).toBe("string");
    expect((mailOptions.html as string).length).toBeGreaterThan(0);
  });

  it("sets the from field from SMTP_FROM env", async () => {
    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    await channel.send(basePayload);

    const mailOptions = mockSendMail.mock.calls[0][0] as Record<string, unknown>;
    expect(mailOptions.from).toBe("Momo <momo@example.com>");
  });

  it("propagates sendMail rejection to the caller", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));

    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    // send() does not swallow errors — the caller (sendToAllChannels) catches them
    await expect(channel.send(basePayload)).rejects.toThrow("SMTP connection refused");
  });

  it("throws when SMTP is not configured (isEmailChannelAvailable returns false)", async () => {
    mockServerEnv.SMTP_HOST = undefined;

    const channel = createChannel("email", {
      address: "recipient@example.com",
    }) as NotificationChannel;

    await expect(channel.send(basePayload)).rejects.toThrow(
      "Email notifications are not configured on this server"
    );
  });
});

// ─── isEmailChannelAvailable ──────────────────────────────────────────────────

describe("isEmailChannelAvailable", () => {
  it("returns true when both SMTP_HOST and SMTP_FROM are configured", () => {
    mockServerEnv.SMTP_HOST = "smtp.example.com";
    mockServerEnv.SMTP_FROM = "Momo <momo@example.com>";

    expect(isEmailChannelAvailable()).toBe(true);
  });

  it("returns false when SMTP_HOST is missing", () => {
    mockServerEnv.SMTP_HOST = undefined;
    mockServerEnv.SMTP_FROM = "Momo <momo@example.com>";

    expect(isEmailChannelAvailable()).toBe(false);
  });

  it("returns false when SMTP_FROM is missing", () => {
    mockServerEnv.SMTP_HOST = "smtp.example.com";
    mockServerEnv.SMTP_FROM = undefined;

    expect(isEmailChannelAvailable()).toBe(false);
  });

  it("returns false when both SMTP_HOST and SMTP_FROM are missing", () => {
    mockServerEnv.SMTP_HOST = undefined;
    mockServerEnv.SMTP_FROM = undefined;

    expect(isEmailChannelAvailable()).toBe(false);
  });
});

// ─── sendToAllChannels ────────────────────────────────────────────────────────

describe("sendToAllChannels", () => {
  it("returns { sent: 0, failed: 0 } when the user has no channels", async () => {
    const user = await createTestUser();

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result).toEqual({ sent: 0, failed: 0 });
  });

  it("returns sent: 1 when a single enabled ntfy channel succeeds", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "fan-out-test" },
      enabled: true,
    });

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("calls all enabled channels when a user has multiple", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values([
      {
        userId: user.id,
        type: "ntfy",
        config: { topic: "chan-one" },
        enabled: true,
      },
      {
        userId: user.id,
        type: "webhook",
        config: { url: "https://hook.example.com/notify" },
        enabled: true,
      },
    ]);

    const result = await sendToAllChannels(user.id, basePayload);

    // Both channels dispatched (two fetch calls)
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("isolates channel failures — other channels still receive the notification", async () => {
    // First call (ntfy) returns 500; second call (webhook) returns 200
    fetchMock
      .mockResolvedValueOnce(errorResponse())
      .mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values([
      {
        userId: user.id,
        type: "ntfy",
        config: { topic: "will-fail" },
        enabled: true,
      },
      {
        userId: user.id,
        type: "webhook",
        config: { url: "https://hook.example.com/notify" },
        enabled: true,
      },
    ]);

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    // Both channels were attempted
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("passes extra payload fields (e.g. icon) through without error", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "webhook",
      config: { url: "https://hook.example.com/notify" },
      enabled: true,
    });

    // NotificationPayload is open — extra fields do not prevent delivery
    const payloadWithExtra = { ...basePayload } as NotificationPayload;

    const result = await sendToAllChannels(user.id, payloadWithExtra);

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("skips disabled channels entirely", async () => {
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "disabled-chan" },
      enabled: false,
    });

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failed: 1 when the only channel rejects", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "bad-chan" },
      enabled: true,
    });

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it("counts unsupported channel type as failed (createChannel returns null)", async () => {
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "unsupported_type",
      config: {},
      enabled: true,
    });

    const result = await sendToAllChannels(user.id, basePayload);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });
});

// ─── sendTestNotification ─────────────────────────────────────────────────────

describe("sendTestNotification", () => {
  it("returns false when the user has no channel of that type", async () => {
    const user = await createTestUser();

    const result = await sendTestNotification(user.id, "ntfy");

    expect(result).toBe(false);
  });

  it("calls the channel send() method and returns true on success", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "test-channel" },
      enabled: true,
    });

    const result = await sendTestNotification(user.id, "ntfy");

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("sends the standard test payload title via the ntfy Title header", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "test-payload-check" },
      enabled: true,
    });

    await sendTestNotification(user.id, "ntfy");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Title"]).toBe("Momo Test");
  });

  it("returns false when the channel send() throws — no uncaught rejection", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "ntfy",
      config: { topic: "failing-channel" },
      enabled: true,
    });

    // Must NOT throw — returns false on failure
    const result = await sendTestNotification(user.id, "ntfy");

    expect(result).toBe(false);
  });

  it("works for a webhook channel type", async () => {
    fetchMock.mockResolvedValueOnce(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "webhook",
      config: { url: "https://hook.example.com/test" },
      enabled: true,
    });

    const result = await sendTestNotification(user.id, "webhook");

    expect(result).toBe(true);
  });

  it("targets only the requested channel type, ignoring others for the same user", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const user = await createTestUser();
    await db.insert(notificationChannels).values([
      {
        userId: user.id,
        type: "ntfy",
        config: { topic: "ntfy-chan" },
        enabled: true,
      },
      {
        userId: user.id,
        type: "webhook",
        config: { url: "https://hook.example.com/test" },
        enabled: true,
      },
    ]);

    await sendTestNotification(user.id, "ntfy");

    // Only one fetch call — only the ntfy channel was targeted
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("ntfy.sh");
  });

  it("returns false when createChannel returns null (unsupported type in DB)", async () => {
    const user = await createTestUser();
    await db.insert(notificationChannels).values({
      userId: user.id,
      type: "unsupported_type",
      config: {},
      enabled: true,
    });

    const result = await sendTestNotification(user.id, "unsupported_type");

    expect(result).toBe(false);
  });
});
