/**
 * GET /api/openapi.json
 * Serves the OpenAPI 3.1.0 specification for the Momo API.
 * Requires: no authentication
 * Returns: OpenAPI 3.1.0 document (application/json)
 *
 * Cached for 5 minutes (public) so that Swagger UI and API clients
 * benefit from browser/CDN caching without serving stale specs for too long.
 */

import { openApiSpec } from "@/lib/openapi";

/**
 * GET /api/openapi.json
 * Returns the full OpenAPI 3.1.0 specification as JSON.
 * No authentication required — the spec itself contains no sensitive data.
 */
export function GET() {
  return Response.json(openApiSpec, {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
