/**
 * Drizzle Kit configuration.
 * Used by `drizzle-kit generate` and `drizzle-kit migrate` CLI commands.
 *
 * Migration files are stored in the `drizzle/` directory.
 * The database schema is defined in `lib/db/schema.ts`.
 */

import type { Config } from "drizzle-kit";

const config: Config = {
  /** Path to the Drizzle schema file */
  schema: "./lib/db/schema.ts",

  /** Directory where migration SQL files are generated */
  out: "./drizzle",

  /** Database dialect */
  dialect: "postgresql",

  /** Database connection — read from environment */
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://momo:password@localhost:5432/momo",
  },

  /** Verbose logging in development */
  verbose: process.env.NODE_ENV !== "production",

  /** Strict mode — fail if schema drift is detected */
  strict: true,
};

export default config;
