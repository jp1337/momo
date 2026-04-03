/**
 * Programmatic Drizzle ORM migration runner.
 *
 * Used by docker-entrypoint.sh to apply pending migrations before the
 * Next.js server starts. Uses drizzle-orm's built-in migrate() function
 * instead of drizzle-kit CLI, which hangs in non-interactive shells.
 *
 * Handles pre-existing databases (schema applied outside of Drizzle) by
 * seeding the __drizzle_migrations tracking table when tables already exist
 * but no migrations are recorded. This prevents "already exists" errors on
 * container restarts or first-time deploys of existing databases.
 *
 * Exits with code 1 on failure so the container does not start with a
 * stale or broken schema.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
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

/**
 * Returns true if the given table exists in the public schema.
 */
async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rowCount > 0;
}

/**
 * Returns true if the given enum type exists in the public schema.
 * Used to detect partial migrations (ENUMs created, tables not yet).
 */
async function enumTypeExists(client, typeName) {
  const res = await client.query(
    `SELECT 1 FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typname = $1 AND t.typtype = 'e'`,
    [typeName]
  );
  return res.rowCount > 0;
}

/**
 * Returns the number of rows in __drizzle_migrations (0 if table doesn't exist).
 */
async function countTrackedMigrations(client) {
  const exists = await tableExists(client, "__drizzle_migrations");
  if (!exists) return 0;
  const res = await client.query('SELECT COUNT(*) FROM "__drizzle_migrations"');
  return parseInt(res.rows[0].count, 10);
}

/**
 * Pre-populates __drizzle_migrations with all SQL files found in the
 * migrations folder. Drizzle uses SHA-256(file content) as the hash.
 * Only call this when the schema is already applied but not yet tracked.
 */
async function seedMigrationHistory(client, folder) {
  const files = readdirSync(folder)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Ensure tracking table exists (drizzle-orm creates it, but we may run before it)
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  for (const file of files) {
    const sql = readFileSync(join(folder, file), "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");

    // Skip if already recorded (idempotent)
    const res = await client.query(
      'SELECT 1 FROM "__drizzle_migrations" WHERE hash = $1',
      [hash]
    );
    if (res.rowCount === 0) {
      await client.query(
        'INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [hash, Date.now()]
      );
      console.log(`[migrate] Seeded migration history: ${file}`);
    }
  }
}

const client = await pool.connect();
try {
  // Detect pre-existing or partially-applied schema.
  // Drizzle runs migration statements individually (no wrapping transaction),
  // so a failed previous run can leave ENUMs created but tables missing and
  // the migration untracked. On the next run, CREATE TYPE fails with "already exists".
  // We check for the first enum type from migration 0000 as the reliable signal.
  const usersExist = await tableExists(client, "users");
  const priorityTypeExists = await enumTypeExists(client, "priority");
  const schemaHasObjects = usersExist || priorityTypeExists;
  const trackedCount = await countTrackedMigrations(client);

  if (schemaHasObjects && trackedCount === 0) {
    console.log(
      "[migrate] Detected pre-existing schema without migration history — seeding tracking table..."
    );
    await seedMigrationHistory(client, migrationsFolder);
    console.log("[migrate] Migration history seeded.");
  }
} finally {
  client.release();
}

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
