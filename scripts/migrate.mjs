/**
 * Programmatic Drizzle ORM migration runner.
 *
 * Used by docker-entrypoint.sh to apply pending migrations before the
 * Next.js server starts. Uses drizzle-orm's built-in migrate() function
 * instead of drizzle-kit CLI, which hangs in non-interactive shells.
 *
 * Exits with code 1 on failure so the container does not start with a
 * stale or broken schema.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve migrations folder relative to this script: scripts/ → ../drizzle
const migrationsFolder = join(__dirname, "..", "drizzle");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrate] DATABASE_URL is not set — cannot run migrations.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 5_000,
});

console.log("[migrate] Connecting to database...");

const db = drizzle(pool);

try {
  console.log("[migrate] Applying pending migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] All migrations applied successfully.");
} catch (err) {
  console.error("[migrate] Migration failed:", err.message ?? err);
  process.exit(1);
} finally {
  await pool.end();
}
