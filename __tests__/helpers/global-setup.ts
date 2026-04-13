/**
 * Vitest global setup — runs ONCE in the main process before any test workers start.
 *
 * Responsibilities:
 *  - Verify the test database is reachable
 *  - Apply all pending Drizzle migrations so the schema is up-to-date
 *
 * This file intentionally does NOT import from lib/ to avoid triggering
 * the lib/env.ts Zod validation in the main process (where test.env vars
 * are not yet injected — those are worker-only).
 */

import path from "path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://momo:momo_dev_password@localhost:5432/momo_test";

/**
 * Ensures the test database exists — creates it if not.
 * Connects to the `postgres` system database to run CREATE DATABASE.
 */
async function ensureTestDatabase(dbUrl: string): Promise<void> {
  const url = new URL(dbUrl);
  const dbName = url.pathname.slice(1); // strip leading "/"

  // Connect to the default "postgres" database to issue CREATE DATABASE
  url.pathname = "/postgres";
  const adminPool = new Pool({ connectionString: url.toString(), max: 1 });

  try {
    const result = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (result.rowCount === 0) {
      // Database doesn't exist yet — create it
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[global-setup] Created database: ${dbName}`);
    }
  } finally {
    await adminPool.end();
  }
}

/**
 * Called by Vitest once before any test workers are spawned.
 * Creates the test database if necessary and runs all pending migrations.
 */
export async function setup(): Promise<void> {
  try {
    await ensureTestDatabase(TEST_DB_URL);
  } catch (err) {
    // Non-fatal: might not have permission to CREATE DATABASE (use existing DB)
    console.warn("[global-setup] Could not ensure test DB exists:", (err as Error).message);
  }

  const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

  try {
    const db = drizzle(pool);
    const migrationsFolder = path.resolve("./drizzle");

    console.log(`\n[global-setup] Running migrations on ${TEST_DB_URL} …`);
    await migrate(db, { migrationsFolder });
    console.log("[global-setup] Migrations complete.\n");
  } finally {
    await pool.end();
  }
}
