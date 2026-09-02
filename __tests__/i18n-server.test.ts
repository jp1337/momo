/**
 * getServerTranslations — der Rückfallzweig.
 *
 * Das Modul existiert, weil `getTranslations` aus `next-intl/server` nur im
 * Request-Scope läuft (siehe lib/i18n-server.ts und i18n/request.ts:31). Seine
 * eigene Logik ist klein, aber verzweigt: `users.locale` kann `null` sein —
 * jede Nutzerin, die die Sprache nie umgestellt hat — oder einen Wert tragen,
 * den `LOCALES` nicht kennt.
 *
 * Beide Zweige werden von den export- und push-Tests nie getroffen: die setzen
 * eine gültige Locale. Ein leerer String im DSGVO-Export oder in einer
 * Benachrichtigung wäre das Ergebnis, und nichts hätte es gemeldet.
 */

import { describe, it, expect } from "vitest";
import { getServerTranslations } from "@/lib/i18n-server";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import deMessages from "@/messages/de.json";

const FIRST_TASK_DE = deMessages.achievements.catalog.first_task.title;

describe("getServerTranslations", () => {
  it("fällt bei locale null auf DEFAULT_LOCALE zurück, nicht auf leer", async () => {
    const t = await getServerTranslations(null, "achievements");
    expect(t("catalog.first_task.title")).toBe(FIRST_TASK_DE);
  });

  it("fällt bei undefined auf DEFAULT_LOCALE zurück", async () => {
    const t = await getServerTranslations(undefined, "achievements");
    expect(t("catalog.first_task.title")).toBe(FIRST_TASK_DE);
  });

  it("fällt bei einer unbekannten Locale auf DEFAULT_LOCALE zurück", async () => {
    const t = await getServerTranslations("xx-INVALID", "achievements");
    expect(t("catalog.first_task.title")).toBe(FIRST_TASK_DE);
  });

  it("liefert für eine gültige Locale etwas anderes als für die Voreinstellung", async () => {
    const tFr = await getServerTranslations("fr", "achievements");
    const tDe = await getServerTranslations("de", "achievements");
    const fr = tFr("catalog.first_task.title");
    expect(fr).toBeTruthy();
    expect(fr).not.toBe(tDe("catalog.first_task.title"));
  });

  it("lädt alle sieben Locales", async () => {
    for (const locale of LOCALES) {
      const t = await getServerTranslations(locale, "achievements");
      expect(
        t("catalog.first_task.title"),
        `${locale} liefert keinen Titel`
      ).toBeTruthy();
    }
  });

  it("wirft bei einem fehlenden Key nicht, sondern liefert den Keypfad", async () => {
    const t = await getServerTranslations(DEFAULT_LOCALE, "achievements");
    // createTranslator loggt einen IntlError und gibt den Pfad zurück. Das ist
    // der Grund, warum eine veraltete DB-Zeile einen Rohkey rendert statt die
    // Seite zu zerlegen — dokumentiert, nicht zufällig.
    expect(() => t("catalog.gibt_es_nicht.title")).not.toThrow();
    expect(t("catalog.gibt_es_nicht.title")).toContain("gibt_es_nicht");
  });
});
