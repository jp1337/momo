#!/usr/bin/env node
/**
 * Design-Token-Ratsche.
 *
 * Zaehlt pro Datei die Verstoesse gegen das Token-System und vergleicht mit
 * scripts/design-baseline.json. Der Zaehler darf nur sinken. Neue Dateien —
 * und Dateien, die vorher sauber waren und deshalb gar keinen Baseline-
 * Eintrag hatten (scan() laesst Nulltreffer aus) — muessen bei 0 anfangen;
 * ein fehlender Eintrag zaehlt als {color:0, radius:0, inline:0, spacing:0},
 * nie als "ungeprueft". (Task B10, 2026-08-22: bis hierhin stimmte dieser
 * Satz nicht — `--update` liess genau diesen Fall durch, siehe unten.)
 *
 * Vier Kategorien:
 *   color   — Hex, rgb(), hsl(), white/black, Tailwind-Palettenutilities
 *   radius  — rounded-* ausserhalb der vier Token
 *   inline  — style={{ … }}
 *   spacing — p-/m-/gap-/space-Utilities ausserhalb der Achterskala
 *             (4·8·12·16·24·32·48·72). Ergaenzt 2026-08-22: die Skala stand
 *             seit dem 2026-08-21 in der Spec und wurde von nichts erzwungen.
 *
 * Exit 0 → keine Datei ueber Baseline.
 * Exit 1 → mindestens eine Datei ueber Baseline, oder Baseline fehlt.
 *
 * Usage:
 *   node scripts/check-design-tokens.mjs
 *   node scripts/check-design-tokens.mjs --update             # Baseline senken
 *   node scripts/check-design-tokens.mjs --admit <pfad>        # eine bewusst
 *                                                               akzeptierte
 *                                                               neue Ausnahme
 *                                                               (wiederholbar)
 *   node scripts/check-design-tokens.mjs --selftest            # Regexe pruefen
 *
 * Die Ratsche darf nur sinken: --update verweigert jede Erhoehung, auch fuer
 * Dateien ohne vorherigen Eintrag. Eine echte, bewusst akzeptierte Ausnahme
 * (z. B. app/(docs)/api-docs/layout.tsx, siehe dort) braucht `--admit
 * <pfad>` bei genau diesem Aufruf — das macht die Ausnahme zu einer
 * expliziten Handlung, die in der Shell-Historie/CI-Logs sichtbar ist,
 * statt zu einem stillen Nebeneffekt von `--update`. Wird eine Regel selbst
 * erweitert (neues Muster, bisher blinder Fleck), ist das die eine legitime
 * Ursache fuer eine hoehere Zahl QUER durch viele Dateien. Der Weg dafuer ist
 * nicht --update, sondern scripts/design-baseline.json loeschen und --update
 * erneut laufen lassen: mit alter Baseline = {} greift keine
 * Steigerungspruefung, und das Ergebnis ist ein ehrlicher neuer Boden fuer
 * die erweiterten Regeln.
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

// Die Abstandsskala der Spec: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px.
// In Tailwinds Basis-4-Skala sind das genau diese Stufen, plus die drei
// Werte, die keine Groesse sind (0, px, auto).
const SPACING_OK = "0|px|auto|1|2|3|4|6|8|12|18";
// Erlaubt ist zusaetzlich der direkte Token-Zugriff p-[var(--space-4)].
//
// (?![\w./]) statt \b hinter der Werteliste: \b liegt AUCH zwischen "1" und
// dem Punkt in "mt-1.5", die erlaubte "1" haette dort also den haeufigsten
// Verstoss im Repo (6px, 115 Vorkommen) freigegeben. Der Wert muss ganz zu
// Ende sein, nicht nur anfangen.
const SPACING_GUARD = `(?!(?:${SPACING_OK})(?![\\w./])|\\[var\\(--space-)`;
// Der Wert selbst: Bracket-Wert, oder eine Ziffer gefolgt von weiteren
// Wortzeichen/Punkt/Slash, oder die Schluesselwoerter px/auto.
//
// Nicht einfach [\w./]+: bei "gap-x-1" (1 = 4px, erlaubt) verweigert GUARD
// den Treffer an dieser Stelle korrekt, der Regex-Motor backtrackt aber auf
// die optionale "-x"/"-y"-Gruppe von PATTERNS.gap, faellt dabei auf die
// Basisform "gap-" zurueck und [\w./]+ frisst dann das rohe "x" als
// vermeintlichen Wert — ein Phantomtreffer "gap-x" ohne Ziffer, obwohl
// gap-x-1 auf der Skala liegt. Ein Wert faengt in Tailwind immer mit einer
// Ziffer an oder ist genau px/auto; "x"/"y" allein ist kein gueltiger Wert
// und darf hier nicht matchen.
const SPACING_VALUE = "(?:\\[[^\\]]*\\]|\\d[\\w./]*|px|auto)";

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
  spacing: [
    // Lookbehind statt \b: bei "-mx-2.5" steht vor dem Minus ein
    // Leerzeichen, und \b greift dort nicht.
    new RegExp(`(?<![\\w-])-?(?:p|m)[xytrbles]?-${SPACING_GUARD}${SPACING_VALUE}`, "g"),
    new RegExp(`(?<![\\w-])gap(?:-[xy])?-${SPACING_GUARD}${SPACING_VALUE}`, "g"),
    new RegExp(`(?<![\\w-])space-[xy]-${SPACING_GUARD}${SPACING_VALUE}`, "g"),
  ],
};

/** Die Kategorien in einer Liste — sonst vergisst eine Stelle die vierte. */
const CATEGORIES = ["color", "radius", "inline", "spacing"];

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

/** Verstoss-Zaehler fuer das ganze Repo: { "pfad": {color,radius,inline,spacing} }. */
function scan() {
  const result = {};
  for (const dir of SCAN_DIRS) {
    if (!existsSync(dir)) continue;
    for (const file of collect(dir)) {
      const src = readFileSync(file, "utf8");
      const counts = {};
      let any = 0;
      for (const c of CATEGORIES) {
        counts[c] = countCategory(src, c);
        any += counts[c];
      }
      if (any) result[relative(ROOT, file)] = counts;
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
    // war 'bg-s1' — --s1 existiert seit der Flaechen-Revision (2026-08-21)
    // nicht mehr, siehe docs/design-system.md. --raised ist der aktuelle
    // Affordanz-Token, der hier stellvertretend als "kein Verstoss" gilt.
    ['color', 'className="text-ink-2 bg-raised"', 0],
    ['color', 'className="text-white"', 1],
    ['color', 'className="bg-black"', 1],
    ['color', 'color: "white"', 1],
    ['color', 'className="text-ink-2"', 0],
    ['radius', 'className="rounded-xl"', 1],
    ['radius', 'className="rounded-[var(--radius-md)]"', 0],
    ['radius', 'className="rounded-full"', 0],
    ['inline', 'style={{ color: "red" }}', 1],
    ['inline', 'className="x"', 0],
    // Abstandsskala: 4·8·12·16·24·32·48·72 → Tailwind 1,2,3,4,6,8,12,18.
    ['spacing', 'className="p-4 gap-6 m-0 mx-auto px-px"', 0],
    ['spacing', 'className="p-[var(--space-6)] gap-[var(--space-12)]"', 0],
    ['spacing', 'className="mt-1.5"', 1],
    ['spacing', 'className="-mx-2.5"', 1],
    ['spacing', 'className="gap-5"', 1],
    ['spacing', 'className="space-y-16"', 1],
    ['spacing', 'className="pb-[7px]"', 1],
    // Keine Fehlalarme auf Utilities, die nur mit p oder m anfangen.
    ['spacing', 'className="min-w-0 place-items-center pointer-events-none"', 0],
    ['spacing', 'className="flex-1 translate-x-2 max-w-5xl"', 0],
  ];
  let failed = 0;
  for (const [cat, src, want] of cases) {
    const got = countCategory(src, cat);
    if (got !== want) {
      console.error(`selftest FAIL [${cat}] ${JSON.stringify(src)} → ${got}, erwartet ${want}`);
      failed++;
    }
  }

  // Task B10 (2026-08-22): der Ratschen-Check selbst braucht Tests — genau
  // der Teil, der vorher lautlos kaputt war (ein fehlender alter Eintrag
  // liess jede Erhoehung durch, siehe findRaised()-Kommentar).
  const raiseCases = [
    {
      name: "neue Datei ohne alten Eintrag zaehlt als 0, nicht als erlaubt",
      old: {},
      current: { "a.tsx": { color: 1, radius: 0, inline: 0 } },
      admitted: [],
      want: 1,
    },
    {
      name: "vorher saubere Datei (kein Eintrag, da scan() Nulltreffer auslaesst) darf keine Verstoesse gewinnen",
      old: {},
      current: { "b.tsx": { color: 0, radius: 2, inline: 0 } },
      admitted: [],
      want: 1,
    },
    {
      name: "ein echter Rueckgang loest nichts aus",
      old: { "c.tsx": { color: 5, radius: 0, inline: 0 } },
      current: { "c.tsx": { color: 2, radius: 0, inline: 0 } },
      admitted: [],
      want: 0,
    },
    {
      name: "gleichbleibender Zaehler loest nichts aus",
      old: { "c.tsx": { color: 5, radius: 0, inline: 0 } },
      current: { "c.tsx": { color: 5, radius: 0, inline: 0 } },
      admitted: [],
      want: 0,
    },
    {
      name: "--admit gibt genau den genannten Pfad frei, ein zweiter neuer Verstoss bleibt gemeldet",
      old: {},
      current: {
        "d.tsx": { color: 3, radius: 0, inline: 0 },
        "e.tsx": { color: 1, radius: 0, inline: 0 },
      },
      admitted: ["d.tsx"],
      want: 1,
    },
  ];
  for (const c of raiseCases) {
    const got = findRaised(c.old, c.current, new Set(c.admitted));
    if (got.length !== c.want) {
      console.error(
        `selftest FAIL [raise] ${c.name} → ${got.length} Eintraege (${got.join("; ")}), erwartet ${c.want}`,
      );
      failed++;
    }
  }

  // Fixt den Widerspruch aus dem Kopfkommentar: "Datei fehlt komplett" (der
  // dokumentierte Reset-Weg fuer eine erweiterte Regel) darf NICHT wie "Datei
  // vorhanden, Eintrag fehlt" (B10, echte neue/vorher-saubere Datei)
  // behandelt werden — sonst meldet `rm design-baseline.json && --update`
  // jeden bestehenden Verstoss als neu, nicht nur die frisch erfassten.
  const updateRaiseCases = [
    {
      name: "Baseline-Datei fehlt komplett: kein Verstoss gilt als gestiegen",
      baselineExisted: false,
      old: {},
      current: { "f.tsx": { color: 9, radius: 3, inline: 1, spacing: 5 } },
      admitted: [],
      want: 0,
    },
    {
      name: "Baseline-Datei vorhanden, Eintrag fehlt: B10-Haertung bleibt aktiv",
      baselineExisted: true,
      old: {},
      current: { "g.tsx": { color: 1, radius: 0, inline: 0, spacing: 0 } },
      admitted: [],
      want: 1,
    },
  ];
  for (const c of updateRaiseCases) {
    const got = raisedForUpdate(c.baselineExisted, c.old, c.current, new Set(c.admitted));
    if (got.length !== c.want) {
      console.error(
        `selftest FAIL [update-raise] ${c.name} → ${got.length} Eintraege (${got.join("; ")}), erwartet ${c.want}`,
      );
      failed++;
    }
  }

  if (failed) {
    console.error(`\n${failed} Selbsttest(s) fehlgeschlagen.`);
    process.exit(1);
  }
  console.log(
    `Selbsttest: ${cases.length + raiseCases.length + updateRaiseCases.length} Faelle in Ordnung.`,
  );
  process.exit(0);
}

const ZERO_COUNTS = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));

/**
 * Findet Dateien, deren Verstoss-Zahl gegenueber der alten Baseline steigt.
 * Ein fehlender Eintrag in `old` zaehlt als ZERO_COUNTS (alle Kategorien 0) —
 * NIE als "ungeprueft, also erlaubt". Das war der Bug (Task B10,
 * 2026-08-22): eine neue Datei, oder eine vorher saubere ohne Baseline-
 * Eintrag (scan() laesst Nulltreffer aus), lief bisher am Steigerungs-Check
 * vorbei und wurde mit ihrem vollen Verstoss-Stand in die Baseline
 * geschrieben.
 *
 * `admitted` ist die Menge der Pfade, die bei DIESEM Aufruf per --admit
 * bewusst freigegeben wurden — eine Erhoehung dort wird nicht gemeldet.
 * Reine Funktion (kein Datei-I/O), damit selftest() sie ohne echte
 * Baseline-Datei pruefen kann.
 */
function findRaised(old, current, admitted = new Set()) {
  const raised = [];
  for (const [file, counts] of Object.entries(current)) {
    if (admitted.has(file)) continue;
    const prev = old[file] ?? ZERO_COUNTS;
    for (const k of CATEGORIES) {
      if (counts[k] > prev[k]) raised.push(`${file} (${k}: ${prev[k]} → ${counts[k]})`);
    }
  }
  return raised;
}

/**
 * Steigerungspruefung fuer --update: bei fehlender Baseline-DATEI (bewusster
 * Reset, siehe Kopfkommentar) entfaellt sie komplett; bei vorhandener Datei
 * greift findRaised() wie gehabt, inklusive der B10-Haertung pro Datei.
 * Eigene Funktion statt Inline-Ternary im Hauptlauf, damit selftest() genau
 * diese Unterscheidung ohne echtes Dateisystem pruefen kann.
 */
function raisedForUpdate(baselineExisted, old, current, admitted) {
  return baselineExisted ? findRaised(old, current, admitted) : [];
}

/** Sammelt alle `--admit <pfad>`-Argumente (wiederholbar) in ein Set. */
function parseAdmitted(args) {
  const admitted = new Set();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--admit" && args[i + 1]) admitted.add(args[i + 1]);
  }
  return admitted;
}

// ─── Hauptlauf ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes("--selftest")) selftest();

const current = scan();

if (args.includes("--update")) {
  // baselineExisted haelt fest, ob die DATEI vor diesem Lauf da war — nicht
  // bloss, ob `old` ein leeres Objekt ist. Beides sah bisher gleich aus
  // (existsSync(BASELINE) ? ... : {}), und findRaised() behandelt seit Task
  // B10 jeden fehlenden Datei-Eintrag als ZERO_COUNTS. Ohne diese
  // Unterscheidung wuerde `rm scripts/design-baseline.json && --update` —
  // der im Kopfkommentar dokumentierte Weg fuer eine erweiterte Regel — JEDEN
  // bestehenden Verstoss in JEDER Datei als "neu gestiegen" melden, nicht nur
  // die frisch erfassten. Das war nie beabsichtigt: B10 wollte einzelne
  // fehlende Datei-Eintraege in einer bestehenden Baseline haerten (neue oder
  // vorher saubere Dateien), nicht den bewussten, sichtbaren Reset der ganzen
  // Datei verbieten. Bei fehlender Datei entfaellt die Steigerungspruefung
  // komplett — deckungsgleich mit dem Kopfkommentar oben.
  const baselineExisted = existsSync(BASELINE);
  const old = baselineExisted ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
  const admitted = parseAdmitted(args);
  const raised = raisedForUpdate(baselineExisted, old, current, admitted);
  if (raised.length) {
    console.error("Die Baseline ist eine Ratsche — sie darf nicht steigen:\n");
    for (const r of raised) console.error(`  ${r}`);
    console.error(
      "\nEine neue, bewusst akzeptierte Ausnahme braucht --admit <pfad> bei",
    );
    console.error(
      "genau diesem Aufruf — nicht --update allein, das lehnt jede Erhoehung ab,",
    );
    console.error("auch fuer Dateien ohne vorherigen Eintrag.");
    process.exit(1);
  }
  if (admitted.size) {
    console.log("Bewusst akzeptierte neue Ausnahme(n):");
    for (const file of admitted) {
      if (current[file]) console.log(`  ${file}: ${JSON.stringify(current[file])}`);
    }
  }
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
  const total = Object.values(current).reduce(
    (a, c) => a + CATEGORIES.reduce((s, k) => s + (c[k] ?? 0), 0), 0);
  console.log(`Baseline aktualisiert: ${Object.keys(current).length} Dateien, ${total} Verstoesse.`);
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
  const allowed = baseline[file] ?? ZERO_COUNTS;
  for (const k of CATEGORIES) {
    if (counts[k] > allowed[k]) {
      problems.push(`${file} — ${k}: ${counts[k]}, erlaubt ${allowed[k]}`);
    }
  }
}

if (problems.length) {
  console.error("Design-Token-Ratsche verletzt:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nErlaubt sind nur var(--…)-Referenzen, Radien nur ueber");
  console.error("--radius-sm|md|lg|pill.");
  console.error(
    "\nEin echter Rueckgang senkt die Baseline mit: npm run check:design -- --update",
  );
  console.error(
    "Das lehnt eine Erhoehung ab (Task B10, 2026-08-22 — das war vorher der",
  );
  console.error(
    "Weg, einen neuen Verstoss unbemerkt einzuschleusen). Eine bewusst",
  );
  console.error(
    "akzeptierte neue Ausnahme braucht zusaetzlich --admit <pfad>.",
  );
  process.exit(1);
}

const total = Object.values(current).reduce(
  (a, c) => a + CATEGORIES.reduce((s, k) => s + (c[k] ?? 0), 0), 0);
console.log(`Design-Token-Ratsche in Ordnung — ${total} Verstoesse, keiner neu.`);
