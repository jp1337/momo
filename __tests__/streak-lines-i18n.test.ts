import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;

function messages(loc: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8"),
  );
}

describe("Streak-Zeilen tragen die Einheit in der Nachricht", () => {
  it("kein hartkodiertes d mehr in den drei Zeilen", () => {
    for (const file of [
      "components/progress/tabs/review-tab.tsx",
      "components/progress/tabs/stats-tab.tsx",
    ]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src, `${file} konkateniert noch ein d an eine Zahl`).not.toMatch(
        /\}d\s/,
      );
    }
  });

  it("die vier neuen Keys stehen in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const m = messages(loc);
      expect(
        m.review.streak_line,
        `review.streak_line fehlt in ${loc}`,
      ).toBeTruthy();
      expect(
        m.stats.current_streak_days,
        `stats.current_streak_days fehlt in ${loc}`,
      ).toBeTruthy();
      expect(
        m.stats.best_streak_days,
        `stats.best_streak_days fehlt in ${loc}`,
      ).toBeTruthy();
      expect(
        m.stats.sparkline_aria,
        `stats.sparkline_aria fehlt in ${loc}`,
      ).toBeTruthy();
      expect(
        m.achievements.level_aria,
        `achievements.level_aria fehlt in ${loc}`,
      ).toBeTruthy();
    }
  });

  it("review.streak_line nimmt beide Werte", () => {
    for (const loc of LOCALES) {
      const msg = messages(loc).review.streak_line as string;
      expect(msg, `${loc} fehlt {current}`).toContain("{current}");
      expect(msg, `${loc} fehlt {max}`).toContain("{max}");
    }
  });

  it("das Sparkline-Label ist nicht mehr englisch hartkodiert", () => {
    const src = readFileSync(
      join(process.cwd(), "components/stats/streak-sparkline.tsx"),
      "utf8",
    );
    expect(src).not.toContain('aria-label="Streak history sparkline"');
  });

  it("level-badge aria-label ist nicht mehr englisch hartkodiert", () => {
    const src = readFileSync(
      join(process.cwd(), "components/layout/level-badge.tsx"),
      "utf8",
    );
    expect(src).not.toContain("aria-label={`Level ${level}: ${title}`}");
  });

  // Beweis, dass die ICU-Nachrichten die übergebenen Zahlen wirklich
  // interpolieren — eine Übersetzung ohne {count}/{current}/{max} wäre sonst
  // stillschweigend kaputt (fehlender Platzhalter rendert einfach nichts).
  it("die drei Streak-Nachrichten interpolieren die übergebene Zahl in jeder Locale", () => {
    for (const loc of LOCALES) {
      const m = messages(loc);

      const tReview = createTranslator({ locale: loc, messages: m, namespace: "review" });
      const reviewLine = tReview("streak_line", { current: 5, max: 12 });
      expect(reviewLine, `${loc} review.streak_line current`).toContain("5");
      expect(reviewLine, `${loc} review.streak_line max`).toContain("12");

      const tStats = createTranslator({ locale: loc, messages: m, namespace: "stats" });
      const currentLine = tStats("current_streak_days", { count: 7 });
      expect(currentLine, `${loc} stats.current_streak_days`).toContain("7");

      const bestLine = tStats("best_streak_days", { count: 21 });
      expect(bestLine, `${loc} stats.best_streak_days`).toContain("21");

      const tAchievements = createTranslator({
        locale: loc,
        messages: m,
        namespace: "achievements",
      });
      const levelAria = tAchievements("level_aria", { level: 4, title: "Meister" });
      expect(levelAria, `${loc} achievements.level_aria level`).toContain("4");
      expect(levelAria, `${loc} achievements.level_aria title`).toContain("Meister");
    }
  });
});
