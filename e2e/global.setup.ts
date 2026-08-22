import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";
import { randomBytes, randomUUID } from "crypto";
import { Client } from "pg";

const authFile = "e2e/.auth/user.json";
const TEST_EMAIL = "e2e@momotest.local";

/**
 * Global auth setup — creates a session directly in the database and saves it
 * as Playwright storage state for all subsequent tests.
 *
 * Why not sign in through the UI:
 *   Momo runs Auth.js with the Drizzle adapter and `session.strategy:
 *   "database"` (lib/auth.ts). Auth.js does not support the Credentials
 *   provider with database sessions — every attempt fails server-side with
 *   `UnsupportedStrategy: Signing in with credentials only supported if JWT
 *   strategy is enabled`. The `test-credentials` provider in lib/auth.ts can
 *   therefore never complete a login, and /login renders no credentials form
 *   at all. Driving a form here is not fixable without changing production
 *   auth, which a test harness must not do.
 *
 *   Seeding the session row is what the adapter itself would write on a real
 *   OAuth login, so the app sees an ordinary authenticated user.
 *
 * `second_factor_verified_at` is set so protected routes do not bounce to
 * /login/2fa — see the column comment in lib/db/schema.ts.
 *
 * Prerequisites:
 *   - Dev server running on PLAYWRIGHT_BASE_URL (default http://localhost:3000)
 *   - DATABASE_URL pointing at the same database that server uses
 */
setup("authenticate", async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. It must point at the same database the dev " +
        "server uses, so the seeded session is visible to the app.",
    );
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Find or create the test user — the same identity across runs, so tasks,
    // topics and streaks seeded by earlier tests stay reachable.
    let result = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1",
      [TEST_EMAIL],
    );

    if (result.rowCount === 0) {
      result = await client.query<{ id: string }>(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING id",
        [randomUUID(), TEST_EMAIL, "E2E Test User"],
      );
    }

    const userId = result.rows[0].id;

    // Without this the app redirects every protected route to /onboarding and
    // no test ever reaches the page it is asserting on.
    await client.query(
      "UPDATE users SET onboarding_completed = true WHERE id = $1",
      [userId],
    );

    // Drop stale sessions for this user so the table does not grow one row
    // per test run.
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);

    const sessionToken = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO sessions
         (session_token, user_id, expires, second_factor_verified_at, created_at)
       VALUES ($1, $2, $3, now(), now())`,
      [sessionToken, userId, expires],
    );

    // Cookie name follows Auth.js v5: the __Secure- prefix is only used over
    // HTTPS, and the E2E base URL is plain http on localhost.
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
    const isSecure = baseURL.startsWith("https://");
    const domain = new URL(baseURL).hostname;

    const storageState = {
      cookies: [
        {
          name: isSecure
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
          value: sessionToken,
          domain,
          path: "/",
          expires: Math.floor(expires.getTime() / 1000),
          httpOnly: true,
          secure: isSecure,
          sameSite: "Lax" as const,
        },
      ],
      origins: [],
    };

    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
  } finally {
    await client.end();
  }
});
