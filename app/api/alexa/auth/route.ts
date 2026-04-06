/**
 * GET /api/alexa/auth
 *
 * OAuth 2.0 Implicit Grant authorization endpoint for Alexa Account Linking.
 *
 * Alexa redirects every user here when they tap "Link Account" in the Alexa app.
 * This endpoint works for ALL Momo users — not just the developer.
 *
 * Expected query parameters (sent by Amazon):
 *   response_type  — must be "token"
 *   client_id      — "momo-alexa" (configured in Alexa Developer Console)
 *   redirect_uri   — Amazon's callback URI (validated against known Alexa domains)
 *   state          — opaque value, forwarded unchanged to redirect_uri
 *
 * Flow:
 *   1. Validate OAuth parameters
 *   2. Check if the user has an active Momo session
 *   3. Not logged in → redirect to /login, return here after successful login
 *   4. Logged in → create a dedicated "Alexa" API key for this user
 *   5. Redirect to redirect_uri#access_token=<key>&token_type=Bearer&state=<state>
 *
 * The generated API key is stored in the user's API key list (visible under Settings)
 * and can be revoked at any time to disconnect the Alexa skill.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createApiKey } from "@/lib/api-keys";

/**
 * Amazon's official Alexa account linking callback domains.
 * Only redirect_uri values pointing to these domains are accepted.
 * Source: https://developer.amazon.com/en-US/docs/alexa/account-linking/requirements-account-linking.html
 */
const ALEXA_REDIRECT_DOMAINS = [
  "https://layla.amazon.com",
  "https://pitangui.amazon.com",
  "https://alexa.amazon.co.jp",
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const responseType = searchParams.get("response_type");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state") ?? "";

  // ── Parameter validation ────────────────────────────────────────────────────

  if (responseType !== "token") {
    return new Response("Bad Request: response_type must be 'token'", {
      status: 400,
    });
  }

  if (!redirectUri) {
    return new Response("Bad Request: redirect_uri is required", { status: 400 });
  }

  // Only redirect to verified Amazon Alexa callback domains
  const isAlexaDomain = ALEXA_REDIRECT_DOMAINS.some((domain) =>
    redirectUri.startsWith(domain)
  );
  if (!isAlexaDomain) {
    return new Response(
      "Bad Request: redirect_uri must point to an Amazon Alexa callback domain",
      { status: 400 }
    );
  }

  // ── Session check ───────────────────────────────────────────────────────────

  const session = await auth();

  if (!session?.user?.id) {
    // Not logged in — send to Momo login, with this URL as the return destination
    const returnUrl = `/api/alexa/auth?${searchParams.toString()}`;
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", returnUrl);
    return NextResponse.redirect(loginUrl);
  }

  // ── Issue API key ────────────────────────────────────────────────────────────

  // Create a dedicated read-write API key named "Alexa" for this user.
  // Each account linking creates a new key — the user can revoke old ones
  // under Settings → API Keys to disconnect Alexa at any time.
  const { plaintext } = await createApiKey(session.user.id, {
    name: "Alexa",
    readonly: false,
    expiresAt: null,
  });

  // ── Redirect back to Alexa ───────────────────────────────────────────────────

  // Implicit Grant: access_token is returned in the URI fragment (never in query string)
  const fragment = new URLSearchParams({
    access_token: plaintext,
    token_type: "Bearer",
    state,
  }).toString();

  return NextResponse.redirect(`${redirectUri}#${fragment}`);
}
