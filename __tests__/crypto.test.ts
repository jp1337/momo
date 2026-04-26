/**
 * Tests for lib/utils/crypto.ts
 *
 * Covers all four exported functions:
 *  - timingSafeEqual: constant-time string comparison
 *  - encryptSecret: AES-256-GCM encryption with fresh IV per call
 *  - decryptSecret: AES-256-GCM decryption, malformed-payload rejection
 *  - hashBackupCode: SHA-256 hex digest of backup codes
 *
 * These are pure cryptographic functions — no DB required.
 * The TOTP_ENCRYPTION_KEY env var is injected by vitest.config.ts.
 */

import { describe, it, expect } from "vitest";
import {
  timingSafeEqual,
  encryptSecret,
  decryptSecret,
  hashBackupCode,
} from "@/lib/utils/crypto";

// ─── timingSafeEqual ──────────────────────────────────────────────────────────

describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for strings with different content", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns false for strings with different lengths", () => {
    expect(timingSafeEqual("short", "longer-string")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false when one string is empty and the other is not", () => {
    expect(timingSafeEqual("", "notempty")).toBe(false);
    expect(timingSafeEqual("notempty", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(timingSafeEqual("Hello", "hello")).toBe(false);
  });

  it("handles special characters correctly", () => {
    expect(timingSafeEqual("abc!@#$%", "abc!@#$%")).toBe(true);
    expect(timingSafeEqual("abc!@#$%", "abc!@#$&")).toBe(false);
  });

  it("handles Unicode strings", () => {
    expect(timingSafeEqual("föö", "föö")).toBe(true);
    expect(timingSafeEqual("föö", "bar")).toBe(false);
  });

  it("handles API key-like strings", () => {
    const key = "momo_live_abc123XYZ789";
    expect(timingSafeEqual(key, key)).toBe(true);
    expect(timingSafeEqual(key, key + "x")).toBe(false);
  });
});

// ─── encryptSecret / decryptSecret ───────────────────────────────────────────

describe("encryptSecret", () => {
  it("returns a string in the format base64:base64:base64", () => {
    const result = encryptSecret("my-secret");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be valid base64 (non-empty)
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("produces different ciphertexts for successive calls (fresh IV)", () => {
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("encrypts an empty string without throwing", () => {
    expect(() => encryptSecret("")).not.toThrow();
  });

  it("encrypts long strings", () => {
    const long = "a".repeat(5000);
    const result = encryptSecret(long);
    expect(result.split(":")).toHaveLength(3);
  });

  it("encrypts strings with special characters", () => {
    const special = "P@ssw0rd!#$%^&*()_+-=[]{}|;':\",./<>?";
    const result = encryptSecret(special);
    expect(result.split(":")).toHaveLength(3);
  });
});

describe("decryptSecret", () => {
  it("round-trips a simple string", () => {
    const plaintext = "my-totp-secret";
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptSecret("");
    expect(decryptSecret(encrypted)).toBe("");
  });

  it("round-trips a long string", () => {
    const long = "x".repeat(3000);
    const encrypted = encryptSecret(long);
    expect(decryptSecret(encrypted)).toBe(long);
  });

  it("round-trips a string with special characters", () => {
    const special = "JBSWY3DPEHPK3PXP"; // typical base32 TOTP secret
    const encrypted = encryptSecret(special);
    expect(decryptSecret(encrypted)).toBe(special);
  });

  it("round-trips Unicode content", () => {
    const unicode = "секрет-🔑";
    const encrypted = encryptSecret(unicode);
    expect(decryptSecret(encrypted)).toBe(unicode);
  });

  it("throws on a malformed payload with only two parts", () => {
    expect(() => decryptSecret("part1:part2")).toThrow("decryptSecret: malformed payload");
  });

  it("throws on a malformed payload with four parts", () => {
    expect(() => decryptSecret("a:b:c:d")).toThrow("decryptSecret: malformed payload");
  });

  it("throws on an empty payload string", () => {
    expect(() => decryptSecret("")).toThrow();
  });

  it("throws when auth tag has been tampered with", () => {
    const encrypted = encryptSecret("original");
    const parts = encrypted.split(":");
    // Corrupt the auth tag (second part)
    const corruptedTag = Buffer.from(parts[1], "base64");
    corruptedTag[0] ^= 0xff;
    const tampered = `${parts[0]}:${corruptedTag.toString("base64")}:${parts[2]}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when ciphertext has been tampered with", () => {
    const encrypted = encryptSecret("secure-data");
    const parts = encrypted.split(":");
    // Corrupt the ciphertext (third part)
    const corruptedCt = Buffer.from(parts[2], "base64");
    if (corruptedCt.length > 0) {
      corruptedCt[0] ^= 0xff;
    }
    const tampered = `${parts[0]}:${parts[1]}:${corruptedCt.toString("base64")}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("multiple encrypt-decrypt cycles remain consistent", () => {
    const plaintexts = ["alpha", "beta", "gamma", "delta"];
    for (const pt of plaintexts) {
      const encrypted = encryptSecret(pt);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(pt);
    }
  });
});

// ─── hashBackupCode ───────────────────────────────────────────────────────────

describe("hashBackupCode", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = hashBackupCode("ABCDE12345");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    const code = "XYZ9876543";
    expect(hashBackupCode(code)).toBe(hashBackupCode(code));
  });

  it("produces different hashes for different codes", () => {
    expect(hashBackupCode("AAAAAAAAAA")).not.toBe(hashBackupCode("BBBBBBBBBB"));
  });

  it("handles an empty string without throwing", () => {
    const hash = hashBackupCode("");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is case-sensitive (uppercase != lowercase)", () => {
    expect(hashBackupCode("ABCDE12345")).not.toBe(hashBackupCode("abcde12345"));
  });

  it("produces the correct SHA-256 for a known input", () => {
    // SHA-256 of "test" is known:
    // 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    const hash = hashBackupCode("test");
    expect(hash).toBe("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
  });

  it("handles long strings", () => {
    const hash = hashBackupCode("A".repeat(1000));
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
