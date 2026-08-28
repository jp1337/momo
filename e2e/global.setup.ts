import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";
import { randomBytes, randomUUID } from "crypto";
import { Client } from "pg";

const authFile = "e2e/.auth/user.json";
const TEST_EMAIL = "e2e@momotest.local";

/**
 * Task 11 (I2): a second, dedicated session for a user with zero recurring
 * tasks — used only by the "leerer Zustand" regression test in
 * `progress.spec.ts`. `TEST_EMAIL`'s account accumulates recurring habits
 * across runs (11 at last count), so the empty branch of
 * `HabitsList`/`EmptyState` never actually renders against it — a test
 * driven by that session would read `dashed === 0` even before the fix and
 * prove nothing (this is exactly what happened the first time this test was
 * written: RED was captured with a throwaway user, then thrown away with the
 * user, leaving nothing a future change could re-run). This account is
 * created once and reused; as long as nothing ever creates a RECURRING task
 * for it, it stays empty across runs the same way `TEST_EMAIL` stays
 * populated across runs.
 */
const EMPTY_HABITS_AUTH_FILE = "e2e/.auth/empty-habits.json";
const EMPTY_HABITS_EMAIL = "e2e-empty-habits@momotest.local";

/**
 * Seeds a session directly in the database for the given user (find-or-
 * create by email) and writes it as Playwright storage state at `authFile`.
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
 * @param client - connected `pg` client
 * @param email - the seeded user's identity, stable across runs
 * @param userLabel - `users.name` for the seeded row
 * @param authFile - where to write the Playwright storage-state JSON
 */
async function authenticateAs(
  client: Client,
  email: string,
  userLabel: string,
  authFile: string,
): Promise<void> {
  // Find or create the user — the same identity across runs, so data seeded
  // by earlier test runs stays reachable (or, for the empty-habits user,
  // stays reliably absent).
  let result = await client.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    [email],
  );

  if (result.rowCount === 0) {
    result = await client.query<{ id: string }>(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING id",
      [randomUUID(), email, userLabel],
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
}

/**
 * Global auth setup — creates two sessions directly in the database and
 * saves them as Playwright storage state: the main, ever-growing test
 * account (`e2e/.auth/user.json`, used by default for every test), and a
 * second account with no recurring tasks (`e2e/.auth/empty-habits.json`,
 * used only where a test needs to see the genuinely empty branch of a page —
 * see the comment on `EMPTY_HABITS_EMAIL` above).
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
    await authenticateAs(client, TEST_EMAIL, "E2E Test User", authFile);
    await authenticateAs(
      client,
      EMPTY_HABITS_EMAIL,
      "E2E Empty Habits User",
      EMPTY_HABITS_AUTH_FILE,
    );
  } finally {
    await client.end();
  }
});
