/**
 * GET    /api/settings/webhooks/:id — Get delivery history (last 50) for an endpoint.
 * PATCH  /api/settings/webhooks/:id — Update an outbound webhook endpoint.
 * DELETE /api/settings/webhooks/:id — Delete an outbound webhook endpoint.
 *
 * Requires: authentication
 */

import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import {
  listWebhookDeliveries,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
} from "@/lib/webhooks";
import { UpdateWebhookEndpointSchema } from "@/lib/validators";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET — Fetch the last 50 delivery attempts for the given endpoint.
 * Verifies endpoint ownership before returning.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const deliveries = await listWebhookDeliveries(id, user.userId);
    return NextResponse.json({ deliveries });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[GET /api/settings/webhooks/:id]", err);
    return NextResponse.json(
      { error: "Failed to fetch delivery history" },
      { status: 500 }
    );
  }
}

/**
 * PATCH — Partially update an outbound webhook endpoint.
 * Body: UpdateWebhookEndpointSchema
 * Response: 200 { endpoint } | 404 | 422 validation error
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const rateCheck = checkRateLimit(`webhooks-update:${user.userId}`, 20, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt) as NextResponse;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateWebhookEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const endpoint = await updateWebhookEndpoint(id, user.userId, parsed.data);
    return NextResponse.json({ endpoint });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[PATCH /api/settings/webhooks/:id]", err);
    return NextResponse.json(
      { error: "Failed to update webhook endpoint" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Remove an outbound webhook endpoint and its delivery history.
 * Response: 200 { success: true } | 404
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const user = await resolveApiUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse() as NextResponse;

  const { id } = await params;
  try {
    await deleteWebhookEndpoint(id, user.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[DELETE /api/settings/webhooks/:id]", err);
    return NextResponse.json(
      { error: "Failed to delete webhook endpoint" },
      { status: 500 }
    );
  }
}
