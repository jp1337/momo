/**
 * Unit tests for the pure/env-driven parts of lib/notifications.ts
 *
 * Covers:
 *  - isEmailChannelAvailable(): returns false without SMTP env vars
 *    (serverEnv is a Zod-parsed cached object; its values are fixed at
 *    module-load time from vitest.config.ts test.env, where no SMTP vars
 *    are injected — so the result is deterministically false in test env)
 *  - createChannel(): factory returns correct instance type for each channel
 *    type, returns null for unknown types
 *
 * These tests do not call .send() — that requires real HTTP connections.
 * No DB required.
 */

import { describe, it, expect } from "vitest";
import {
  isEmailChannelAvailable,
  createChannel,
  type NotificationChannel,
} from "@/lib/notifications";

// ─── isEmailChannelAvailable ──────────────────────────────────────────────────

describe("isEmailChannelAvailable", () => {
  it("returns a boolean value (type check)", () => {
    const result = isEmailChannelAvailable();
    expect(typeof result).toBe("boolean");
  });

  it("returns false in the test environment (no SMTP_HOST/SMTP_FROM injected)", () => {
    // vitest.config.ts does not inject SMTP_HOST or SMTP_FROM, so
    // serverEnv.SMTP_HOST and serverEnv.SMTP_FROM are both undefined.
    // The function returns Boolean(undefined && undefined) === false.
    expect(isEmailChannelAvailable()).toBe(false);
  });

  it("returns false consistently across multiple calls", () => {
    // Idempotency check — should never flip between calls
    const first = isEmailChannelAvailable();
    const second = isEmailChannelAvailable();
    expect(first).toBe(second);
  });

  it("does not throw even when SMTP env vars are absent", () => {
    expect(() => isEmailChannelAvailable()).not.toThrow();
  });
});

// ─── createChannel factory ────────────────────────────────────────────────────

describe("createChannel", () => {
  it("returns a non-null object for 'ntfy' type", () => {
    const channel = createChannel("ntfy", { topic: "test-topic" });
    expect(channel).not.toBeNull();
    expect(channel).toBeDefined();
  });

  it("ntfy channel has a send method", () => {
    const channel = createChannel("ntfy", { topic: "test-topic" });
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("returns a non-null object for 'pushover' type", () => {
    const channel = createChannel("pushover", {
      userKey: "testUserKey123",
      appToken: "testAppToken456",
    });
    expect(channel).not.toBeNull();
  });

  it("pushover channel has a send method", () => {
    const channel = createChannel("pushover", {
      userKey: "testUserKey123",
      appToken: "testAppToken456",
    });
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("returns a non-null object for 'telegram' type", () => {
    const channel = createChannel("telegram", {
      botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcde",
      chatId: "99887766",
    });
    expect(channel).not.toBeNull();
  });

  it("telegram channel has a send method", () => {
    const channel = createChannel("telegram", {
      botToken: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcde",
      chatId: "99887766",
    });
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("returns a non-null object for 'email' type", () => {
    const channel = createChannel("email", { address: "user@example.com" });
    expect(channel).not.toBeNull();
  });

  it("email channel has a send method", () => {
    const channel = createChannel("email", { address: "user@example.com" });
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("returns a non-null object for 'webhook' type", () => {
    const channel = createChannel("webhook", { url: "https://example.com/hook" });
    expect(channel).not.toBeNull();
  });

  it("webhook channel has a send method", () => {
    const channel = createChannel("webhook", { url: "https://example.com/hook" });
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("returns null for an unknown channel type", () => {
    const channel = createChannel("sms", { phone: "+1234567890" });
    expect(channel).toBeNull();
  });

  it("returns null for an empty string channel type", () => {
    const channel = createChannel("", {});
    expect(channel).toBeNull();
  });

  it("returns null for 'slack' (not implemented)", () => {
    const channel = createChannel("slack", { webhookUrl: "https://hooks.slack.com/..." });
    expect(channel).toBeNull();
  });

  it("returns null for 'discord' (not implemented)", () => {
    const channel = createChannel("discord", { webhookUrl: "https://discord.com/api/webhooks/..." });
    expect(channel).toBeNull();
  });

  it("returns distinct instances on multiple calls for the same type", () => {
    const a = createChannel("ntfy", { topic: "topic-a" });
    const b = createChannel("ntfy", { topic: "topic-b" });
    expect(a).not.toBe(b);
  });

  it("ntfy channel with custom server is created without throwing", () => {
    // We can only verify the channel was created — internal URL is private
    const channel = createChannel("ntfy", {
      topic: "alerts",
      server: "https://ntfy.myserver.example.com",
    });
    expect(channel).not.toBeNull();
    expect(typeof (channel as NotificationChannel).send).toBe("function");
  });

  it("webhook channel with secret is created without throwing", () => {
    const channel = createChannel("webhook", {
      url: "https://example.com/hook",
      secret: "my-super-secret",
    });
    expect(channel).not.toBeNull();
  });

  it("all supported channel types return non-null instances", () => {
    const configs: Array<[string, Record<string, unknown>]> = [
      ["ntfy", { topic: "t" }],
      ["pushover", { userKey: "k", appToken: "t" }],
      ["telegram", { botToken: "123:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", chatId: "1" }],
      ["email", { address: "a@b.com" }],
      ["webhook", { url: "https://example.com" }],
    ];
    for (const [type, config] of configs) {
      const channel = createChannel(type, config);
      expect(channel, `createChannel("${type}") should return non-null`).not.toBeNull();
    }
  });

  it("all supported channel types implement the NotificationChannel interface", () => {
    const configs: Array<[string, Record<string, unknown>]> = [
      ["ntfy", { topic: "t" }],
      ["pushover", { userKey: "k", appToken: "t" }],
      ["telegram", { botToken: "123:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", chatId: "1" }],
      ["email", { address: "a@b.com" }],
      ["webhook", { url: "https://example.com" }],
    ];
    for (const [type, config] of configs) {
      const channel = createChannel(type, config);
      expect(typeof (channel as NotificationChannel).send, `${type} channel should have send method`).toBe("function");
    }
  });

  it("createChannel returns null for a numeric string type", () => {
    const channel = createChannel("123", {});
    expect(channel).toBeNull();
  });

  it("createChannel handles extra config keys gracefully", () => {
    // Extra fields in config should not cause errors
    const channel = createChannel("ntfy", {
      topic: "t",
      extraField: "ignored",
      nested: { also: "ignored" },
    });
    expect(channel).not.toBeNull();
  });
});
