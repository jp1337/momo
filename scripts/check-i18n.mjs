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
 * 4. PENDING  verwaist, aber bekannt: die Uebersetzung existiert, die
 *             Verdrahtung fehlt, und der Schnitt, der sie nachholt, steht
 *             daneben. Eigene Kategorie statt stillem Filter — ein Befund,
 *             den niemand mehr sieht, ist kein Befund.
 *
 * Alle vier Kategorien werden immer berichtet, auch mit null Befunden — sonst
 * ist "gruen" nicht von "ungeprueft" zu unterscheiden.
 *
 * Exit 0 → alle drei leer. Exit 1 → mindestens ein Befund.
 *
 * Usage:
 *   node scripts/check-i18n.mjs          # run from repo root
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { KEY_FAMILIES, PENDING_WIRING } from "./i18n-key-families.mjs";

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

// Der Namespace-Ausdruck einer Translator-Fabrik, in allen Formen, die dieses
// Repository benutzt:
//   getTranslations("tasks")                        Literal
//   getTranslations({ locale, namespace: "tasks" }) Objektform (lib/templates.ts)
//   getServerTranslations(locale, "achievements")   eigene Fabrik, NS ist Arg 2
// Groups: [1] NS aus der Literalform, [2] NS aus der Objektform,
//         [3] NS aus getServerTranslations
const NAMESPACE_ARG =
  '(?:(?:use|get)Translations\\s*\\(\\s*(?:["\']([^"\']+)["\']|\\{[^}]*?namespace:\\s*["\']([^"\']+)["\'])' +
  '|getServerTranslations\\s*\\([^,()]+,\\s*["\']([^"\']+)["\'])';

// const t = useTranslations("tasks") — direkte Bindung. Group [1] Variablenname.
const BINDING_RE = new RegExp(
  `const\\s+(\\w+)\\s*=\\s*(?:await\\s+)?${NAMESPACE_ARG}`,
  "g"
);

// Dieselbe Fabrik als *ein Element* einer Liste — fuer die destrukturierte Form.
const NAMESPACE_ARG_RE = new RegExp(NAMESPACE_ARG);

// const [stats, …, t, tAchievements, locale] = await Promise.all([ …
// Group [1] die Namensliste. Der Rest wird geklammert-zaehlend gelesen, weil
// die Elemente selbst Kommas enthalten (`getEnergyHistory(userId, 90)`).
const DESTRUCTURE_RE = /const\s*\[([^\]]*)\]\s*=\s*(?:await\s+)?Promise\.all\s*\(\s*\[/g;

// Matches calls like:  t("some_key")  tSearch("key")  t.rich("key")  t.raw("key")
// We capture [1] variable name, [2] key string literal.
// Only matches when the first argument is a plain string literal (no template).
const CALL_RE = /\b(\w+)(?:\.\w+)?\s*\(\s*["']([^"']+)["']/g;

/**
 * Zerlegt den Inhalt einer Array-Literalliste in ihre Elemente auf oberster
 * Ebene. `open` ist der Index direkt *hinter* der oeffnenden Klammer.
 *
 * ponytail: klammernzaehlend, ohne String-Bewusstsein — eine eckige Klammer
 * *innerhalb* eines Strings im Argument (`getX("a]b")`) verschoebe die
 * Zerlegung. Kommt hier nirgends vor; wenn doch, ist ein echter Parser faellig.
 *
 * @param {string} src
 * @param {number} open
 * @returns {string[] | null} null, wenn die Liste unbalanciert endet
 */
function splitTopLevelList(src, open) {
  const parts = [];
  let depth = 0;
  let start = open;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}") depth--;
    else if (c === "]") {
      if (depth === 0) {
        parts.push(src.slice(start, i));
        return parts;
      }
      depth--;
    } else if (c === "," && depth === 0) {
      parts.push(src.slice(start, i));
      start = i + 1;
    }
  }
  return null;
}

/**
 * Zeichen-Offset ⇒ 0-basierte Zeilennummer.
 *
 * @param {string} src
 * @returns {(idx: number) => number}
 */
function lineIndexer(src) {
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  return (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}

/**
 * Alle Translator-Bindungen einer Datei, mit der Zeile ihrer Deklaration.
 *
 * @param {string} src
 * @param {(idx: number) => number} lineOf
 * @returns {Array<{line: number, varName: string, namespace: string}>}
 */
function collectBindings(src, lineOf) {
  const bindings = [];

  for (const m of src.matchAll(BINDING_RE)) {
    const namespace = m[2] ?? m[3] ?? m[4];
    if (namespace) bindings.push({ line: lineOf(m.index), varName: m[1], namespace });
  }

  for (const m of src.matchAll(DESTRUCTURE_RE)) {
    const names = m[1].split(",").map((n) => n.trim());
    const elements = splitTopLevelList(src, m.index + m[0].length);
    if (!elements) continue;
    const line = lineOf(m.index);
    names.forEach((varName, i) => {
      if (!/^\w+$/.test(varName) || elements[i] === undefined) return;
      const hit = elements[i].match(NAMESPACE_ARG_RE);
      const namespace = hit && (hit[1] ?? hit[2] ?? hit[3]);
      if (namespace) bindings.push({ line, varName, namespace });
    });
  }

  return bindings;
}

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
    const lineOf = lineIndexer(src);

    /** @type {Array<{line: number, varName: string, namespace: string}>} */
    const bindingLines = collectBindings(src, lineOf);
    if (bindingLines.length === 0) continue;

    const boundNames = new Set(bindingLines.map((b) => b.varName));

    // Ueber die ganze Datei, nicht zeilenweise: Prettier bricht lange Aufrufe
    // um, und `t(\n  "topic_completions_30d",\n  { count })` hat den Key auf
    // einer anderen Zeile als das `t(`. Zeilenweise gelesen ist das keine
    // Referenz — und der Key steht danach faelschlich unter ORPHAN.
    for (const match of src.matchAll(CALL_RE)) {
      const varName = match[1];
      const key = match[2];

      if (!boundNames.has(varName)) continue;
      // Skip dynamic-looking keys
      if (/\s|\$\{/.test(key)) continue;

      // Find the most recent binding for this varName at or before this line
      const line = lineOf(match.index);
      let namespace = null;
      for (const b of bindingLines) {
        if (b.varName === varName && b.line <= line) {
          namespace = b.namespace;
        }
      }
      if (!namespace) continue;

      references.push({ file: relative(ROOT, filePath), namespace, key });
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
    if (PENDING_WIRING.has(key)) continue;
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

if (PENDING_WIRING.size > 0) {
  console.log(
    `\nℹ PENDING   ${PENDING_WIRING.size} Key(s) warten auf Verdrahtung — uebersetzt, unbenutzt, faellig:`
  );
  for (const [key, due] of PENDING_WIRING) console.log(`            ${key} → ${due}`);
} else {
  console.log("✓ PENDING   keine — keine Uebersetzung wartet auf ihre Verdrahtung.");
}

process.exit(failed ? 1 : 0);
