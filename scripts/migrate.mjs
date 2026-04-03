/**
 * Programmatic Drizzle ORM migration runner.
 *
 * Used by docker-entrypoint.sh to apply pending migrations before the
 * Next.js server starts. Uses drizzle-orm's built-in migrate() function
 * instead of drizzle-kit CLI, which hangs in non-interactive shells.
 *
 * Problem this script solves:
 *   Drizzle runs migration statements without a wrapping transaction, so a
 *   failed previous run can leave partial DDL (e.g. ENUM types) without the
 *   migration being recorded in drizzle.__drizzle_migrations. On the next
 *   start, Drizzle retries the same migration and fails on "already exists".
 *
 *   Additionally, when a DB was set up by other means (manual psql, earlier
 *   drizzle-kit run), some migrations may be applied but not tracked.
 *
 * Solution:
 *   Before calling migrate(), inspect each migration file and check whether
 *   the DB objects it creates (tables, indexes) actually exist. Only seed the
 *   migration as "applied" if ALL its objects are present. Stop at the first
 *   migration whose objects are missing — migrate() will then apply that
 *   migration and all subsequent ones normally.
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

// ---------------------------------------------------------------------------
// DB inspection helpers
// ---------------------------------------------------------------------------

async function tableExists(client, name) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rowCount > 0;
}

async function indexExists(client, name) {
  const r = await client.query(
    `SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1`,
    [name]
  );
  return r.rowCount > 0;
}

/**
 * Returns true if the given migration is already recorded in
 * drizzle.__drizzle_migrations (Drizzle's tracking schema).
 */
async function isMigrationTracked(client, hash) {
  // Table might not exist yet
  const schemaExists = await client.query(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'`
  );
  if (schemaExists.rowCount === 0) return false;

  const tableEx = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`
  );
  if (tableEx.rowCount === 0) return false;

  const r = await client.query(
    `SELECT 1 FROM drizzle."__drizzle_migrations" WHERE hash = $1`,
    [hash]
  );
  return r.rowCount > 0;
}

/**
 * Ensures drizzle schema + __drizzle_migrations table exist, then inserts
 * one tracking record for the given migration entry.
 */
async function seedOneMigration(client, entry, sqlContent) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const hash = createHash("sha256").update(sqlContent).digest("hex");
  const alreadyTracked = await isMigrationTracked(client, hash);
  if (!alreadyTracked) {
    await client.query(
      `INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when]
    );
    console.log(`[migrate] Seeded as applied: ${entry.tag}`);
  }
}

// ---------------------------------------------------------------------------
// Per-migration verification: parse SQL to find created objects, then check
// whether they already exist in the database.
// ---------------------------------------------------------------------------

/**
 * Extracts table names from CREATE TABLE statements in the SQL.
 * Matches: CREATE TABLE "name" and CREATE TABLE IF NOT EXISTS "name"
 */
function parseCreatedTables(sql) {
  return [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"(\w+)"/gi)].map(
    (m) => m[1]
  );
}

/**
 * Extracts index names from CREATE [UNIQUE] INDEX statements in the SQL.
 */
function parseCreatedIndexes(sql) {
  return [
    ...sql.matchAll(/CREATE (?:UNIQUE )?INDEX\s+"(\w+)"/gi),
  ].map((m) => m[1]);
}

/**
 * Returns true if all DB objects that the migration creates are already
 * present in the database. Used to determine whether the migration was
 * applied outside of Drizzle's tracking.
 *
 * A migration with no verifiable objects (no tables, no indexes) is treated
 * as NOT applied — migrate() will run it and it will either succeed or be a
 * no-op.
 */
async function isMigrationAppliedInDb(client, sqlContent) {
  const tables = parseCreatedTables(sqlContent);
  const indexes = parseCreatedIndexes(sqlContent);

  if (tables.length === 0 && indexes.length === 0) {
    // Cannot verify — let migrate() handle it
    return false;
  }

  for (const table of tables) {
    if (!(await tableExists(client, table))) return false;
  }
  for (const index of indexes) {
    if (!(await indexExists(client, index))) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main: seed already-applied migrations, then run migrate()
// ---------------------------------------------------------------------------

const client = await pool.connect();
try {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")
  );

  let seededAny = false;

  for (const entry of journal.entries) {
    const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
    const sqlContent = readFileSync(sqlPath, "utf8");
    const hash = createHash("sha256").update(sqlContent).digest("hex");

    // Skip if Drizzle already tracks this migration
    if (await isMigrationTracked(client, hash)) continue;

    // Check if the migration's DB objects actually exist
    if (await isMigrationAppliedInDb(client, sqlContent)) {
      await seedOneMigration(client, entry, sqlContent);
      seededAny = true;
    } else {
      // First migration whose objects are missing — stop here.
      // migrate() will apply this one and everything after it.
      break;
    }
  }

  if (seededAny) {
    console.log("[migrate] Migration history seeded for pre-existing schema.");
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
