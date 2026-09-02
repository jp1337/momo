import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ACHIEVEMENT_DEFINITIONS, LEVELS } from "@/lib/gamification";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;

function messages(loc: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8")
  );
}

/**
 * `__tests__/gamification.test.ts` already covers: the catalog carries no
 * display text, every catalog key and level has a `de` messages entry, and
 * the achievement-toast source no longer reads `achievement.title`. This
 * file adds only what that one doesn't: all seven locales (not just `de`),
 * the reverse direction (no locale ships a key the code doesn't define),
 * and the source check extended to the two components that file doesn't
 * touch. `lib/export.ts` resolves the GDPR export against a real
 * `users.locale` — a missing `fr` entry ships a raw
 * `achievements.catalog.foo.title` key into a French user's export with
 * nothing failing, and `de`-only coverage would never catch that.
 */
describe("Katalogtexte vollstaendig in allen sieben Locales", () => {
  it("jeder Katalog-key hat Titel und Beschreibung in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const catalog = messages(loc).achievements.catalog as Record<
        string,
        { title?: string; description?: string }
      >;
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        expect(
          catalog[def.key]?.title,
          `${loc}: title fehlt fuer ${def.key}`
        ).toBeTruthy();
        expect(
          catalog[def.key]?.description,
          `${loc}: description fehlt fuer ${def.key}`
        ).toBeTruthy();
      }
    }
  });

  it("jedes Level hat einen Namen in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const levels = messages(loc).achievements.levels as Record<
        string,
        string
      >;
      for (const lvl of LEVELS) {
        expect(
          levels[String(lvl.level)],
          `${loc}: level ${lvl.level} fehlt`
        ).toBeTruthy();
      }
    }
  });

  it("kein Locale hat einen Katalog-Eintrag, den der Code nicht kennt", () => {
    const known = new Set<string>(ACHIEVEMENT_DEFINITIONS.map((d) => d.key));
    for (const loc of LOCALES) {
      const extra = Object.keys(messages(loc).achievements.catalog).filter(
        (k) => !known.has(k)
      );
      expect(extra, `${loc} hat Katalog-Keys ohne Definition`).toEqual([]);
    }
  });
});

describe("Renderer lesen Katalogtext nicht mehr aus der Definition", () => {
  // achievement-toast.tsx hat seine eigene Zusicherung dazu in
  // gamification.test.ts — hier nur die beiden Komponenten, die dort nicht
  // vorkommen.
  for (const file of [
    "components/achievements/achievement-row.tsx",
    "components/progress/tabs/achievements-tab.tsx",
  ]) {
    it(`${file} liest kein achievement.title/.description und kein LevelDef.title`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src, `${file} liest achievement.title`).not.toMatch(
        /achievement\.(title|description)/
      );
      expect(src, `${file} liest einen LevelDef-Titel`).not.toMatch(
        /LevelDef\.title/
      );
    });
  }
});
