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
 *   Drizzle's migrate() uses a timestamp watermark: it only applies migrations
 *   whose folderMillis > MAX(created_at) in the tracking table. Migrations
 *   inserted into the middle of an existing sequence (e.g. a journal entry
 *   that was missing and later added) will be silently skipped by migrate()
 *   because their timestamp is below the watermark.
 *
 * Solution:
 *   Before calling migrate(), query the current watermark and scan ALL
 *   migrations in the journal:
 *   - "tracked but objects missing" (stale) → delete tracking entry so
 *     migrate() will re-apply it. Do not stop early — multiple stale entries
 *     can exist and must all be cleared before migrate() runs.
 *   - "not tracked but objects present" → seed as applied so migrate() won't
 *     re-run DDL that already exists.
 *   - "not tracked, objects missing, timestamp ≤ watermark" (out-of-order) →
 *     migrate() would silently skip this; apply the SQL directly here, with
 *     tolerance for "already exists" errors in case of partial prior runs.
 *   - "not tracked, objects missing, timestamp > watermark" (in-order pending)
 *     → migrate() will apply this normally.
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

  // Drizzle's migrate() uses a timestamp watermark: it only applies migrations
  // whose folderMillis > MAX(created_at) in the tracking table. Any migration
  // with a timestamp ≤ the watermark is silently skipped, even if it was never
  // actually applied to the DB (e.g. a journal entry that was missing and later
  // re-added). We must detect and apply those out-of-order migrations ourselves.
  let watermark = 0;
  try {
    const schemaEx = await client.query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'drizzle'`
    );
    if (schemaEx.rowCount > 0) {
      const tableEx = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`
      );
      if (tableEx.rowCount > 0) {
        const r = await client.query(
          `SELECT MAX(created_at) AS wm FROM drizzle."__drizzle_migrations"`
        );
        if (r.rows[0].wm !== null) {
          watermark = Number(r.rows[0].wm);
        }
      }
    }
  } catch (err) {
    console.warn("[migrate] Could not read migration watermark:", err.message);
  }

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
        if (entry.when > watermark) {
          // In-order pending migration — migrate() will apply this normally.
          continue;
        }

        // Out-of-order pending migration: this migration's timestamp is at or
        // below the current watermark, so Drizzle's migrate() will silently
        // skip it. Apply the SQL directly here instead.
        //
        // Individual statements may fail with "already exists" if a partial
        // previous run applied some but not all DDL — tolerate those errors.
        console.log(
          `[migrate] Out-of-order pending migration — applying directly: ${entry.tag}`
        );
        const statements = sqlContent
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s !== "");

        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (err) {
            // 42701 duplicate_column  42P07 duplicate_table
            // 42P06 duplicate_schema  42710 duplicate_object (enum/type)
            const alreadyExists = ["42701", "42P07", "42P06", "42710"].includes(
              err.code
            );
            if (alreadyExists) {
              console.log(
                `[migrate] DDL already present, skipping: ${stmt
                  .substring(0, 100)
                  .replace(/\s+/g, " ")}`
              );
            } else {
              throw err;
            }
          }
        }

        await seedOneMigration(client, entry, sqlContent);
        seededAny = true;
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

// Seed achievement definitions — idempotent via ON CONFLICT (key) DO UPDATE.
// Runs after every startup so adding new achievements to the code automatically
// populates them in the database without a manual migration.
const ACHIEVEMENT_DEFINITIONS = [
  // Common
  { key: "first_task",          title: "Erster Schritt",         description: "Erste Aufgabe erledigt",                            icon: "🌱",  rarity: "common",    coin_reward: 10,  secret: false },
  { key: "daily_quest_complete", title: "Tagessieger",            description: "Daily Quest erledigt",                              icon: "🌟",  rarity: "common",    coin_reward: 10,  secret: false },
  { key: "first_topic",          title: "Themensetzer",           description: "Erstes Topic erstellt",                             icon: "📁",  rarity: "common",    coin_reward: 10,  secret: false },
  { key: "first_high_priority",  title: "Volles Risiko",          description: "Erste Aufgabe mit hoher Priorität erledigt",        icon: "❗",  rarity: "common",    coin_reward: 10,  secret: false },
  { key: "first_wishlist_buy",   title: "Erster Wunsch",          description: "Erstes Wunschlisten-Item gekauft",                  icon: "🛍️", rarity: "common",    coin_reward: 10,  secret: false },
  // Rare
  { key: "streak_3",             title: "Drei am Stück",          description: "3-Tage-Streak erreicht",                            icon: "🔥",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "streak_7",             title: "Eine Woche",             description: "7-Tage-Streak erreicht",                            icon: "⚡",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "streak_14",            title: "Zwei Wochen",            description: "14-Tage-Streak erreicht",                           icon: "🌙",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "tasks_10",             title: "Fleißige Hände",         description: "10 Aufgaben erledigt",                              icon: "✋",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "tasks_50",             title: "Unaufhaltsam",           description: "50 Aufgaben erledigt",                              icon: "🚀",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "coins_100",            title: "Hundert Münzen",         description: "100 Coins gesammelt",                               icon: "🪙",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "level_5",              title: "Zeitwächter",            description: "Level 5 erreicht",                                  icon: "⭐",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "quest_streak_7",       title: "Wochensieger",           description: "7 Tage Daily Quest in Folge erledigt",              icon: "🎯",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "energy_checkin_7",     title: "Im Gleichgewicht",       description: "7 Tage in Folge Energie eingecheckt",               icon: "🧘",  rarity: "rare",      coin_reward: 25,  secret: false },
  { key: "night_owl",            title: "Nachtaktiv",             description: "Eine Aufgabe nach 23 Uhr erledigt",                 icon: "🦉",  rarity: "rare",      coin_reward: 25,  secret: true  },
  { key: "early_bird",           title: "Frühaufsteher",          description: "Eine Aufgabe vor 7 Uhr erledigt",                   icon: "🐦",  rarity: "rare",      coin_reward: 25,  secret: true  },
  // Epic
  { key: "streak_30",            title: "Ein Monat",              description: "30-Tage-Streak erreicht",                           icon: "💎",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "streak_60",            title: "Zwei Monate",            description: "60-Tage-Streak erreicht",                           icon: "🌊",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "tasks_100",            title: "Zeitmeister",            description: "100 Aufgaben erledigt",                             icon: "🏆",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "tasks_200",            title: "Beständig",              description: "200 Aufgaben erledigt",                             icon: "🎖️", rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "coins_500",            title: "Halbtausend",            description: "500 Coins gesammelt",                               icon: "💰",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "level_10",             title: "Legendär",               description: "Level 10 erreicht",                                 icon: "👑",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "topics_5",             title: "Themenmeister",          description: "5 Topics erstellt",                                 icon: "📚",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "quest_streak_30",      title: "Monatssieger",           description: "30 Tage Daily Quest in Folge erledigt",             icon: "🏅",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "wishlist_10_bought",   title: "Wunscherfüller",         description: "10 Wunschlisten-Items gekauft",                     icon: "🎁",  rarity: "epic",      coin_reward: 50,  secret: false },
  { key: "double_shift",         title: "Doppelschicht",          description: "Zwei Daily Quests an einem Tag erledigt",           icon: "⚡",  rarity: "epic",      coin_reward: 50,  secret: true  },
  // Legendary
  { key: "streak_100",           title: "Unbeugsamkeit",          description: "100-Tage-Streak erreicht",                          icon: "💪",  rarity: "legendary", coin_reward: 100, secret: false },
  { key: "streak_365",           title: "Ein Jahr",               description: "365-Tage-Streak erreicht",                          icon: "🌠",  rarity: "legendary", coin_reward: 100, secret: false },
  { key: "tasks_500",            title: "Ausdauerkämpfer",        description: "500 Aufgaben erledigt",                             icon: "⚔️", rarity: "legendary", coin_reward: 100, secret: false },
  { key: "tasks_1000",           title: "Tausendster",            description: "1000 Aufgaben erledigt",                            icon: "👾",  rarity: "legendary", coin_reward: 100, secret: false },
  { key: "first_sequential_topic", title: "Stratege",             description: "Erstes sequenzielles Topic erstellt",               icon: "🧭",  rarity: "legendary", coin_reward: 100, secret: false },
];

async function seedAchievements() {
  const seedPool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
  });
  const seedClient = await seedPool.connect();
  try {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await seedClient.query(
        `INSERT INTO achievements (id, key, title, description, icon, rarity, coin_reward, secret)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (key) DO UPDATE SET
           title       = EXCLUDED.title,
           description = EXCLUDED.description,
           icon        = EXCLUDED.icon,
           rarity      = EXCLUDED.rarity,
           coin_reward = EXCLUDED.coin_reward,
           secret      = EXCLUDED.secret`,
        [def.key, def.title, def.description, def.icon, def.rarity, def.coin_reward, def.secret]
      );
    }
    console.log(`[migrate] Achievement seed complete — ${ACHIEVEMENT_DEFINITIONS.length} definitions upserted.`);
  } catch (err) {
    console.error("[migrate] Achievement seed failed:", err.message ?? err);
    process.exit(1);
  } finally {
    seedClient.release();
    await seedPool.end();
  }
}

await seedAchievements();

// One-time data fix: sync users.level with actual coin balance.
// Previously, achievement coins were booked without recalculating the level,
// causing a mismatch between the dashboard (reads DB level) and the navbar
// (computes from coins). Idempotent — safe to run on every startup.
async function syncUserLevels() {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000,
  });
  const client = await pool.connect();
  try {
    const result = await client.query(`
      UPDATE users SET level = CASE
        WHEN coins >= 3000 THEN 10
        WHEN coins >= 2300 THEN 9
        WHEN coins >= 1700 THEN 8
        WHEN coins >= 1200 THEN 7
        WHEN coins >= 800  THEN 6
        WHEN coins >= 500  THEN 5
        WHEN coins >= 300  THEN 4
        WHEN coins >= 150  THEN 3
        WHEN coins >= 50   THEN 2
        ELSE 1
      END
      WHERE level != CASE
        WHEN coins >= 3000 THEN 10
        WHEN coins >= 2300 THEN 9
        WHEN coins >= 1700 THEN 8
        WHEN coins >= 1200 THEN 7
        WHEN coins >= 800  THEN 6
        WHEN coins >= 500  THEN 5
        WHEN coins >= 300  THEN 4
        WHEN coins >= 150  THEN 3
        WHEN coins >= 50   THEN 2
        ELSE 1
      END
    `);
    if (result.rowCount > 0) {
      console.log(`[migrate] Synced level for ${result.rowCount} user(s) whose level was out of sync with coins.`);
    }
  } catch (err) {
    console.error("[migrate] syncUserLevels failed (non-fatal):", err.message ?? err);
  } finally {
    client.release();
    await pool.end();
  }
}

await syncUserLevels();
