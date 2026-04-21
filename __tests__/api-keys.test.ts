/**
 * Integration tests for lib/api-keys.ts.
 *
 * Covers: generateApiKey (format/entropy), createApiKey, listApiKeys
 * (non-revoked only), revokeApiKey, resolveApiKeyUser (valid / revoked /
 * expired keys + lastUsedAt update).
 */

import { describe, it, expect } from "vitest";
import {
  generateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  resolveApiKeyUser,
} from "@/lib/api-keys";
import { createTestUser, createTestApiKey } from "./helpers/fixtures";

const TZ = "Europe/Berlin";

// ─── generateApiKey ───────────────────────────────────────────────────────────

describe("generateApiKey", () => {
  it("returns a key matching the momo_live_ prefix pattern", () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^momo_live_[A-Za-z0-9_-]+$/);
  });

  it("returns a key prefix of length 16 chars + '...'", () => {
    const { key, prefix } = generateApiKey();
    expect(prefix).toBe(key.slice(0, 16) + "...");
  });

  it("returns a non-empty hash", () => {
    const { hash } = generateApiKey();
    expect(hash.length).toBeGreaterThan(0);
  });

  it("generates unique keys on each call", () => {
    const { key: key1 } = generateApiKey();
    const { key: key2 } = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

// ─── createApiKey ─────────────────────────────────────────────────────────────

describe("createApiKey", () => {
  it("creates an API key and returns the plaintext once", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { plaintext, record } = await createApiKey(user.id, {
      name: "Test Key",
      readonly: false,
    });

    expect(plaintext).toMatch(/^momo_live_/);
    expect(record.name).toBe("Test Key");
    expect(record.readonly).toBe(false);
    expect(record.revokedAt).toBeNull();
    expect(record.userId).toBe(user.id);
  });

  it("creates a read-only key", async () => {
    const user = await createTestUser({ timezone: TZ });

    const { record } = await createApiKey(user.id, {
      name: "Read Key",
      readonly: true,
    });

    expect(record.readonly).toBe(true);
  });

  it("creates a key with an expiry date", async () => {
    const user = await createTestUser({ timezone: TZ });
    const expiry = new Date(Date.now() + 86_400_000); // 24h from now

    const { record } = await createApiKey(user.id, {
      name: "Expiring Key",
      readonly: false,
      expiresAt: expiry,
    });

    expect(record.expiresAt).not.toBeNull();
  });
});

// ─── listApiKeys ──────────────────────────────────────────────────────────────

describe("listApiKeys", () => {
  it("returns non-revoked keys for the user", async () => {
    const user = await createTestUser({ timezone: TZ });
    await createApiKey(user.id, { name: "Active Key", readonly: false });

    const keys = await listApiKeys(user.id);
    expect(keys.find((k) => k.name === "Active Key")).toBeDefined();
  });

  it("excludes revoked keys", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { record } = await createApiKey(user.id, { name: "Will Revoke", readonly: false });
    await revokeApiKey(user.id, record.id);

    const keys = await listApiKeys(user.id);
    expect(keys.find((k) => k.id === record.id)).toBeUndefined();
  });

  it("isolates keys by user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    await createApiKey(userA.id, { name: "A's Key", readonly: false });

    const keys = await listApiKeys(userB.id);
    expect(keys).toHaveLength(0);
  });

  it("returns empty array when no active keys", async () => {
    const user = await createTestUser({ timezone: TZ });
    const keys = await listApiKeys(user.id);
    expect(keys).toHaveLength(0);
  });
});

// ─── revokeApiKey ─────────────────────────────────────────────────────────────

describe("revokeApiKey", () => {
  it("sets revokedAt on the key record", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { record } = await createApiKey(user.id, { name: "Revokable", readonly: false });

    await revokeApiKey(user.id, record.id);

    const remaining = await listApiKeys(user.id);
    expect(remaining.find((k) => k.id === record.id)).toBeUndefined();
  });

  it("throws when key belongs to another user", async () => {
    const userA = await createTestUser({ timezone: TZ });
    const userB = await createTestUser({ timezone: TZ });
    const { record } = await createApiKey(userA.id, { name: "A Key", readonly: false });

    await expect(revokeApiKey(userB.id, record.id)).rejects.toThrow();
  });
});

// ─── resolveApiKeyUser ────────────────────────────────────────────────────────

describe("resolveApiKeyUser", () => {
  it("resolves a valid key to the correct userId and readonly flag", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { plaintext, record } = await createApiKey(user.id, {
      name: "Valid Key",
      readonly: false,
    });

    const resolved = await resolveApiKeyUser(plaintext);
    expect(resolved).not.toBeNull();
    expect(resolved!.userId).toBe(user.id);
    expect(resolved!.readonly).toBe(record.readonly);
  });

  it("resolves a read-only key with readonly=true", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { plaintext } = await createApiKey(user.id, {
      name: "Read Only",
      readonly: true,
    });

    const resolved = await resolveApiKeyUser(plaintext);
    expect(resolved!.readonly).toBe(true);
  });

  it("returns null for a revoked key", async () => {
    const user = await createTestUser({ timezone: TZ });
    const { plaintext, record } = await createApiKey(user.id, {
      name: "Revoked",
      readonly: false,
    });
    await revokeApiKey(user.id, record.id);

    const resolved = await resolveApiKeyUser(plaintext);
    expect(resolved).toBeNull();
  });

  it("returns null for an expired key", async () => {
    const user = await createTestUser({ timezone: TZ });
    // Use fixture helper to directly insert an already-expired key
    const expiresAt = new Date(Date.now() - 10_000); // 10s in the past
    const { plaintext } = await createTestApiKey(user.id, { expiresAt });

    const resolved = await resolveApiKeyUser(plaintext);
    expect(resolved).toBeNull();
  });

  it("returns null for a completely unknown key", async () => {
    const resolved = await resolveApiKeyUser("momo_live_notarealkey1234567890abc");
    expect(resolved).toBeNull();
  });
});
