import { describe, it, expect } from "vitest";
import { ACHIEVEMENT_DEFINITIONS, LEVELS } from "@/lib/gamification";
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

/**
 * `scripts/migrate.mjs` haelt eine zweite, handgepflegte Kopie der
 * Achievement-Keys — es laeuft im Container vor `next start`, als plain Node
 * ESM ohne Build-Schritt, und kann die TypeScript-Quelle nicht importieren.
 *
 * Kein Test beruehrt dieses Skript sonst: `__tests__/helpers/global-setup.ts`
 * ruft drizzles `migrate()` direkt, `helpers/setup.ts` den lib-Seeder. Ein Key,
 * der nur in einer der beiden Listen steht, wuerde also gruen durchgehen — und
 * waere in Produktion ein Achievement, das keine Instanz je verleihen kann.
 *
 * Quelltext per Regex zu lesen ist der Hausbrauch (`api-rate-limits.test.ts`).
 */
describe("Der Seeder in scripts/migrate.mjs kennt dieselben Keys", () => {
  const src = readFileSync(
    join(process.cwd(), "scripts/migrate.mjs"),
    "utf8"
  );
  const block = src.match(
    /const ACHIEVEMENT_DEFINITIONS = \[([\s\S]*?)^\];/m
  );

  it("die Key-Liste ist im Skript ueberhaupt auffindbar", () => {
    expect(block, "ACHIEVEMENT_DEFINITIONS in migrate.mjs nicht gefunden").not.toBeNull();
  });

  it("beide Listen enthalten genau dieselben Keys", () => {
    const scriptKeys = [
      ...(block?.[1] ?? "").matchAll(/key:\s*"([^"]+)"/g),
    ].map((m) => m[1]);
    const libKeys: string[] = ACHIEVEMENT_DEFINITIONS.map((d) => d.key);

    const missingInScript = libKeys.filter((k) => !scriptKeys.includes(k));
    const missingInLib = scriptKeys.filter((k) => !libKeys.includes(k));

    expect(
      missingInScript,
      `fehlt in scripts/migrate.mjs: ${missingInScript.join(", ")}`
    ).toEqual([]);
    expect(
      missingInLib,
      `fehlt in lib/gamification.ts: ${missingInLib.join(", ")}`
    ).toEqual([]);
    expect(scriptKeys).toHaveLength(libKeys.length);
  });

  it("der Seeder schreibt die gedroppten Spalten nicht mehr", () => {
    expect(
      src,
      "migrate.mjs schreibt title/description — Migration 0035 hat die Spalten gedroppt"
    ).not.toMatch(/INSERT INTO achievements[\s\S]*?\btitle\b/);
  });
});
