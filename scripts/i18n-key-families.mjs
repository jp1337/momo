/**
 * Deklarierte Key-Familien.
 *
 * Eine Familie ist eine Menge von Message-Keys, die im Code nicht als Literal
 * auftaucht, sondern per Template-Literal aus einer Aufzaehlung gebildet wird
 * (t(`catalog.${key}.title`)). Der Literal-Scan in check-i18n.mjs kann sie
 * nicht sehen; ohne dieses Register meldet die Gegenrichtung sie als verwaist.
 *
 * Eine Familie ist strenger als ein Literal, nicht laxer: `members()` ist die
 * vollstaendige Sollmenge. Fehlt ein Mitglied in einer Locale, ist das rot —
 * und ein Key unter dem Praefix, den `members()` nicht nennt, ist verwaist.
 *
 * Regeln fuer neue Eintraege:
 *  - `members()` MUSS aus einer codeseitigen Aufzaehlung ableiten, nie aus den
 *    Locale-Dateien. Sonst prueft die Familie sich selbst.
 *  - Eine Familie braucht eine echte Aufrufstelle. Ein Praefix ohne
 *    Template-Literal im Code ist keine Familie, sondern ein Fund.
 *  - `why` nennt die Aufrufstelle, damit die naechste Wartende die Familie
 *    loeschen kann, wenn die Aufrufstelle verschwindet.
 *
 * Die Lesefunktionen arbeiten absichtlich per Regex und nicht per Import:
 * dieses Skript laeuft ohne Build, die Quellen sind TypeScript mit
 * Pfad-Aliassen. Jede nimmt optional den Quelltext entgegen — dafuer gibt es
 * genau einen Grund, und der steht in __tests__/check-i18n.test.ts: nur so
 * laesst sich beweisen, dass die Familie aus dem Code ableitet.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath statt .pathname: letzteres laesst %20 in Pfaden mit Leerzeichen stehen.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/**
 * @param {string} relPath
 * @returns {string}
 */
const read = (relPath) => readFileSync(join(ROOT, relPath), "utf8");

/**
 * Schneidet einen benannten Deklarationsblock aus einer Quelldatei.
 *
 * @param {string} src Quelltext
 * @param {string} startMarker z. B. `export const LEVELS`
 * @param {string} endMarker die naechste Deklaration danach
 * @param {string} family Familienname fuer die Fehlermeldung
 * @returns {string}
 */
function block(src, startMarker, endMarker, family) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(
      `"${startMarker}" nicht gefunden — Familie ${family} anpassen (scripts/i18n-key-families.mjs)`
    );
  }
  return src.slice(start, end);
}

/**
 * Alle doppelt gequoteten Literale eines Abschnitts.
 *
 * @param {string} text
 * @returns {string[]}
 */
const quoted = (text) => [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/**
 * Sichert zu, dass eine Aufzaehlung nicht leer ist.
 *
 * @param {string[]} values
 * @param {string} what
 * @returns {string[]}
 */
function nonEmpty(values, what) {
  if (values.length === 0) throw new Error(`${what} ist leer`);
  return values;
}

/**
 * Sammelt Message-Keys, die im Code als String-Literal in einer Aufzaehlung
 * stehen und von dort per Variable an `t()` gehen — `t(config.key)`,
 * `t(LEVEL_META[level].labelKey)`, `t(dowKeys[i])`. Fuer den Literal-Scan in
 * check-i18n.mjs sind die genauso unsichtbar wie ein Template-Literal; das
 * Register kennt beide Formen, weil beide aus einer Aufzaehlung stammen.
 *
 * Das Feld wird bewusst mitgematcht (`key: "…"`, nicht nur `"…"`): eine
 * praefixweite Suche fienge im selben Datei auch echte `t("theme_aria")`-
 * Literale ein und behauptete, sie kaemen aus der Aufzaehlung.
 *
 * @param {string} src Quelltext
 * @param {RegExp} re globales Muster, Gruppe 1 ist der Key
 * @param {string} what Familienname fuer die Fehlermeldung
 * @returns {string[]}
 */
export function keyLiterals(src, re, what) {
  return nonEmpty([...src.matchAll(re)].map((m) => m[1]), what);
}

// ─── Codeseitige Aufzaehlungen ───────────────────────────────────────────────

/**
 * Liest die `key`-Literale aus ACHIEVEMENT_DEFINITIONS.
 *
 * @param {string} [src] Quelltext von lib/gamification.ts
 * @returns {string[]}
 */
export function achievementKeys(src = read("lib/gamification.ts")) {
  const scope = block(
    src,
    "export const ACHIEVEMENT_DEFINITIONS",
    "export type AchievementDefinition",
    "achievements.catalog"
  );
  const keys = [...scope.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
  return nonEmpty(keys, "ACHIEVEMENT_DEFINITIONS");
}

/**
 * Liest die `level`-Zahlen aus LEVELS.
 *
 * @param {string} [src] Quelltext von lib/gamification.ts
 * @returns {string[]}
 */
export function levelNumbers(src = read("lib/gamification.ts")) {
  const scope = block(
    src,
    "export const LEVELS",
    "export type Level",
    "achievements.levels"
  );
  const nums = [...scope.matchAll(/level:\s*(\d+)/g)].map((m) => m[1]);
  return nonEmpty(nums, "LEVELS");
}

/**
 * Liest die Werte eines `pgEnum` aus dem Drizzle-Schema, kleingeschrieben —
 * die Message-Keys tragen die Kleinschreibung (`priority_high`), der Code den
 * SQL-Wert (`HIGH`), und die Aufrufstellen bruecken das mit `.toLowerCase()`.
 *
 * @param {string} name Exportname, z. B. "priorityEnum"
 * @param {string} [src] Quelltext von lib/db/schema.ts
 * @returns {string[]}
 */
export function enumValues(name, src = read("lib/db/schema.ts")) {
  const match = src.match(
    new RegExp(`export const ${name} = pgEnum\\([^,]+,\\s*\\[([^\\]]*)\\]`)
  );
  if (!match) {
    throw new Error(
      `pgEnum ${name} nicht gefunden — Familie anpassen (scripts/i18n-key-families.mjs)`
    );
  }
  return nonEmpty(
    quoted(match[1]).map((v) => v.toLowerCase()),
    `pgEnum ${name}`
  );
}

/**
 * Liest die Tab-Schluessel aus VALID_TABS.
 *
 * @param {string} [src] Quelltext von components/progress/progress-tabs.tsx
 * @returns {string[]}
 */
export function progressTabs(src = read("components/progress/progress-tabs.tsx")) {
  const match = src.match(/export const VALID_TABS[^=]*=\s*\[([^\]]*)\]/);
  if (!match) throw new Error("VALID_TABS nicht gefunden — Familie progress.tab anpassen");
  return nonEmpty(quoted(match[1]), "VALID_TABS");
}

/**
 * Liest alle i18n-Keys, die TEMPLATES nennt: `titleKey` und `descriptionKey`
 * der Vorlage selbst und jeder ihrer Aufgaben. Sie sind bereits relativ zum
 * `templates`-Namespace notiert ("moving.task_1").
 *
 * @param {string} [src] Quelltext von lib/templates.ts
 * @returns {string[]}
 */
export function templateKeys(src = read("lib/templates.ts")) {
  const scope = block(
    src,
    "export const TEMPLATES",
    "export function getTemplate",
    "templates"
  );
  const keys = [...scope.matchAll(/(?:titleKey|descriptionKey):\s*"([^"]+)"/g)].map(
    (m) => m[1]
  );
  return nonEmpty(keys, "TEMPLATES");
}

/**
 * Liest die Locale-Codes aus LOCALES. Der `language`-Namespace traegt je einen
 * Key pro Code (`language.de`), gelesen als `t(locale)`.
 *
 * @param {string} [src] Quelltext von i18n/locales.ts
 * @returns {string[]}
 */
export function localeCodes(src = read("i18n/locales.ts")) {
  const match = src.match(/export const LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!match) throw new Error("LOCALES nicht gefunden — Familie language anpassen");
  return nonEmpty(quoted(match[1]), "LOCALES");
}

// ─── Register ────────────────────────────────────────────────────────────────

/**
 * @typedef {object} KeyFamily
 * @property {string} namespace next-intl-Namespace, in dem die Familie liegt
 * @property {string} pattern dokumentarisch, z. B. "catalog.<key>.title"
 * @property {() => string[]} members vollstaendige Sollmenge *innerhalb* des Namespace
 * @property {string} why Aufrufstelle(n)
 */

/** @type {KeyFamily[]} */
export const KEY_FAMILIES = [
  {
    namespace: "achievements",
    pattern: "catalog.<key>.title | catalog.<key>.description",
    members: () =>
      achievementKeys().flatMap((k) => [
        `catalog.${k}.title`,
        `catalog.${k}.description`,
      ]),
    why: "components/achievements/achievement-row.tsx, components/animations/achievement-toast.tsx, lib/export.ts, lib/push.ts, app/(app)/admin/page.tsx",
  },
  {
    namespace: "achievements",
    pattern: "levels.<n>",
    members: () => levelNumbers().map((n) => `levels.${n}`),
    why: "components/progress/tabs/achievements-tab.tsx, components/progress/tabs/stats-tab.tsx, app/(app)/layout.tsx",
  },
  {
    namespace: "progress",
    pattern: "tab_<tab>",
    members: () => progressTabs().map((tab) => `tab_${tab}`),
    why: "app/(app)/progress/page.tsx:69",
  },
  {
    namespace: "templates",
    pattern: "<template>.title | <template>.description | <template>.task_<n>",
    members: () => templateKeys(),
    why: "components/topics/template-picker.tsx:133,168 (title/description), lib/templates.ts (importTopicFromTemplate loest jeden titleKey auf)",
  },
  // priority_<p> und energy_<l> tragen dieselbe Aufzaehlung in mehreren
  // Namespaces — je Aufrufstelle ein Eintrag, damit ein geloeschtes Formular
  // seine Keys freigibt statt sie stillschweigend zu decken.
  {
    namespace: "common",
    pattern: "priority_<p>",
    members: () => enumValues("priorityEnum").map((p) => `priority_${p}`),
    why: "components/tasks/bulk-action-bar.tsx:212",
  },
  {
    namespace: "tasks",
    pattern: "priority_<p>",
    members: () => enumValues("priorityEnum").map((p) => `priority_${p}`),
    why: "components/tasks/task-form.tsx:439, components/tasks/task-list.tsx:839",
  },
  {
    namespace: "topics",
    pattern: "priority_<p>",
    members: () => enumValues("priorityEnum").map((p) => `priority_${p}`),
    why: "components/topics/topic-form.tsx:355",
  },
  {
    namespace: "dashboard",
    pattern: "energy_<level>",
    members: () => enumValues("energyLevelEnum").map((l) => `energy_${l}`),
    why: "components/dashboard/energy-checkin-card.tsx:206",
  },
  {
    namespace: "tasks",
    pattern: "energy_<level>",
    members: () => enumValues("energyLevelEnum").map((l) => `energy_${l}`),
    why: "components/tasks/task-form.tsx:734,751",
  },
  {
    namespace: "topics",
    pattern: "energy_<level>",
    members: () => enumValues("energyLevelEnum").map((l) => `energy_${l}`),
    why: "components/topics/topic-form.tsx:403",
  },
  {
    namespace: "tasks",
    pattern: "badge_energy_<level>",
    members: () => enumValues("energyLevelEnum").map((l) => `badge_energy_${l}`),
    why: "components/tasks/task-item.tsx:580",
  },
  {
    namespace: "tasks",
    pattern: "recurrence_type_<type>",
    members: () =>
      enumValues("recurrenceTypeEnum").map((t) => `recurrence_type_${t}`),
    why: "components/tasks/task-form.tsx:526",
  },

  // ── Berechnete Keys ──────────────────────────────────────────────────────
  // Kein Template-Literal, sondern eine Variable: t(config.key),
  // t(LEVEL_META[level].labelKey), t(dowKeys[i]). Fuer den Literal-Scan
  // dasselbe Problem, fuer das Register dieselbe Loesung.
  {
    namespace: "stats",
    pattern: "energy_level_<level>",
    members: () =>
      keyLiterals(
        read("components/stats/energy-week-block.tsx"),
        /labelKey:\s*"(energy_level_\w+)"/g,
        "LEVEL_META"
      ),
    why: "components/stats/energy-week-block.tsx:167,225,242 ueber LEVEL_META (:43)",
  },
  {
    namespace: "nav",
    pattern: "theme_<mode>",
    members: () =>
      keyLiterals(
        read("components/theme-toggle.tsx"),
        /key:\s*"(theme_\w+)"/g,
        "THEME_CONFIG"
      ),
    why: "components/theme-toggle.tsx:51 ueber die Konfigtabelle (:19-21)",
  },
  {
    namespace: "settings",
    pattern: "nav_<page>",
    members: () =>
      keyLiterals(
        read("components/settings/settings-nav.tsx"),
        /key:\s*"(nav_\w+)"/g,
        "NAV_ITEMS"
      ),
    why: "components/settings/settings-nav.tsx ueber NAV_ITEMS (:16-23)",
  },
  {
    namespace: "achievements",
    pattern: "rarity_<rarity>",
    members: () =>
      keyLiterals(
        read("components/animations/achievement-toast.tsx"),
        /labelKey:\s*"(rarity_\w+)"/g,
        "RARITY_CONFIG"
      ),
    why: "components/animations/achievement-toast.tsx ueber RARITY_CONFIG (:45)",
  },
  {
    namespace: "dashboard",
    pattern: "insight_day_<dow>",
    members: () =>
      keyLiterals(
        read("app/(app)/dashboard/page.tsx"),
        /"(insight_day_\w+)"/g,
        "dowKeys"
      ),
    why: "app/(app)/dashboard/page.tsx:248 dowKeys, aufgerufen :254",
  },
  {
    namespace: "dashboard",
    pattern: "meta_day_<dow>",
    members: () =>
      keyLiterals(
        read("app/(app)/dashboard/page.tsx"),
        /"(meta_day_\w+)"/g,
        "weekdayKeys"
      ),
    why: "app/(app)/dashboard/page.tsx:260 weekdayKeys",
  },
  {
    namespace: "dashboard",
    pattern: "greeting_<tageszeit>",
    members: () =>
      keyLiterals(
        read("app/(app)/dashboard/page.tsx"),
        /return "(greeting_\w+)"/g,
        "getGreetingKey"
      ),
    why: "app/(app)/dashboard/page.tsx:240, Schluessel aus getGreetingKey (:47-52)",
  },
  {
    namespace: "tasks",
    pattern: "banner_greeting_<tageszeit>",
    members: () =>
      keyLiterals(
        read("components/tasks/due-today-banner.tsx"),
        /=\s*"(banner_greeting_\w+)"/g,
        "due-today-banner greetingKey"
      ),
    why: "components/tasks/due-today-banner.tsx:28-32",
  },
  {
    namespace: "review",
    pattern: "motivation_<stufe>",
    members: () =>
      keyLiterals(
        read("components/progress/tabs/review-tab.tsx"),
        /"(motivation_\w+)"/g,
        "review-tab motivationKey"
      ),
    why: "components/progress/tabs/review-tab.tsx:69-74",
  },
  {
    namespace: "tasks",
    pattern: "recurrence_weekday_<tag>",
    members: () =>
      keyLiterals(
        read("components/tasks/task-form.tsx"),
        /key:\s*"(recurrence_weekday_\w+)"/g,
        "WEEKDAYS"
      ),
    why: "components/tasks/task-form.tsx:64-72 WEEKDAYS",
  },
  {
    namespace: "language",
    pattern: "<locale>",
    members: () => localeCodes(),
    why: "components/settings/language-switcher.tsx:72 t(locale) ueber LOCALES",
  },
  {
    namespace: "onboarding",
    pattern: "concept_<begriff>_title | concept_<begriff>_desc",
    members: () =>
      keyLiterals(
        read("components/onboarding/steps/welcome-step.tsx"),
        /(?:titleKey|descKey):\s*"(concept_\w+)"/g,
        "welcome-step CONCEPTS"
      ),
    why: "components/onboarding/steps/welcome-step.tsx:30-49",
  },
  {
    namespace: "auth",
    pattern: "error_<grund>",
    members: () =>
      keyLiterals(
        read("app/(auth)/login/page.tsx"),
        /return "(error_\w+)"/g,
        "login errorKey"
      ),
    why: "app/(auth)/login/page.tsx:89-92",
  },
];
