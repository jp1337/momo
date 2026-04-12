/**
 * GET  /api/user/api-keys  — Lists all active API keys for the current user
 * POST /api/user/api-keys  — Creates a new API key; returns the plaintext ONCE
 *
 * Authentication: session cookie or Bearer token (read-only keys may list keys but not create)
 * Rate limit: POST 10/hour per user
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { listApiKeys, createApiKey } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  readonly: z.boolean().default(false),
  /**
   * One of the preset expiry options, or null for no expiry.
   * "30d" | "90d" | "1y" | null
   */
  expiresIn: z.enum(["30d", "90d", "1y"]).nullable().default(null),
});

/**
 * Converts an expiresIn shorthand to an absolute Date.
 * Returns null when the key should never expire.
 */
function resolveExpiry(expiresIn: "30d" | "90d" | "1y" | null): Date | null {
  if (!expiresIn) return null;
  const now = new Date();
  switch (expiresIn) {
    case "30d":
      now.setDate(now.getDate() + 30);
      return now;
    case "90d":
      now.setDate(now.getDate() + 90);
      return now;
    case "1y":
      now.setFullYear(now.getFullYear() + 1);
      return now;
  }
}

/**
 * GET /api/user/api-keys
 * Returns a list of all active (non-revoked) API keys for the authenticated user.
 * The key hash is never returned — only the display prefix and metadata.
 */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const keys = await listApiKeys(user.userId);
    return Response.json({ apiKeys: keys });
  } catch (error) {
    console.error("[api-keys/GET]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/user/api-keys
 * Creates a new API key for the authenticated user.
 * The plaintext key is returned ONCE in this response — it is never stored.
 *
 * Body: { name: string, readonly?: boolean, expiresIn?: "30d"|"90d"|"1y"|null }
 * Returns: { key: string (plaintext, one-time), record: ApiKeyRecord }
 */
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();
  const { limited, resetAt } = checkRateLimit(
    `api-keys-create:${user.userId}`,
    10,
    60 * 60 * 1_000
  );
  if (limited) return rateLimitResponse(resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, readonly, expiresIn } = parsed.data;
  const expiresAt = resolveExpiry(expiresIn);

  try {
    const { plaintext, record } = await createApiKey(user.userId, {
      name,
      readonly,
      expiresAt,
    });

    return Response.json({ key: plaintext, record }, { status: 201 });
  } catch (error) {
    console.error("[api-keys/POST]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
