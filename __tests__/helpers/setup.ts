/**
 * Vitest setup file — runs inside each test worker before the test file loads.
 *
 * Responsibilities:
 *  1. Seed achievement definitions once per worker (static master data)
 *  2. Reset all user-generated data before every individual test
 *
 * The `beforeAll` / `beforeEach` hooks registered here apply globally to
 * every test in the file that imports this setup.
 */

import { beforeAll, beforeEach } from "vitest";
import { seedAchievements } from "@/lib/gamification";
import { resetUserData } from "./db";

/** Seed achievement definitions exactly once — they are never user-data */
beforeAll(async () => {
  await seedAchievements();
});

/** Wipe all user-generated rows so tests start with a clean slate */
beforeEach(async () => {
  await resetUserData();
});
