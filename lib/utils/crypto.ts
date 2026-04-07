import {
  timingSafeEqual as nodeTimingSafeEqual,
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { serverEnv } from "@/lib/env";

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Use this instead of `===` when comparing secrets (e.g. CRON_SECRET).
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}

/** Reads and validates the TOTP_ENCRYPTION_KEY env var as a 32-byte buffer. */
function getTotpKey(): Buffer {
  const hex = serverEnv.TOTP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY is not configured — required for any 2FA operation"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext secret with AES-256-GCM using TOTP_ENCRYPTION_KEY.
 * Output format: base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext).
 * A fresh IV is generated for every call so two encryptions of the same
 * plaintext produce different ciphertexts.
 *
 * @param plaintext - The secret to encrypt (e.g. a base32 TOTP secret)
 * @returns Encoded ciphertext suitable for direct DB storage
 */
export function encryptSecret(plaintext: string): string {
  const key = getTotpKey();
  const iv = randomBytes(12); // GCM standard IV length
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

/**
 * Decrypts a value previously produced by `encryptSecret()`. Throws if the
 * payload is malformed, the auth tag fails, or TOTP_ENCRYPTION_KEY has been
 * rotated since encryption.
 *
 * @param payload - The encoded ciphertext from `encryptSecret`
 * @returns The original plaintext
 */
export function decryptSecret(payload: string): string {
  const key = getTotpKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("decryptSecret: malformed payload");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

/**
 * Hashes a backup code with SHA-256, mirroring the api_keys storage pattern.
 * Backup codes carry their own entropy (10 chars from a 36-char alphabet),
 * so plain SHA-256 is sufficient — no per-row salt needed.
 *
 * @param code - The plaintext backup code
 * @returns Hex-encoded SHA-256 digest
 */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
