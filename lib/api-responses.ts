/**
 * Shared API error responses that depend on nothing but the Fetch API.
 *
 * Kept apart from `lib/api-auth.ts` (which imports next-auth) so tests can
 * import the real responses. Routes keep importing them from `@/lib/api-auth`.
 */

/**
 * Returns a standard 403 response for read-only API key violations.
 *
 * @returns Response with 403 status, a descriptive error message, and
 *   `code: "READONLY_KEY"` so clients can detect this refusal programmatically.
 */
export function readonlyKeyResponse(): Response {
  return Response.json(
    {
      error: "Forbidden",
      message: "This API key is read-only. Use a read-write key to modify data.",
      code: "READONLY_KEY",
    },
    { status: 403 }
  );
}
