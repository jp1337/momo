import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;
const NEW_KEYS = ["stats", "weekly_review", "api_keys", "admin", "sign_out"] as const;

function messages(loc: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8")
  );
}

describe("user-menu Labels gehen durch t()", () => {
  it("enthält keinen der sechs deutschen Textknoten mehr", () => {
    const src = readFileSync(
      join(process.cwd(), "components/layout/user-menu.tsx"),
      "utf8"
    );
    for (const literal of [
      "Statistiken",
      "Wochenrückblick",
      "Einstellungen",
      "API Keys",
      "Admin",
      "Abmelden",
    ]) {
      expect(src, `"${literal}" steht noch als Literal in user-menu.tsx`).not.toContain(
        `>${literal}<`
      );
      expect(src).not.toContain(`  ${literal}\n`);
    }
  });

  it("die fünf neuen nav-Keys stehen in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const nav = messages(loc).nav as Record<string, string>;
      for (const key of NEW_KEYS) {
        expect(nav[key], `nav.${key} fehlt in ${loc}`).toBeTruthy();
      }
      expect(nav.settings, `nav.settings fehlt in ${loc}`).toBeTruthy();
    }
  });
});

/**
 * level-badge.tsx rendert die Level-Abkürzung ("Lv." / "Nv." / "Ур.") — bis
 * hierhin hartkodiert, obwohl `achievements.level_label` sie schon in allen
 * sieben Locales trägt und in vier davon vom hartkodierten "Lv." abweicht
 * (Details: task-1-brief.md). Diese Suite belegt die Ratschen-Lücke, die der
 * Spec-Abschnitt "Die Grenze der Ratsche" benennt: der Key ist referenziert
 * (in stats-tab.tsx, unter einem anderen Key mit Platzhalter), nur nicht im
 * Badge — Vorwärts- wie Rückwärtsrichtung der Ratsche schweigen dazu.
 */
describe("level-badge liest die Level-Abkürzung aus achievements.level_label", () => {
  it("kein hartkodiertes 'Lv.' mehr in level-badge.tsx", () => {
    const src = readFileSync(
      join(process.cwd(), "components/layout/level-badge.tsx"),
      "utf8"
    );
    expect(src, "'Lv.' steht noch als Literal in level-badge.tsx").not.toContain(
      ">Lv.<"
    );
  });

  it("achievements.level_label existiert in allen sieben Locales und trägt keinen {level}-Platzhalter", () => {
    for (const loc of LOCALES) {
      const achievements = messages(loc).achievements as Record<
        string,
        unknown
      >;
      const label = achievements.level_label;
      expect(typeof label, `achievements.level_label fehlt in ${loc}`).toBe(
        "string"
      );
      expect(
        label as string,
        `achievements.level_label in ${loc} trägt einen {level}-Platzhalter — das Badge rendert die Zahl in einem eigenen <span>`
      ).not.toContain("{level}");
    }
  });
});
