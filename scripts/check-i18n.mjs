#!/usr/bin/env node
/**
 * i18n completeness audit.
 *
 * Scans all TypeScript source files for useTranslations() / getTranslations()
 * calls, extracts the (namespace, key) pairs they reference, and verifies that
 * every pair exists in all language files (messages/*.json).
 *
 * Exit code 0 → all keys present in all languages.
 * Exit code 1 → one or more keys are missing.
 *
 * Usage:
 *   node scripts/check-i18n.mjs          # run from repo root
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const MESSAGES_DIR = join(ROOT, "messages");
const SCAN_DIRS = [
  join(ROOT, "app"),
  join(ROOT, "components"),
  join(ROOT, "lib"),
];
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

// ─── Load all language files ──────────────────────────────────────────────────

/** @type {Map<string, Record<string, unknown>>} locale → parsed JSON */
const locales = new Map();

for (const file of readdirSync(MESSAGES_DIR)) {
  if (!file.endsWith(".json")) continue;
  const locale = file.replace(".json", "");
  const content = JSON.parse(readFileSync(join(MESSAGES_DIR, file), "utf8"));
  locales.set(locale, content);
}

if (locales.size === 0) {
  console.error("No language files found in messages/");
  process.exit(1);
}

const localeNames = [...locales.keys()].sort();
console.log(`Loaded locales: ${localeNames.join(", ")}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the key exists in the given locale's message tree.
 * Keys are flat (e.g. "section_today") within a namespace object.
 * Supports dot-notation for nested keys (e.g. "group.key").
 *
 * @param {Record<string, unknown>} messages - full locale JSON
 * @param {string} namespace
 * @param {string} key
 */
function keyExists(messages, namespace, key) {
  const ns = messages[namespace];
  if (ns == null || typeof ns !== "object") return false;
  const parts = key.split(".");
  let node = ns;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return false;
    node = node[part];
  }
  return node !== undefined;
}

/** Walk a directory tree, yielding .ts/.tsx file paths. */
function* walkFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkFiles(full);
    } else if (SOURCE_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      yield full;
    }
  }
}

// ─── Extraction regexes ───────────────────────────────────────────────────────

// Matches:  const t = useTranslations("tasks")
//           const tSearch = useTranslations("search")
//           const t = await getTranslations("tasks")
// Groups:   [1] variable name, [2] namespace
const BINDING_RE =
  /const\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\s*\(\s*["']([^"']+)["']\s*\)/g;

// Matches calls like:  t("some_key")  tSearch("key")  t.rich("key")  t.raw("key")
// We capture [1] variable name, [2] key string literal.
// Only matches when the first argument is a plain string literal (no template).
const CALL_RE = /\b(\w+)(?:\.\w+)?\s*\(\s*["']([^"']+)["']/g;

// ─── Scan source files ────────────────────────────────────────────────────────

/**
 * For each file: use line numbers to pair each call site with the most-recently
 * defined binding for that variable name *before* that line. This handles files
 * that define multiple `const t = getTranslations(...)` in different functions.
 */

/** @type {Array<{file: string, namespace: string, key: string}>} */
const references = [];

for (const scanDir of SCAN_DIRS) {
  for (const filePath of walkFiles(scanDir)) {
    const src = readFileSync(filePath, "utf8");
    const lines = src.split("\n");

    // Collect binding lines: [{line: N, varName: X, namespace: Y}]
    /** @type {Array<{line: number, varName: string, namespace: string}>} */
    const bindingLines = [];
    for (let i = 0; i < lines.length; i++) {
      for (const match of lines[i].matchAll(BINDING_RE)) {
        bindingLines.push({ line: i, varName: match[1], namespace: match[2] });
      }
    }
    if (bindingLines.length === 0) continue;

    // Collect call sites: [{line: N, varName: X, key: Y}]
    for (let i = 0; i < lines.length; i++) {
      for (const match of lines[i].matchAll(CALL_RE)) {
        const varName = match[1];
        const key = match[2];

        // Skip if this var was never used as a translations binding
        if (!bindingLines.some((b) => b.varName === varName)) continue;
        // Skip dynamic-looking keys
        if (/\s|\$\{/.test(key)) continue;

        // Find the most recent binding for this varName at or before this line
        let namespace = null;
        for (const b of bindingLines) {
          if (b.varName === varName && b.line <= i) {
            namespace = b.namespace;
          }
        }
        if (!namespace) continue;

        references.push({ file: relative(ROOT, filePath), namespace, key });
      }
    }
  }
}

console.log(`Found ${references.length} translation key references across source files.\n`);

// ─── Check completeness ───────────────────────────────────────────────────────

/** @type {Map<string, Set<string>>} "namespace.key" → set of locales missing it */
const missing = new Map();

for (const { namespace, key } of references) {
  const ref = `${namespace}.${key}`;
  for (const [locale, messages] of locales) {
    if (!keyExists(messages, namespace, key)) {
      if (!missing.has(ref)) missing.set(ref, new Set());
      missing.get(ref).add(locale);
    }
  }
}

// Build per-ref file list (deduped)
const refFiles = new Map();
for (const { file, namespace, key } of references) {
  const ref = `${namespace}.${key}`;
  if (!refFiles.has(ref)) refFiles.set(ref, new Set());
  refFiles.get(ref).add(file);
}

if (missing.size === 0) {
  console.log("✓ All translation keys are present in every language file.");
  process.exit(0);
}

// ─── Report missing keys ──────────────────────────────────────────────────────

console.error(`✗ ${missing.size} translation key(s) are missing:\n`);

for (const [ref, localeSet] of [...missing.entries()].sort()) {
  const missingLocales = [...localeSet].sort().join(", ");
  const files = [...(refFiles.get(ref) ?? [])].join(", ");
  console.error(`  MISSING  ${ref}`);
  console.error(`           locales : ${missingLocales}`);
  console.error(`           used in : ${files}`);
  console.error("");
}

process.exit(1);
