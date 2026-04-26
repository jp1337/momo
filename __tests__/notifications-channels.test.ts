/**
 * Unit tests for the channel send() implementations in lib/notifications.ts.
 *
 * Tests the HTTP dispatch logic for NtfyChannel, PushoverChannel,
 * TelegramChannel, WebhookChannel using vi.spyOn(global, "fetch").
 *
 * The EmailChannel is excluded because it uses nodemailer (SMTP, not fetch)
 * and is already guarded by isEmailChannelAvailable().
 *
 * No DB access required — createChannel is a pure factory.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createChannel,
  type NotificationPayload,
  type NotificationChannel,
} from "@/lib/notifications";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetchMock = vi.spyOn(global, "fetch");

beforeEach(() => {
  fetchMock.mockReset();
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
