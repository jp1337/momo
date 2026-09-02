import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  KEY_FAMILIES,
  achievementKeys,
  enumValues,
  keyLiterals,
  levelNumbers,
  localeCodes,
  progressTabs,
  templateKeys,
} from "../scripts/i18n-key-families.mjs";

/**
 * `scripts/check-i18n.mjs` prueft seit der Ratsche beide Richtungen. Diese
 * Datei sichert die zwei Eigenschaften, die still kaputtgehen koennen:
 *
 *  1. Der Bericht nennt alle drei Kategorien auf jedem Lauf. Faellt eine weg,
 *     ist "gruen" nicht mehr von "ungeprueft" zu unterscheiden.
 *  2. Die Familien leiten aus dem Code ab, nicht aus messages/*.json. Eine
 *     Familie, die die Locale-Dateien liest, prueft sich selbst und deckt
 *     genau die verwaisten Keys, die sie finden soll.
 *
 * Der Exit-Code wird bewusst NICHT auf 0 festgenagelt: das Skript ist gerade
 * rot mit verwaisten Keys, und das ist der Befund, nicht der Fehler.
 */

function runChecker(): { code: number; out: string } {
  try {
    const out = execFileSync("node", ["scripts/check-i18n.mjs"], {
      encoding: "utf8",
      cwd: process.cwd(),
      maxBuffer: 32 * 1024 * 1024,
      // stderr abfangen statt durchreichen: das Skript ist rot und wuerde sonst
      // 236 ORPHAN-Bloecke in die Ausgabe jedes `npm test` schuetten.
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

const report = runChecker();

describe("check-i18n berichtet beide Richtungen", () => {
  it.each(["MISSING", "FAMILY", "ORPHAN"])(
    "nennt die Kategorie %s auf jedem Lauf",
    (category) => {
      expect(report.out).toContain(category);
    }
  );

  it("nennt die Zahl der deklarierten Familien", () => {
    expect(report.out).toMatch(
      new RegExp(`Familien: ${KEY_FAMILIES.length} deklariert`)
    );
  });

  it("endet mit 0 oder 1, nie mit einem Absturz", () => {
    expect([0, 1], report.out.slice(0, 2000)).toContain(report.code);
  });
});

/**
 * Zwei Fundklassen aus Runde 1, die beide *falsche Anklagen* erzeugten: Keys,
 * die eine laufende Seite liest, standen unter ORPHAN. In der MISSING-Richtung
 * war dieselbe Luecke nur still; in der Gegenrichtung haette der naechste
 * Schritt die Uebersetzungen geloescht. Je ein Wachtposten.
 */
// Die Objektform `getTranslations({ locale, namespace })` und die eigene Fabrik
// `getServerTranslations(locale, ns)` erkennt der Scanner ebenfalls — dafuer
// gibt es hier bewusst KEINEN Wachtposten: beide binden im ganzen Repository
// derzeit nur Template-Literale, die schon eine Familie deckt. Es gibt also
// keinen Key, an dem sich die Erkennung beobachten liesse. Sie steht trotzdem
// drin, damit der erste literale t("…")-Aufruf in lib/templates.ts nicht
// stillschweigend als verwaist gemeldet wird.
describe("der Scanner sieht auch die unbequemen Bindungsformen", () => {
  const orphans = new Set(
    [...report.out.matchAll(/^ {2}ORPHAN {3}(\S+)$/gm)].map((m) => m[1])
  );

  it.each([
    // const [stats, …, t, tAchievements, locale] = await Promise.all([…])
    // — stats-tab.tsx band frueher gar nichts, die Datei fiel komplett aus.
    "stats.priority_high",
    // t(\n  "topic_completions_30d",\n  { count }) — der Key stand auf einer
    // anderen Zeile als das t(, der zeilenweise Scan sah ihn nicht.
    "stats.topic_completions_30d",
  ])("%s ist referenziert, nicht verwaist", (ref) => {
    expect(orphans.has(ref), `${ref} steht unter ORPHAN`).toBe(false);
  });
});

describe("die Familien leiten aus dem Code ab, nicht aus den Locales", () => {
  it.each(KEY_FAMILIES.map((f) => [`${f.namespace} / ${f.pattern}`, f] as const))(
    "%s hat Mitglieder",
    (_label, fam) => {
      expect(fam.members().length).toBeGreaterThan(0);
    }
  );

  it("keine Familie liest messages/", () => {
    const src = readFileSync(
      join(process.cwd(), "scripts/i18n-key-families.mjs"),
      "utf8"
    );
    expect(src).not.toMatch(/messages/);
  });

  // Der eigentliche Beweis: verschwindet eine Definition aus der codeseitigen
  // Aufzaehlung, aendert sich die Sollmenge der Familie. Eine Familie, die aus
  // den Locale-Dateien laese, wuerde hier unveraendert bleiben.
  it("ACHIEVEMENT_DEFINITIONS ohne first_task ⇒ Familie erwartet first_task nicht mehr", () => {
    const src = readFileSync(join(process.cwd(), "lib/gamification.ts"), "utf8");
    const without = src.replace(/\{\s*key:\s*"first_task",[\s\S]*?\n {2}\},\n/, "");
    expect(without.length, "Ersetzung hat nichts entfernt").toBeLessThan(src.length);
    expect(achievementKeys(src)).toContain("first_task");
    expect(achievementKeys(without)).not.toContain("first_task");
    expect(achievementKeys(without).length).toBe(achievementKeys(src).length - 1);
  });

  it("LEVELS ohne Level 10 ⇒ Familie erwartet levels.10 nicht mehr", () => {
    const src = readFileSync(join(process.cwd(), "lib/gamification.ts"), "utf8");
    const without = src.replace('  { level: 10, minCoins: 3000 },\n', "");
    expect(levelNumbers(src)).toContain("10");
    expect(levelNumbers(without)).not.toContain("10");
  });

  it("pgEnum ohne SOMEDAY ⇒ Familie erwartet priority_someday nicht mehr", () => {
    const src = readFileSync(join(process.cwd(), "lib/db/schema.ts"), "utf8");
    const without = src.replace(
      'pgEnum("priority", ["HIGH", "NORMAL", "SOMEDAY"])',
      'pgEnum("priority", ["HIGH", "NORMAL"])'
    );
    expect(enumValues("priorityEnum", src)).toContain("someday");
    expect(enumValues("priorityEnum", without)).not.toContain("someday");
  });

  it("VALID_TABS ohne habits ⇒ Familie erwartet tab_habits nicht mehr", () => {
    const src = readFileSync(
      join(process.cwd(), "components/progress/progress-tabs.tsx"),
      "utf8"
    );
    const without = src.replace('"habits", ', "");
    expect(progressTabs(src)).toContain("habits");
    expect(progressTabs(without)).not.toContain("habits");
  });

  it("TEMPLATES ohne moving.task_1 ⇒ Familie erwartet den Key nicht mehr", () => {
    const src = readFileSync(join(process.cwd(), "lib/templates.ts"), "utf8");
    const without = src.replace(/\{ titleKey: "moving\.task_1"[^}]*\},\n/, "");
    expect(templateKeys(src)).toContain("moving.task_1");
    expect(templateKeys(without)).not.toContain("moving.task_1");
  });

  it("LOCALES ohne zh ⇒ Familie erwartet language.zh nicht mehr", () => {
    const src = readFileSync(join(process.cwd(), "i18n/locales.ts"), "utf8");
    const without = src.replace(', "zh"', "");
    expect(localeCodes(src)).toContain("zh");
    expect(localeCodes(without)).not.toContain("zh");
  });

  it("berechnete Keys: THEME_CONFIG ohne theme_system ⇒ Familie schrumpft", () => {
    const re = () => /key:\s*"(theme_\w+)"/g;
    const src = readFileSync(join(process.cwd(), "components/theme-toggle.tsx"), "utf8");
    const without = src.replace('key: "theme_system"', 'key: "theme_dark"');
    expect(keyLiterals(src, re(), "THEME_CONFIG")).toContain("theme_system");
    expect(keyLiterals(without, re(), "THEME_CONFIG")).not.toContain("theme_system");
  });

  it("eine fehlende Aufzaehlung wirft, statt still leer zu liefern", () => {
    expect(() => achievementKeys("// nichts hier")).toThrow(
      /ACHIEVEMENT_DEFINITIONS/
    );
    expect(() => enumValues("priorityEnum", "// nichts hier")).toThrow(/pgEnum/);
    expect(() => localeCodes("// nichts hier")).toThrow(/LOCALES/);
    expect(() => keyLiterals("// nichts hier", /"(x_\w+)"/g, "leer")).toThrow(/leer/);
  });
});
