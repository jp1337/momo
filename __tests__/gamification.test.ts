import { describe, it, expect } from "vitest";
import { ACHIEVEMENT_DEFINITIONS, LEVELS } from "@/lib/gamification";
import deMessages from "@/messages/de.json";

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
