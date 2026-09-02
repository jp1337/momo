#!/usr/bin/env node
/**
 * i18n completeness audit — beide Richtungen.
 *
 * 1. MISSING  referenziert ⇒ vorhanden. Scannt alle .ts/.tsx nach
 *             useTranslations()/getTranslations()-Bindungen und den
 *             Literal-Keys, die darauf aufgerufen werden.
 * 2. FAMILY   Aufzaehlung ⇒ vorhanden. Keys, die per Template-Literal
 *             gebildet werden (t(`catalog.${key}.title`)), stehen in
 *             scripts/i18n-key-families.mjs mit der codeseitigen Aufzaehlung,
 *             aus der ihre Mitglieder stammen.
 * 3. ORPHAN   vorhanden ⇒ referenziert. Ein Key in messages/*.json, der weder
 *             als Literal referenziert noch Familienmitglied ist.
 *
 * Alle drei Kategorien werden immer berichtet, auch mit null Befunden — sonst
 * ist "gruen" nicht von "ungeprueft" zu unterscheiden.
 *
 * Exit 0 → alle drei leer. Exit 1 → mindestens ein Befund.
 *
 * Usage:
 *   node scripts/check-i18n.mjs          # run from repo root
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { KEY_FAMILIES } from "./i18n-key-families.mjs";

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

// ─── Gegenrichtung: vorhanden ⇒ referenziert ─────────────────────────────────

/** Alle im Code als Literal referenzierten "namespace.key". */
const referenced = new Set(references.map((r) => `${r.namespace}.${r.key}`));

/** Alle von deklarierten Familien erwarteten "namespace.key". */
const familyExpected = new Set();
for (const fam of KEY_FAMILIES) {
  for (const member of fam.members()) {
    familyExpected.add(`${fam.namespace}.${member}`);
  }
}

/**
 * Flacht einen Locale-Baum zu "namespace.pfad.zum.key" auf.
 *
 * @param {Record<string, unknown>} messages
 * @returns {Set<string>}
 */
function flattenKeys(messages) {
  const out = new Set();
  for (const [ns, value] of Object.entries(messages)) {
    if (value == null || typeof value !== "object") continue;
    const walk = (node, prefix) => {
      for (const [k, v] of Object.entries(node)) {
        if (v != null && typeof v === "object") walk(v, `${prefix}${k}.`);
        else out.add(`${prefix}${k}`);
      }
    };
    walk(value, `${ns}.`);
  }
  return out;
}

/** locale → flache Keymenge. Einmal berechnet, nicht je Kandidat. */
const flatByLocale = new Map(
  [...locales].map(([locale, messages]) => [locale, flattenKeys(messages)])
);

/**
 * Familienmitglieder, die in mindestens einer Locale fehlen.
 * @type {Map<string, Set<string>>}
 */
const familyMissing = new Map();
for (const expected of familyExpected) {
  for (const [locale, flat] of flatByLocale) {
    if (flat.has(expected)) continue;
    if (!familyMissing.has(expected)) familyMissing.set(expected, new Set());
    familyMissing.get(expected).add(locale);
  }
}

/**
 * Keys, die in einer Locale stehen, aber weder referenziert noch
 * Familienmitglied sind.
 * @type {Map<string, Set<string>>}
 */
const orphans = new Map();
for (const [locale, flat] of flatByLocale) {
  for (const key of flat) {
    if (referenced.has(key) || familyExpected.has(key)) continue;
    if (!orphans.has(key)) orphans.set(key, new Set());
    orphans.get(key).add(locale);
  }
}

// ─── Bericht ─────────────────────────────────────────────────────────────────

console.log(
  `Familien: ${KEY_FAMILIES.length} deklariert, ${familyExpected.size} erwartete Keys.\n`
);

let failed = false;

if (missing.size > 0) {
  failed = true;
  console.error(`✗ ${missing.size} referenzierte(r) Key fehlt/fehlen:\n`);
  for (const [ref, localeSet] of [...missing.entries()].sort()) {
    console.error(`  MISSING  ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error(`           used in : ${[...(refFiles.get(ref) ?? [])].join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ MISSING   keine — jeder referenzierte Key steht in allen Sprachen.");
}

if (familyMissing.size > 0) {
  failed = true;
  console.error(`✗ ${familyMissing.size} Familienmitglied(er) fehlt/fehlen:\n`);
  for (const [ref, localeSet] of [...familyMissing.entries()].sort()) {
    console.error(`  FAMILY   ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ FAMILY    keine — jede Familie ist in allen Sprachen vollstaendig.");
}

if (orphans.size > 0) {
  failed = true;
  console.error(`✗ ${orphans.size} verwaiste(r) Key:\n`);
  console.error(
    "  Ein verwaister Key ist entweder toter Text ODER eine Uebersetzung, deren\n" +
      "  Verdrahtung fehlt. Vor dem Loeschen pruefen, was von beidem — genau so\n" +
      "  wurde review.push_title gefunden: in sieben Sprachen uebersetzt, von\n" +
      "  keiner Zeile benutzt, waehrend lib/push.ts den deutschen Text hartkodierte.\n"
  );
  for (const [ref, localeSet] of [...orphans.entries()].sort()) {
    console.error(`  ORPHAN   ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ ORPHAN    keine — jeder Key ist referenziert oder Familienmitglied.");
}

process.exit(failed ? 1 : 0);
