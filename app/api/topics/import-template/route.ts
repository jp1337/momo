/**
 * POST /api/topics/import-template
 *
 * Creates a new topic from a predefined template (see `lib/templates.ts`).
 * The template defines a title, description, icon, color, priority,
 * sequential-flag, default energy level and an ordered list of subtasks.
 * All localised strings are resolved server-side in the caller's current UI
 * locale so the resulting DB rows contain plain text the user can edit.
 *
 * Requires: authentication (session cookie or Bearer API key).
 * Readonly API keys are rejected.
 *
 * Body: { templateKey: "moving" | "taxes" | "fitness" }
 * Returns: 201 { topic: Topic, tasks: Task[] }
 * Errors: 400 invalid JSON, 401 Unauthorized, 403 readonly, 422 validation,
 *         429 rate-limited, 500 internal error.
 */

import { getLocale } from "next-intl/server";
import { resolveApiUser, readonlyKeyResponse } from "@/lib/api-auth";
import { ImportTemplateInputSchema } from "@/lib/validators";
import { importTopicFromTemplate } from "@/lib/templates";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { Locale } from "@/i18n/locales";

export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.readonly) return readonlyKeyResponse();

  // Rate limit: 10 template imports per minute per user — each import spawns
  // many tasks, so the limit is tighter than the normal topic-create limit.
  const rateCheck = checkRateLimit(`templates-import:${user.userId}`, 10, 60_000);
  if (rateCheck.limited) return rateLimitResponse(rateCheck.resetAt);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ImportTemplateInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const locale = (await getLocale()) as Locale;
    const result = await importTopicFromTemplate(
      user.userId,
      parsed.data.templateKey,
      locale
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/topics/import-template]", error);
    return Response.json({ error: "Failed to import template" }, { status: 500 });
  }
}
