/**
 * GET /api/health
 * Health check endpoint used by Docker, Kubernetes liveness/readiness probes,
 * and load balancers to determine if the application is running.
 * Requires: no authentication
 * Returns: { status: "ok", timestamp: string }
 */

/**
 * GET /api/health
 * Returns a 200 response with current server timestamp.
 * This endpoint is intentionally unauthenticated so that infrastructure
 * probes can check app health without credentials.
 */
export async function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
