/**
 * GET/POST /api/auth/[...nextauth]
 *
 * Auth.js v5 catch-all route handler.
 * Handles all authentication endpoints:
 *  - GET  /api/auth/signin          — initiates OAuth flow
 *  - GET  /api/auth/callback/:provider — OAuth callback
 *  - POST /api/auth/signout          — signs the user out
 *  - GET  /api/auth/session          — returns session data
 *  - GET  /api/auth/csrf             — CSRF token endpoint
 *
 * Authentication: N/A (this IS the auth endpoint)
 */

import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;

// Use the Node.js runtime for OAuth flows (edge runtime doesn't support all crypto)
export const runtime = "nodejs";
