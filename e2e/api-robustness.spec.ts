import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Malformed input is a client error, never a 500.
 *
 * Found by fuzzing on 2026-11-26: 24 handlers answered a non-UUID [id] with
 * 500 (Postgres rejected it), PATCH with {} hit Drizzle's "No values to set",
 * and GET /api/tasks?topicId=nope failed the same way. Walks the route files,
 * so a new route is covered without being listed here.
 */

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === "route.ts" ? [p] : [];
  });
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

test("no [id] route answers a malformed id with a 5xx", async ({ request }) => {
  test.setTimeout(120_000);
  const failures: string[] = [];
  for (const file of routeFiles("app/api")) {
    if (!file.includes("[id]")) continue;
    const path = "/" + relative("app", file).replace(/\/route\.ts$/, "").replaceAll("[id]", "not-a-uuid");
    const src = readFileSync(file, "utf8");
    for (const method of METHODS) {
      if (!new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(src)) continue;
      const res = await request.fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        data: method === "GET" || method === "DELETE" ? undefined : JSON.stringify({ title: "x" }),
      });
      if (res.status() >= 500) failures.push(`${method} ${path} → ${res.status()}`);
    }
  }
  expect(failures).toEqual([]);
});

test("GET /api/tasks rejects a malformed topicId with 400", async ({ request }) => {
  expect((await request.get("/api/tasks?topicId=nope")).status()).toBe(400);
  expect((await request.get("/api/tasks?topicId=none")).status()).toBe(200);
});
