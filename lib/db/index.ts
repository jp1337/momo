/**
 * Drizzle ORM database client.
 * Uses the `pg` driver and connects via the DATABASE_URL environment variable.
 * This module exports the `db` instance used throughout the application.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { serverEnv } from "@/lib/env";

/** PostgreSQL connection pool — shared across all requests */
const pool = new Pool({
  connectionString: serverEnv.DATABASE_URL,
  // In production, limit pool size to avoid exhausting DB connections
  max: process.env.NODE_ENV === "production" ? 10 : 5,
});

/**
 * The Drizzle ORM database instance.
 * Includes full schema for type-safe queries.
 * Use this in all database operations — never use raw pg queries in app code.
 */
export const db = drizzle(pool, { schema });

export type Database = typeof db;
