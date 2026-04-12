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
 *   Before calling migrate(), scan ALL migrations in the journal:
 *   - "tracked but objects missing" (stale) → delete tracking entry so
 *     migrate() will re-apply it. Do not stop early — multiple stale entries
 *     can exist and must all be cleared before migrate() runs.
 *   - "not tracked but objects present" → seed as applied so migrate() won't
 *     re-run DDL that already exists.
 *   - "not tracked and objects missing" → first genuinely pending migration;
 *     no need to inspect further, migrate() handles everything from here.
 *   After migrate() completes, a post-migration sanity check verifies that
 *   every table declared across all migration files actually exists in the DB.
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

// Apply statement_timeout to every connection in the pool — including those
// used by drizzle-orm/migrate() — so large backfill migrations cannot block
// container startup indefinitely.
pool.on("connect", (client) => {
  client.query("SET statement_timeout = 30000").catch(() => {});
});

console.log("[migrate] Connecting to database...");

const db = drizzle(pool);

// ---------------------------------------------------------------------------
// DB inspection helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given table exists in the public schema.
 * @param {import('pg').PoolClient} client
 * @param {string} name - Table name to check
 */
async function tableExists(client, name) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [name]
  );
  return r.rowCount > 0;
}

/**
 * Returns true if the given index exists in the public schema.
 * @param {import('pg').PoolClient} client
 * @param {string} name - Index name to check
 */
async function indexExists(client, name) {
  const r = await client.query(
    `SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1`,
    [name]
  );
  return r.rowCount > 0;
}

/**
 * Returns true if the given column exists on the specified table in the public schema.
 * @param {import('pg').PoolClient} client
 * @param {string} table - Table name to check
 * @param {string} column - Column name to check
 */
async function columnExists(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rowCount > 0;
}

/**
 * Extracts { table, column } pairs from ALTER TABLE ... ADD COLUMN statements.
 */
function parseAlterAddColumns(sql) {
  const pairs = [];
  // Matches: ALTER TABLE "table" ADD COLUMN "column" ... or without quotes
  // Supports hyphenated identifiers (e.g. "my-table") as well as plain word identifiers
  const re = /ALTER TABLE\s+"?([\w-]+)"?\s+ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"?([\w-]+)"?/gi;
  for (const m of sql.matchAll(re)) {
    pairs.push({ table: m[1], column: m[2] });
  }
  return pairs;
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
  const columns = parseAlterAddColumns(sqlContent);

  if (tables.length === 0 && indexes.length === 0 && columns.length === 0) {
    // Cannot verify — let migrate() handle it
    return false;
  }

  for (const table of tables) {
    if (!(await tableExists(client, table))) return false;
  }
  for (const index of indexes) {
    if (!(await indexExists(client, index))) return false;
  }
  for (const { table, column } of columns) {
    if (!(await columnExists(client, table, column))) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main: reconcile migration tracking, then run migrate()
// ---------------------------------------------------------------------------

const client = await pool.connect();
try {
  // Set a statement timeout so catalog queries never block indefinitely on a cold DB
  await client.query("SET statement_timeout = 30000");

  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")
  );

  let seededAny = false;
  let removedStale = 0;

  for (const entry of journal.entries) {
    try {
      const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
      const sqlContent = readFileSync(sqlPath, "utf8");
      const hash = createHash("sha256").update(sqlContent).digest("hex");

      const tracked = await isMigrationTracked(client, hash);
      const appliedInDb = await isMigrationAppliedInDb(client, sqlContent);

      if (tracked && !appliedInDb) {
        // Stale tracking entry: migration was recorded as applied but its DB
        // objects are missing. Remove it so migrate() will actually run it.
        await client.query(
          `DELETE FROM drizzle."__drizzle_migrations" WHERE hash = $1`,
          [hash]
        );
        console.log(`[migrate] Removed stale tracking entry: ${entry.tag}`);
        removedStale++;
        continue;
      }

      if (!tracked && appliedInDb) {
        // Schema exists but not tracked — seed so migrate() won't re-run it.
        await seedOneMigration(client, entry, sqlContent);
        seededAny = true;
        continue;
      }

      if (!tracked && !appliedInDb) {
        // Pending migration — migrate() will apply this.
        // Do NOT break here: later migrations may already be applied in the DB
        // out-of-order (e.g. via a manual ALTER or a partial previous run).
        // Those must be seeded before migrate() runs, otherwise migrate() would
        // attempt to re-apply them and fail with "column/table already exists".
        continue;
      }

      // tracked && appliedInDb — already in sync, nothing to do.
    } catch (err) {
      console.error(`[migrate] Error inspecting migration "${entry.tag}":`, err?.message ?? err);
      client.release();
      process.exit(1);
    }
  }

  if (removedStale > 0) {
    console.log(`[migrate] Cleared ${removedStale} stale tracking entr${removedStale === 1 ? "y" : "ies"} — migrate() will re-apply them.`);
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

// Post-migration sanity check: verify that all tables declared in migration
// files actually exist. Exits with code 1 if any table is missing so that
// the container never starts with a broken schema.
async function postMigrationCheck() {
  const checkPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
  });
  const checkClient = await checkPool.connect();
  try {
    const journal = JSON.parse(
      readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")
    );

    const missingTables = [];
    for (const entry of journal.entries) {
      const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
      const sqlContent = readFileSync(sqlPath, "utf8");
      const tables = parseCreatedTables(sqlContent);
      for (const table of tables) {
        if (!(await tableExists(checkClient, table))) {
          missingTables.push(`${table} (from ${entry.tag})`);
        }
      }
    }

    if (missingTables.length > 0) {
      console.error("[migrate] POST-MIGRATION CHECK FAILED — tables missing after migration:");
      for (const t of missingTables) console.error("  ✗", t);
      console.error("[migrate] Exiting to prevent starting with a broken schema.");
      process.exit(1);
    }
    console.log("[migrate] Post-migration check passed — all tables present.");
  } finally {
    checkClient.release();
    await checkPool.end();
  }
}

await postMigrationCheck();
