/**
 * GET  /api/settings/webhooks — List all outbound webhook endpoints for the user.
 * POST /api/settings/webhooks — Create a new outbound webhook endpoint.
 *
 * Requires: authentication
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  MAX_WEBHOOK_ENDPOINTS,
} from "@/lib/webhooks";
import { CreateWebhookEndpointSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET — List all outbound webhook endpoints for the authenticated user.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const endpoints = await listWebhookEndpoints(user.userId);
    return NextResponse.json({ endpoints });
  } catch (err) {
    console.error("[GET /api/settings/webhooks]", err);
    return NextResponse.json(
      { error: "Failed to list webhook endpoints" },
      { status: 500 }
    );
  }
}

/**
 * POST — Create a new outbound webhook endpoint.
 * Body: CreateWebhookEndpointSchema
 * Response: 201 { endpoint } | 409 limit exceeded | 422 validation error
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const rateCheck = checkRateLimit(`webhooks-create:${user.userId}`, 20, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt) as NextResponse;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateWebhookEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const endpoint = await createWebhookEndpoint(user.userId, parsed.data);
    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "limit_exceeded") {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_WEBHOOK_ENDPOINTS} webhook endpoints per user`,
          code: "limit_exceeded",
        },
        { status: 409 }
      );
    }
    console.error("[POST /api/settings/webhooks]", err);
    return NextResponse.json(
      { error: "Failed to create webhook endpoint" },
      { status: 500 }
    );
  }
}
