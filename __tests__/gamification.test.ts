import { describe, it, expect } from "vitest";
import { ACHIEVEMENT_DEFINITIONS, LEVELS } from "@/lib/gamification";
import deMessages from "@/messages/de.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Katalog trägt keinen Anzeigetext mehr", () => {
  it("keine Definition hat title oder description", () => {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(def).not.toHaveProperty("title");
      expect(def).not.toHaveProperty("description");
    }
  });

  it("kein Level hat einen title", () => {
    for (const lvl of LEVELS) {
      expect(lvl).not.toHaveProperty("title");
    }
  });

  it("jeder Katalog-key hat einen Messages-Eintrag", () => {
    const catalog = deMessages.achievements.catalog as Record<
      string,
      { title: string; description: string }
    >;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      expect(catalog[def.key]?.title, `title fehlt für ${def.key}`).toBeTruthy();
      expect(catalog[def.key]?.description, `description fehlt für ${def.key}`).toBeTruthy();
    }
  });

  it("jedes Level hat einen Messages-Eintrag", () => {
    const levels = deMessages.achievements.levels as Record<string, string>;
    for (const lvl of LEVELS) {
      expect(levels[String(lvl.level)], `level ${lvl.level} fehlt`).toBeTruthy();
    }
  });
});

/**
 * Der Achievement-Toast ist der Belohnungsmoment der App und über vier
 * Abschlusspfade erreichbar. Er las `achievement.title` — ein Feld, das
 * `UnlockedAchievement` nicht mehr hat. Weil der Typ auf der Client-Seite
 * handschriftlich nachgebaut war, blieb `tsc` stumm und der Toast leer.
 *
 * Kein DOM-Test möglich (`@testing-library/react` und `jsdom` sind nicht
 * installiert, `vitest.config` sammelt nur `*.test.ts`) — deshalb eine
 * Quelltext-Zusicherung, wie sie das Repo auch sonst benutzt.
 */
describe("Der Achievement-Toast liest seinen Titel aus den Messages", () => {
  const src = readFileSync(
    join(process.cwd(), "components/animations/achievement-toast.tsx"),
    "utf8"
  );

  it("liest kein achievement.title mehr", () => {
    expect(src).not.toMatch(/achievement\.(title|description)/);
  });

  it("übersetzt über den key", () => {
    expect(src).toContain("catalog.${achievement.key}.title");
  });

  it("leitet AchievementItem von UnlockedAchievement ab statt es nachzubauen", () => {
    expect(src).toMatch(
      /export type AchievementItem\s*=\s*UnlockedAchievement/
    );
  });
});
