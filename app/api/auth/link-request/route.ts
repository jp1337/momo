/**
 * POST /api/auth/link-request
 * Initiates the account linking flow for an additional OAuth provider.
 *
 * Creates a short-lived linking_request record (5 minute TTL) and returns the
 * URL to redirect the user to for the OAuth flow. After the user completes the
 * OAuth flow, Auth.js redirects them to /api/auth/link-callback?token=<id>
 * where the accounts are merged.
 *
 * Authentication: session cookie (required)
 * Body: { provider: "github" | "discord" | "google" | "keycloak" }
 * Returns: { redirectUrl: string }
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts, linkingRequests } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const PROVIDER_ENV_MAP: Record<string, string> = {
  github: "GITHUB_CLIENT_ID",
  discord: "DISCORD_CLIENT_ID",
  google: "GOOGLE_CLIENT_ID",
  keycloak: "OIDC_ISSUER",
};

const LinkRequestSchema = z.object({
  provider: z.enum(["github", "discord", "google", "keycloak"]),
});

/**
 * POST /api/auth/link-request
 * Creates a linking token and returns the OAuth redirect URL.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = LinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid provider", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { provider } = parsed.data;

  // Verify the requested provider is actually configured
  const envKey = PROVIDER_ENV_MAP[provider];
  const isConfigured =
    provider === "keycloak"
      ? !!serverEnv.OIDC_ISSUER && !!serverEnv.OIDC_CLIENT_ID && !!serverEnv.OIDC_CLIENT_SECRET
      : !!process.env[envKey];

  if (!isConfigured) {
    return Response.json(
      { error: "Provider not configured" },
      { status: 400 }
    );
  }

  // Check if this provider is already linked to the current user
  const existingAccount = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, provider)
      )
    )
    .limit(1);

  if (existingAccount.length > 0) {
    return Response.json(
      { error: "Provider already linked to your account" },
      { status: 409 }
    );
  }

  // Create the linking_request record (expires in 5 minutes)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const [linkRequest] = await db
    .insert(linkingRequests)
    .values({
      userId: session.user.id,
      provider,
      expiresAt,
    })
    .returning({ id: linkingRequests.id });

  const callbackUrl = `/api/auth/link-callback?token=${linkRequest.id}`;
  const redirectUrl = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return Response.json({ redirectUrl });
}
