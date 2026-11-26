/**
 * The OpenAPI spec (`lib/openapi.ts`) against the routes that actually exist.
 *
 * The spec is ~4000 hand-maintained lines and nothing else reads it at test
 * time, so it drifted twice unnoticed: 25 public operations missing, and two
 * `$ref`s pointing at a component that never existed. This suite fails on:
 *
 * - an operation in the spec that no `app/api/**\/route.ts` exports (ghost),
 * - an exported handler missing from the spec, unless it is listed in
 *   `NOT_PUBLIC_API` with the reason it is not part of the integrator API,
 * - a `$ref` that does not resolve,
 * - an operation tag that the spec's `tags` list does not declare.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it, expect } from "vitest";
import { openApiSpec } from "@/lib/openapi";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

/**
 * Handlers that exist on purpose without a spec entry. Each is reachable only
 * from the browser app or the platform, not with an API key, so documenting it
 * in Swagger would advertise something an integrator cannot use.
 */
const NOT_PUBLIC_API: Record<string, string> = {
  "GET /api/auth/[...nextauth]": "Auth.js internals",
  "POST /api/auth/[...nextauth]": "Auth.js internals",
  "POST /api/auth/2fa/setup": "browser session only: TOTP enrolment ceremony",
  "POST /api/auth/2fa/verify-setup": "browser session only: TOTP enrolment ceremony",
  "POST /api/auth/2fa/verify": "browser session only: login challenge",
  "POST /api/auth/2fa/disable": "browser session only",
  "POST /api/auth/2fa/regenerate-backup-codes": "browser session only",
  "POST /api/auth/passkey/register/options": "browser session only: WebAuthn ceremony",
  "POST /api/auth/passkey/register/verify": "browser session only: WebAuthn ceremony",
  "POST /api/auth/passkey/login/options": "WebAuthn login ceremony, needs a browser authenticator",
  "POST /api/auth/passkey/login/verify": "WebAuthn login ceremony, needs a browser authenticator",
  "POST /api/auth/passkey/second-factor/options": "browser session only: WebAuthn ceremony",
  "POST /api/auth/passkey/second-factor/verify": "browser session only: WebAuthn ceremony",
  "PATCH /api/auth/passkey/{id}": "browser session only",
  "DELETE /api/auth/passkey/{id}": "browser session only",
  "POST /api/auth/link-request": "browser session only: OAuth account linking",
  "GET /api/auth/link-callback": "OAuth account-linking redirect target",
  "POST /api/locale": "browser session only: sets the UI locale cookie",
  "GET /api/alexa/auth": "Alexa account-linking redirect target",
  "POST /api/cron": "platform scheduler, protected by CRON_SECRET",
  "POST /api/admin/seed": "dev/staging demo data",
  "GET /api/openapi.json": "serves this spec",
};

type Spec = {
  tags: { name: string }[];
  paths: Record<string, Record<string, { tags?: string[] }>>;
};
const spec = openApiSpec as Spec;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === "route.ts" ? [p] : [];
  });
}

/** "METHOD /api/path" for every handler exported by a route file. */
function codeOperations(): Set<string> {
  const ops = new Set<string>();
  for (const file of routeFiles(join(process.cwd(), "app/api"))) {
    const path =
      "/" +
      relative(join(process.cwd(), "app"), file)
        .replace(/\/route\.ts$/, "")
        // Next's [id] is OpenAPI's {id}; a catch-all keeps its brackets
        .replace(/\[(?!\.\.\.)([^\]]+)\]/g, "{$1}");
    const src = readFileSync(file, "utf8");
    for (const m of METHODS) {
      const direct = new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`);
      const destructured = new RegExp(`export\\s+const\\s+\\{[^}]*\\b${m}\\b[^}]*\\}`);
      if (direct.test(src) || destructured.test(src)) ops.add(`${m} ${path}`);
    }
  }
  return ops;
}

function specOperations(): Set<string> {
  const ops = new Set<string>();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of Object.keys(item)) {
      const m = method.toUpperCase();
      if ((METHODS as readonly string[]).includes(m)) ops.add(`${m} ${path}`);
    }
  }
  return ops;
}

describe("OpenAPI spec vs. app/api routes", () => {
  const code = codeOperations();
  const documented = specOperations();

  it("finds the route handlers at all", () => {
    // Guards the scanner: a broken regex would make every check below pass vacuously.
    expect(code.size).toBeGreaterThan(80);
    expect(code).toContain("GET /api/health");
    expect(code).toContain("POST /api/auth/[...nextauth]");
  });

  it("documents no operation that does not exist", () => {
    expect([...documented].filter((op) => !code.has(op))).toEqual([]);
  });

  it("documents every public operation", () => {
    const missing = [...code].filter((op) => !documented.has(op) && !(op in NOT_PUBLIC_API));
    expect(missing).toEqual([]);
  });

  it("keeps the not-public list honest", () => {
    // An entry that no longer exists, or that got documented after all, is stale.
    const stale = Object.keys(NOT_PUBLIC_API).filter((op) => !code.has(op) || documented.has(op));
    expect(stale).toEqual([]);
  });

  it("resolves every $ref", () => {
    const refs = [...JSON.stringify(openApiSpec).matchAll(/"\$ref":"#\/([^"]+)"/g)].map((m) => m[1]);
    const dangling = [...new Set(refs)].filter(
      (ref) =>
        ref.split("/").reduce<unknown>(
          (node, key) => (node as Record<string, unknown> | undefined)?.[key],
          openApiSpec
        ) === undefined
    );
    expect(dangling).toEqual([]);
  });

  it("declares every tag an operation uses", () => {
    const declared = new Set(spec.tags.map((t) => t.name));
    const used = Object.values(spec.paths).flatMap((item) =>
      Object.values(item).flatMap((op) => op.tags ?? [])
    );
    expect([...new Set(used)].filter((t) => !declared.has(t))).toEqual([]);
  });
});
