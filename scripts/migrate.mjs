/**
 * Programmatic Drizzle ORM migration runner.
 *
 * Used by docker-entrypoint.sh to apply pending migrations before the
 * Next.js server starts. Uses drizzle-orm's built-in migrate() function
 * instead of drizzle-kit CLI, which hangs in non-interactive shells.
 *
 * Drizzle stores migration history in the "drizzle" schema:
 *   drizzle.__drizzle_migrations (id, hash, created_at)
 * where created_at = folderMillis from meta/_journal.json.
 *
 * When a database already has the schema applied (but no migration history),
 * Drizzle tries to re-run all migrations and fails on "already exists" errors.
 * This script detects that situation and pre-seeds the tracking table so that
 * migrate() treats everything as already applied.
 *
 * Exits with code 1 on failure so the container does not start with a
 * stale or broken schema.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
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
 * Returns true if the given enum type exists in the public schema.
 * Used to detect whether any schema has already been applied to the database.
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
 * Returns the number of rows in drizzle.__drizzle_migrations.
 * Returns 0 if the schema or table doesn't exist yet.
 */
async function countTrackedMigrations(client) {
  const res = await client.query(
    `SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`
  );
  if (parseInt(res.rows[0].count, 10) === 0) return 0;

  const rows = await client.query(
    'SELECT COUNT(*) FROM drizzle."__drizzle_migrations"'
  );
  return parseInt(rows.rows[0].count, 10);
}

/**
 * Pre-seeds drizzle.__drizzle_migrations using the journal + SQL files so that
 * migrate() considers all existing migrations as already applied.
 *
 * Drizzle uses:
 *   hash       = SHA-256(raw SQL file content)
 *   created_at = journalEntry.when (folderMillis)
 *
 * The schema and table are created if they don't exist yet.
 */
async function seedMigrationHistory(client, folder) {
  const journal = JSON.parse(
    readFileSync(join(folder, "meta", "_journal.json"), "utf8")
  );

  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  for (const entry of journal.entries) {
    const sqlPath = join(folder, `${entry.tag}.sql`);
    const sqlContent = readFileSync(sqlPath, "utf8");
    const hash = createHash("sha256").update(sqlContent).digest("hex");

    // Idempotent: skip if this migration is already recorded
    const exists = await client.query(
      'SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = $1',
      [hash]
    );
    if (exists.rowCount === 0) {
      await client.query(
        'INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
        [hash, entry.when]
      );
      console.log(`[migrate] Seeded: ${entry.tag}`);
    }
  }
}

// --- Detect pre-existing schema and seed if needed ---

const client = await pool.connect();
try {
  const priorityTypeExists = await enumTypeExists(client, "priority");
  const trackedCount = await countTrackedMigrations(client);

  if (priorityTypeExists && trackedCount === 0) {
    console.log(
      "[migrate] Pre-existing schema detected without migration history — seeding drizzle.__drizzle_migrations..."
    );
    await seedMigrationHistory(client, migrationsFolder);
    console.log("[migrate] Migration history seeded successfully.");
  }
} finally {
  client.release();
}

// --- Run pending migrations (no-op if all are already tracked) ---

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
