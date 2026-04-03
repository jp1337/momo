/**
 * API Key business logic for Momo Personal Access Tokens.
 *
 * Keys are cryptographically secure (256-bit entropy) and stored as SHA-256
 * hashes — the plaintext is only shown once at creation and never persisted.
 *
 * Key format: `momo_live_<44 chars base64url(32 random bytes)>`
 */

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and, isNull, or, gt } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

/** API key row as returned to callers (keyHash is never exposed) */
export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  /** Display prefix — first 16 chars of plaintext + "..." */
  keyPrefix: string;
  readonly: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

/** Input for creating a new API key */
export interface CreateApiKeyInput {
  name: string;
  readonly: boolean;
  /** NULL = never expires */
  expiresAt: Date | null;
}

/** Result from generateApiKey() — only call is creation, plaintext immediately discarded */
export interface GeneratedKey {
  /** Full plaintext key — show once and discard */
  key: string;
  /** SHA-256(key) — store in DB */
  hash: string;
  /** First 16 chars + "..." — store for display */
  prefix: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a new cryptographically secure API key.
 *
 * Format: `momo_live_<44 chars base64url(32 random bytes)>`
 * Entropy: 256 bits (32 bytes × 8 bits/byte)
 * Hash: SHA-256 stored in DB — at 256-bit key space brute force is infeasible
 *
 * @returns The plaintext key, its SHA-256 hash, and the display prefix
 */
export function generateApiKey(): GeneratedKey {
  const raw = randomBytes(32);
  const key = `momo_live_${raw.toString("base64url")}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = `${key.slice(0, 16)}...`;
  return { key, hash, prefix };
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Creates a new API key for the given user.
 * Generates the key, hashes it, and persists the hash + metadata.
 *
 * @param userId - The owning user's UUID
 * @param input  - Key name, readonly flag, optional expiry date
 * @returns The plaintext key (show once) + the persisted record metadata
 */
export async function createApiKey(
  userId: string,
  input: CreateApiKeyInput
): Promise<{ plaintext: string; record: ApiKeyRecord }> {
  const { key, hash, prefix } = generateApiKey();

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name: input.name,
      keyHash: hash,
      keyPrefix: prefix,
      readonly: input.readonly,
      expiresAt: input.expiresAt,
    })
    .returning();

  return {
    plaintext: key,
    record: toRecord(row),
  };
}

/**
 * Lists all active (non-revoked) API keys for a user.
 * The keyHash column is never returned.
 *
 * @param userId - The user's UUID
 * @returns Array of ApiKeyRecord sorted by creation date (newest first)
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      readonly: apiKeys.readonly,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt);

  return rows.map(toRecord);
}

/**
 * Revokes an API key by setting revokedAt to NOW().
 * Only revokes keys that belong to the given user (ownership check).
 *
 * @param userId - The user's UUID (ownership guard)
 * @param keyId  - The API key's UUID
 * @throws Error if the key does not exist or belongs to another user
 */
export async function revokeApiKey(
  userId: string,
  keyId: string
): Promise<void> {
  const [updated] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  if (!updated) {
    throw new Error("API key not found or does not belong to this user");
  }
}

/**
 * Resolves the authenticated user from a raw API key string.
 *
 * Lookup steps:
 *  1. SHA-256 hash the raw key
 *  2. SELECT from api_keys WHERE key_hash = hash AND revoked_at IS NULL
 *  3. Reject if expires_at is set and in the past
 *  4. UPDATE last_used_at = NOW() (fire-and-forget)
 *
 * @param rawKey - The full plaintext key (e.g. from Authorization: Bearer header)
 * @returns { userId, readonly } if valid, or null if invalid / expired / revoked
 */
export async function resolveApiKeyUser(
  rawKey: string
): Promise<{ userId: string; readonly: boolean } | null> {
  const hash = createHash("sha256").update(rawKey).digest("hex");
  const now = new Date();

  const [row] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      readonly: apiKeys.readonly,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, hash),
        isNull(apiKeys.revokedAt),
        or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now))
      )
    )
    .limit(1);

  if (!row) return null;

  // Update last_used_at asynchronously — don't block the request
  void db
    .update(apiKeys)
    .set({ lastUsedAt: now })
    .where(eq(apiKeys.id, row.id));

  return { userId: row.userId, readonly: row.readonly };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Maps a DB row to an ApiKeyRecord, omitting keyHash.
 * Accepts rows from insert().returning() or select() queries.
 */
function toRecord(row: {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  readonly: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ApiKeyRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    readonly: row.readonly,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}
