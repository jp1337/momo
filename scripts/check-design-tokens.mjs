#!/usr/bin/env node
/**
 * Design-Token-Ratsche.
 *
 * Zaehlt pro Datei die Verstoesse gegen das Token-System und vergleicht mit
 * scripts/design-baseline.json. Der Zaehler darf nur sinken. Neue Dateien
 * duerfen keine Verstoesse einbringen.
 *
 * Drei Kategorien:
 *   color  — Hex, rgb(), hsl(), white/black, Tailwind-Palettenutilities
 *   radius — rounded-* ausserhalb der vier Token
 *   inline — style={{ … }}
 *
 * Exit 0 → keine Datei ueber Baseline.
 * Exit 1 → mindestens eine Datei ueber Baseline, oder Baseline fehlt.
 *
 * Usage:
 *   node scripts/check-design-tokens.mjs
 *   node scripts/check-design-tokens.mjs --update     # Baseline senken
 *   node scripts/check-design-tokens.mjs --selftest   # Regexe pruefen
 *
 * Die Ratsche darf nur sinken: --update verweigert jede Erhoehung. Wird eine
 * Regel selbst erweitert (neues Muster, bisher blinder Fleck), ist das die
 * eine legitime Ursache fuer eine hoehere Zahl. Der Weg dafuer ist nicht
 * --update, sondern scripts/design-baseline.json loeschen und --update erneut
 * laufen lassen: mit alter Baseline = {} greift keine Steigerungspruefung,
 * und das Ergebnis ist ein ehrlicher neuer Boden fuer die erweiterten Regeln.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BASELINE = join(ROOT, "scripts", "design-baseline.json");
const SCAN_DIRS = [join(ROOT, "app"), join(ROOT, "components")];
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);

const TAILWIND_PALETTES =
  "red|green|blue|amber|yellow|orange|purple|indigo|violet|slate|gray|grey|" +
  "zinc|neutral|stone|emerald|teal|cyan|sky|rose|pink|fuchsia|lime";

const PATTERNS = {
  color: [
    /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    /\brgba?\(/g,
    /\bhsla?\(/g,
    /["'\s:](?:white|black)["'\s,;}]/g,
    /\b(?:text|bg|border|ring|from|via|to|fill|stroke|decoration|outline|shadow|divide|placeholder|caret|accent)-(?:white|black)\b/g,
    new RegExp(
      `\\b(?:text|bg|border|ring|from|via|to|fill|stroke|decoration|outline|shadow)-(?:${TAILWIND_PALETTES})-\\d{2,3}\\b`,
      "g",
    ),
  ],
  radius: [/\brounded-(?:sm|md|lg|xl|2xl|3xl|t|b|l|r|tl|tr|bl|br)\b/g],
  inline: [/style=\{\{/g],
};

/** Zaehlt Treffer aller Muster einer Kategorie in einem Quelltext. */
function countCategory(source, category) {
  let n = 0;
  for (const re of PATTERNS[category]) {
    re.lastIndex = 0;
    const m = source.match(re);
    if (m) n += m.length;
  }
  return n;
}

/** Alle .tsx-Dateien unter den Scan-Verzeichnissen. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Verstoss-Zaehler fuer das ganze Repo: { "pfad": {color,radius,inline} }. */
function scan() {
  const result = {};
  for (const dir of SCAN_DIRS) {
    if (!existsSync(dir)) continue;
    for (const file of collect(dir)) {
      const src = readFileSync(file, "utf8");
      const counts = {
        color: countCategory(src, "color"),
        radius: countCategory(src, "radius"),
        inline: countCategory(src, "inline"),
      };
      if (counts.color || counts.radius || counts.inline) {
        result[relative(ROOT, file)] = counts;
      }
    }
  }
  return result;
}

function selftest() {
  const cases = [
    ['color', 'color: "#1a1a0a"', 1],
    ['color', 'background: "rgba(0,0,0,.5)"', 1],
    ['color', 'className="text-red-500"', 1],
    ['color', 'color: "var(--ink)"', 0],
    ['color', 'className="text-ink-2 bg-s1"', 0],
    ['color', 'className="text-white"', 1],
    ['color', 'className="bg-black"', 1],
    ['color', 'color: "white"', 1],
    ['color', 'className="text-ink-2"', 0],
    ['radius', 'className="rounded-xl"', 1],
    ['radius', 'className="rounded-[var(--radius-md)]"', 0],
    ['radius', 'className="rounded-full"', 0],
    ['inline', 'style={{ color: "red" }}', 1],
    ['inline', 'className="x"', 0],
  ];
  let failed = 0;
  for (const [cat, src, want] of cases) {
    const got = countCategory(src, cat);
    if (got !== want) {
      console.error(`selftest FAIL [${cat}] ${JSON.stringify(src)} → ${got}, erwartet ${want}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`\n${failed} Selbsttest(s) fehlgeschlagen.`);
    process.exit(1);
  }
  console.log(`Selbsttest: ${cases.length} Faelle in Ordnung.`);
  process.exit(0);
}

// ─── Hauptlauf ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes("--selftest")) selftest();

const current = scan();

if (args.includes("--update")) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
  const merged = {};
  let raised = [];
  for (const [file, counts] of Object.entries(current)) {
    const prev = old[file];
    if (prev) {
      for (const k of ["color", "radius", "inline"]) {
        if (counts[k] > prev[k]) raised.push(`${file} (${k}: ${prev[k]} → ${counts[k]})`);
      }
    }
    merged[file] = counts;
  }
  if (raised.length) {
    console.error("Die Baseline ist eine Ratsche — sie darf nicht steigen:\n");
    for (const r of raised) console.error(`  ${r}`);
    process.exit(1);
  }
  writeFileSync(BASELINE, JSON.stringify(merged, null, 2) + "\n");
  const total = Object.values(merged).reduce(
    (a, c) => a + c.color + c.radius + c.inline, 0);
  console.log(`Baseline aktualisiert: ${Object.keys(merged).length} Dateien, ${total} Verstoesse.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("scripts/design-baseline.json fehlt. Einmalig anlegen mit:");
  console.error("  npm run check:design -- --update");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const problems = [];

for (const [file, counts] of Object.entries(current)) {
  const allowed = baseline[file] ?? { color: 0, radius: 0, inline: 0 };
  for (const k of ["color", "radius", "inline"]) {
    if (counts[k] > allowed[k]) {
      problems.push(`${file} — ${k}: ${counts[k]}, erlaubt ${allowed[k]}`);
    }
  }
}

if (problems.length) {
  console.error("Design-Token-Ratsche verletzt:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nErlaubt sind nur var(--…)-Referenzen, Radien nur ueber");
  console.error("--radius-sm|md|lg|pill. Sinkt der Zaehler, Baseline senken mit:");
  console.error("  npm run check:design -- --update");
  process.exit(1);
}

const total = Object.values(current).reduce(
  (a, c) => a + c.color + c.radius + c.inline, 0);
console.log(`Design-Token-Ratsche in Ordnung — ${total} Verstoesse, keiner neu.`);
