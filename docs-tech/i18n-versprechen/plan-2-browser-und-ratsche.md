# Schnitt 2: Der Rest des Browsers und die Ratsche — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die verbleibenden hartkodierten Strings im Browser gehen durch `t()`, und `scripts/check-i18n.mjs` prüft beide Richtungen — inklusive der dynamischen Keys, die Schnitt 1 erzeugt.

**Architecture:** Vier neue `nav`-Keys plus drei ICU-Nachrichten für die Streak-Zeilen. Die Ratsche bekommt zwei Erweiterungen: *vorhanden ⇒ referenziert* und ein Register deklarierter Key-Familien, deren Mitglieder aus einer codeseitigen Aufzählung stammen.

**Tech Stack:** TypeScript strict, next-intl 4.13.7, Node (ESM-Skript), vitest

**Spec:** `docs-tech/i18n-versprechen/design.md`

## Global Constraints

- Sieben Locales, keine Ausnahme: `de`, `en`, `es`, `fr`, `nl`, `ru`, `zh`.
- Kein `any`. Strict mode ist an.
- **Keine Löschung verwaister Keys auf Verdacht.** Die Familien-Mechanik entscheidet, was verwaist ist. Ein Key, der nur über ein Template-Literal referenziert wird, ist nicht verwaist — er gehört in eine Familie.
- `scripts/check-i18n.mjs` bleibt ein reines Node-ESM-Skript ohne Abhängigkeiten. Es läuft in `npm run check:i18n` und muß ohne Build funktionieren.
- Übersetzungstonfall: Wirkung vor Wortlaut bei Labels, wörtlich bei Bedingungen.
- Commit-Format: `<type>(<scope>): <beschreibung>`, Scopes hier: `i18n`, `ui`, `config`.
- `main` ist branch-protected. Ein PR.
- Testlauf ist `npm test` (vitest).

---

### Task 1: Die vier `nav`-Keys und die sechs Labels

**Files:**
- Modify: `messages/de.json`, `en.json`, `es.json`, `fr.json`, `nl.json`, `ru.json`, `zh.json` (Namespace `nav`)
- Modify: `components/layout/user-menu.tsx:151`, `:154`, `:157`, `:159`, `:170`, `:192`
- Modify: `components/layout/level-badge.tsx:80` — **nachgetragen 2026-09-02**, siehe unten

**Interfaces:**
- Produces: `nav.stats`, `nav.weekly_review`, `nav.api_keys`, `nav.admin`, `nav.sign_out`. `nav.settings` existiert bereits und wird nur benutzt.

Sechs nackte Textknoten, nicht fünf. Die Roadmap zählt `Statistiken`, `Wochenrückblick`, `Einstellungen`, `Admin`, `Abmelden` — `API Keys` in Zeile 158-160 ist derselbe Fall und fehlt dort. Es bleibt in den meisten Sprachen „API Keys", muß aber durch `t()`, damit `ru` und `zh` es lokalisieren können.

`nav.settings` = „Einstellungen" existiert schon. Fünf neue Keys, nicht sechs.

### Ein siebter Fall, gefunden beim Blick auf Schnitt 1

`components/layout/level-badge.tsx:80` rendert `<span>Lv.</span>` als nackten
Textknoten — während `achievements.level_label` in allen sieben Locales
existiert und in **vier von sieben** vom hartkodierten `Lv.` abweicht:

| Locale | `achievements.level_label` |
| --- | --- |
| de, en, zh | `Lv.` — stimmt zufällig |
| es, fr, nl | `Nv.` |
| ru | `Ур.` |

`components/progress/tabs/stats-tab.tsx:184` benutzt den Key bereits.

Eine französische Nutzerin liest also auf `/progress` `Nv.` und im
Navbar-Badge daneben `Lv.` — auf jeder Seite der App; im Russischen `Ур.`
gegen `Lv.`. Betroffen sind vier Locales, nicht eine.

**Dieser Fall belegt die Grenze der Ratsche aus der Spec.** Die Gegenrichtung
findet ihn *nicht*: der Key **ist** referenziert, nur nicht überall. `ORPHAN`
schweigt, `MISSING` schweigt, `FAMILY` schweigt. Gefunden hat ihn ein Blick auf
eine Komponente, nicht ein Test — genau die offene Flanke, die der
Spec-Abschnitt „Die Grenze der Ratsche“ benennt.

Fix: `useTranslations("achievements")` in `level-badge.tsx`, dann
`t("level_label")`. `stats-tab.tsx:184` ruft den Key mit einem
`{level}`-Platzhalter; das Badge rendert die Zahl separat — prüfen, welche
Form der Key tatsächlich trägt, bevor beide Aufrufstellen ihn teilen.

Warum `nav` und nicht `stats.page_title`: die Komponente bindet `useTranslations("nav")`. Ein zweiter Hook für ein Label wäre Aufwand ohne Gewinn, und `nav.settings` dupliziert `settings.page_title` heute bereits — nav-eigene Labels sind der Hausbrauch.

- [ ] **Step 1: Failing test schreiben**

`__tests__/user-menu-i18n.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;
const NEW_KEYS = ["stats", "weekly_review", "api_keys", "admin", "sign_out"] as const;

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
      const nav = JSON.parse(
        readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8")
      ).nav as Record<string, string>;
      for (const key of NEW_KEYS) {
        expect(nav[key], `nav.${key} fehlt in ${loc}`).toBeTruthy();
      }
      expect(nav.settings, `nav.settings fehlt in ${loc}`).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/user-menu-i18n.test.ts`
Expected: FAIL — beide Fälle. Der erste findet `>Statistiken<` nicht, wohl aber die eingerückte Variante; der zweite meldet `nav.stats fehlt in de`.

- [ ] **Step 3: Die fünf Keys in allen sieben Locales anlegen**

Unter `"nav"` ergänzen:

| Key | de | en | es | fr | nl | ru | zh |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stats` | Statistiken | Statistics | Estadísticas | Statistiques | Statistieken | Статистика | 统计 |
| `weekly_review` | Wochenrückblick | Weekly Review | Resumen semanal | Bilan de la semaine | Weekoverzicht | Итоги недели | 周回顾 |
| `api_keys` | API Keys | API Keys | Claves API | Clés API | API-sleutels | API-ключи | API 密钥 |
| `admin` | Admin | Admin | Administración | Admin | Beheer | Админ | 管理 |
| `sign_out` | Abmelden | Sign out | Cerrar sesión | Se déconnecter | Afmelden | Выйти | 退出登录 |

- [ ] **Step 4: `user-menu.tsx` umstellen**

`t` ist in Zeile 81 bereits gebunden (`useTranslations("nav")`). Sechs Textknoten ersetzen:

```tsx
<MenuLinkItem href="/progress?tab=stats" icon={faChartBar}>
  {t("stats")}
</MenuLinkItem>
<MenuLinkItem href="/progress?tab=review" icon={faCalendarWeek}>
  {t("weekly_review")}
</MenuLinkItem>
<MenuLinkItem href="/settings" icon={faGear}>
  {t("settings")}
</MenuLinkItem>
<MenuLinkItem href="/api-keys" icon={faKey}>
  {t("api_keys")}
</MenuLinkItem>
```

Im `isAdmin`-Block:

```tsx
  {t("admin")}
</MenuLinkItem>
```

Im Sign-out-`DropdownMenu.Item`, nach dem `FontAwesomeIcon`:

```tsx
  {t("sign_out")}
</DropdownMenu.Item>
```

- [ ] **Step 5: Test laufen lassen**

Run: `npx vitest run __tests__/user-menu-i18n.test.ts && npx tsc --noEmit`
Expected: beides grün

- [ ] **Step 6: Commit**

```bash
git add messages/ components/layout/user-menu.tsx __tests__/user-menu-i18n.test.ts
git commit -m "fix(ui): sechs Labels im Nutzermenue gehen durch t()"
```

---

### Task 2: Die drei Streak-Zeilen und das Sparkline-Label

**Files:**
- Modify: `components/progress/tabs/review-tab.tsx:106-108`
- Modify: `components/progress/tabs/stats-tab.tsx:128-136`
- Modify: `components/stats/streak-sparkline.tsx:60`
- Modify: alle sieben `messages/*.json` (Namespaces `review`, `stats`)

**Interfaces:**
- Produces: `review.streak_line`, `stats.current_streak_days`, `stats.best_streak_days`, `stats.sparkline_aria`

Das `d` ist heute per JS-Konkatenation angehängt: `{stats.streakCurrent}d {t("current_streak")}`. Chinesisch rendert dadurch „3d 连击". Die Reihenfolge von Zahl, Einheit und Label ist sprachabhängig — das gehört in **eine** ICU-Nachricht pro Zeile, nicht in einen separaten Einheiten-Key.

Drei Zeilen, drei Nachrichten. `review-tab` hat zwei Werte in einer Zeile und wird eine Nachricht.

Die vorhandenen Label-Keys `review.streak`, `review.streak_max`, `stats.current_streak`, `stats.best_streak` verlieren damit ihre Referenz. Sie werden **nicht gelöscht** — Task 4 entscheidet über sie, mit der Ratsche als Instanz und nicht auf Verdacht.

- [ ] **Step 1: Failing test schreiben**

`__tests__/streak-lines-i18n.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;

function messages(loc: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8")
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
        /\}d\s/
      );
    }
  });

  it("die vier neuen Keys stehen in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const m = messages(loc);
      expect(m.review.streak_line, `review.streak_line fehlt in ${loc}`).toBeTruthy();
      expect(m.stats.current_streak_days, `stats.current_streak_days fehlt in ${loc}`).toBeTruthy();
      expect(m.stats.best_streak_days, `stats.best_streak_days fehlt in ${loc}`).toBeTruthy();
      expect(m.stats.sparkline_aria, `stats.sparkline_aria fehlt in ${loc}`).toBeTruthy();
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
      "utf8"
    );
    expect(src).not.toContain('aria-label="Streak history sparkline"');
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/streak-lines-i18n.test.ts`
Expected: FAIL in allen vier Fällen

- [ ] **Step 3: Die vier Keys anlegen**

`review.streak_line`:

| Locale | Wert |
| --- | --- |
| de | `{current} Tage Streak · Bester {max}` |
| en | `{current}-day streak · best {max}` |
| es | `Racha de {current} días · mejor {max}` |
| fr | `Série de {current} jours · record {max}` |
| nl | `Reeks van {current} dagen · beste {max}` |
| ru | `Серия {current} дн. · лучшая {max}` |
| zh | `连击 {current} 天 · 最佳 {max} 天` |

`stats.current_streak_days`:

| Locale | Wert |
| --- | --- |
| de | `{count} Tage Streak` |
| en | `{count}-day streak` |
| es | `Racha de {count} días` |
| fr | `Série de {count} jours` |
| nl | `Reeks van {count} dagen` |
| ru | `Серия {count} дн.` |
| zh | `连击 {count} 天` |

`stats.best_streak_days`:

| Locale | Wert |
| --- | --- |
| de | `Bester Streak: {count} Tage` |
| en | `Best streak: {count} days` |
| es | `Mejor racha: {count} días` |
| fr | `Meilleure série : {count} jours` |
| nl | `Beste reeks: {count} dagen` |
| ru | `Лучшая серия: {count} дн.` |
| zh | `最佳连击 {count} 天` |

`stats.sparkline_aria`:

| Locale | Wert |
| --- | --- |
| de | `Streak-Verlauf` |
| en | `Streak history` |
| es | `Historial de racha` |
| fr | `Historique de la série` |
| nl | `Reeksgeschiedenis` |
| ru | `История серии` |
| zh | `连击历史` |

- [ ] **Step 4: `review-tab.tsx` umstellen**

Zeilen 106-108 werden eine Nachricht:

```tsx
{showStreak && (
  <p className={RAIL_LINE}>
    {t("streak_line", {
      current: review.streakCurrent,
      max: review.streakMax,
    })}
  </p>
)}
```

- [ ] **Step 5: `stats-tab.tsx` umstellen**

Zeilen 128-136:

```tsx
{stats.streakCurrent > 0 && (
  <p className={RAIL_LINE}>
    {t("current_streak_days", { count: stats.streakCurrent })}
  </p>
)}
{stats.streakMax > 0 && (
  <p className={RAIL_LINE}>
    {t("best_streak_days", { count: stats.streakMax })}
  </p>
)}
```

- [ ] **Step 6: `streak-sparkline.tsx` umstellen**

Zeile 60. Bindet die Komponente noch kein `t`, oben ergänzen:

```tsx
const t = useTranslations("stats");
```

mit `import { useTranslations } from "next-intl";`, dann:

```tsx
aria-label={t("sparkline_aria")}
```

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run __tests__/streak-lines-i18n.test.ts && npx tsc --noEmit && npm run lint`
Expected: alle drei grün

- [ ] **Step 8: In Chrome ansehen**

`npm run dev`, `/progress?tab=stats` und `?tab=review` je mit `locale`-Cookie `de` und `zh`. Die Randzeilen sind schmal — erwartet: kein Umbruch mitten in einer Zahl, kein abgeschnittenes Label. Chinesisch ist kürzer als Deutsch, Russisch länger; Russisch ist der Härtefall.

- [ ] **Step 9: Commit**

```bash
git add messages/ components/progress/tabs/review-tab.tsx components/progress/tabs/stats-tab.tsx components/stats/streak-sparkline.tsx __tests__/streak-lines-i18n.test.ts
git commit -m "fix(ui): Streak-Zeilen und Sparkline-Label tragen die Einheit in der Nachricht"
```

---

### Task 3: Die Ratsche — Gegenrichtung und Key-Familien

**Files:**
- Modify: `scripts/check-i18n.mjs` (Zeilen 1-17 JSDoc, 19-27 Konstanten, 155-200 Report)
- Create: `scripts/i18n-key-families.mjs`

**Interfaces:**
- Produces: `scripts/i18n-key-families.mjs` exportiert
  `export const KEY_FAMILIES` — ein Array von
  `{ namespace: string, pattern: string, members: () => string[], why: string }`.
  `pattern` ist dokumentarisch (z. B. `"catalog.<key>.title"`); `members()` liefert die vollständige Liste der erwarteten Keys **innerhalb** des Namespace.

Das Skript prüft heute eine Richtung. Es bekommt zwei Erweiterungen. Beide zusammen, nicht nacheinander: die Gegenrichtung allein würde die 41 Keys aus Schnitt 1 als verwaist melden, weil sie nur über Template-Literale referenziert werden — und wäre damit sofort rot ohne einen echten Befund.

- [ ] **Step 1: Das Familienregister anlegen**

`scripts/i18n-key-families.mjs`:

```js
/**
 * Deklarierte Key-Familien.
 *
 * Eine Familie ist eine Menge von Message-Keys, die im Code nicht als Literal
 * auftaucht, sondern per Template-Literal aus einer Aufzaehlung gebildet wird
 * (`t(`catalog.${key}.title`)`). Der Literal-Scan in check-i18n.mjs kann sie
 * nicht sehen; ohne dieses Register meldet die Gegenrichtung sie als verwaist.
 *
 * Eine Familie ist strenger als ein Literal, nicht laxer: `members()` ist die
 * vollstaendige Sollmenge. Fehlt ein Mitglied in einer Locale, ist das rot —
 * und ein Key unter dem Praefix, den `members()` nicht nennt, ist verwaist.
 *
 * Regeln fuer neue Eintraege:
 *  - `members()` MUSS aus einer codeseitigen Aufzaehlung ableiten, nie aus den
 *    Locale-Dateien. Sonst prueft die Familie sich selbst.
 *  - `why` nennt die Aufrufstelle, damit die naechste Wartende die Familie
 *    loeschen kann, wenn die Aufrufstelle verschwindet.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");

/**
 * Liest die `key`-Literale aus ACHIEVEMENT_DEFINITIONS.
 * Absichtlich per Regex und nicht per Import: dieses Skript laeuft ohne Build,
 * lib/gamification.ts ist TypeScript mit Pfad-Aliassen.
 */
function achievementKeys() {
  const src = readFileSync(join(ROOT, "lib/gamification.ts"), "utf8");
  const start = src.indexOf("export const ACHIEVEMENT_DEFINITIONS");
  const end = src.indexOf("export type AchievementDefinition");
  if (start < 0 || end < 0) {
    throw new Error(
      "ACHIEVEMENT_DEFINITIONS nicht gefunden — Familie achievements.catalog anpassen"
    );
  }
  const block = src.slice(start, end);
  const keys = [...block.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (keys.length === 0) throw new Error("ACHIEVEMENT_DEFINITIONS ist leer");
  return keys;
}

/** Liest die `level`-Zahlen aus LEVELS. */
function levelNumbers() {
  const src = readFileSync(join(ROOT, "lib/gamification.ts"), "utf8");
  const start = src.indexOf("export const LEVELS");
  const end = src.indexOf("export type Level");
  if (start < 0 || end < 0) {
    throw new Error("LEVELS nicht gefunden — Familie achievements.levels anpassen");
  }
  const block = src.slice(start, end);
  const nums = [...block.matchAll(/level:\s*(\d+)/g)].map((m) => m[1]);
  if (nums.length === 0) throw new Error("LEVELS ist leer");
  return nums;
}

export const KEY_FAMILIES = [
  {
    namespace: "achievements",
    pattern: "catalog.<key>.title | catalog.<key>.description",
    members: () =>
      achievementKeys().flatMap((k) => [
        `catalog.${k}.title`,
        `catalog.${k}.description`,
      ]),
    why: "components/achievements/achievement-row.tsx, components/animations/achievement-toast.tsx",
  },
  {
    namespace: "achievements",
    pattern: "levels.<n>",
    members: () => levelNumbers().map((n) => `levels.${n}`),
    why: "components/progress/tabs/achievements-tab.tsx",
  },
];
```

- [ ] **Step 2: Failing test schreiben**

`__tests__/check-i18n.test.ts`:

```ts
import { execFileSync } from "node:child_process";
import { KEY_FAMILIES } from "../scripts/i18n-key-families.mjs";

function runChecker(): { code: number; out: string } {
  try {
    const out = execFileSync("node", ["scripts/check-i18n.mjs"], {
      encoding: "utf8",
      cwd: process.cwd(),
    });
    return { code: 0, out };
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
}

describe("check-i18n prüft beide Richtungen", () => {
  it("läuft grün auf dem aktuellen Stand", () => {
    const { code, out } = runChecker();
    expect(out).toContain("ORPHAN");
    expect(code, out).toBe(0);
  });

  it("meldet die Familien im Bericht", () => {
    const { out } = runChecker();
    expect(out).toMatch(/famil/i);
  });

  it("die Familien leiten aus dem Code ab, nicht aus den Locales", () => {
    for (const fam of KEY_FAMILIES) {
      const members = fam.members();
      expect(members.length, `${fam.namespace}/${fam.pattern} ist leer`).toBeGreaterThan(0);
    }
  });
});
```

Der erste Fall ist absichtlich so geschrieben, daß er nach der Implementierung grün wird und `ORPHAN` im Bericht erwartet — das Skript soll die Kategorie immer ausgeben, auch mit null Befunden, damit sichtbar ist, daß sie geprüft wurde.

- [ ] **Step 3: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/check-i18n.test.ts`
Expected: FAIL — `expected '…' to contain 'ORPHAN'`

- [ ] **Step 4: Die Gegenrichtung in `check-i18n.mjs` einbauen**

Nach dem bestehenden `missing`-Block, vor dem Report, ergänzen:

```js
// ─── Gegenrichtung: vorhanden ⇒ referenziert ─────────────────────────────────

import { KEY_FAMILIES } from "./i18n-key-families.mjs";

/** Alle im Code als Literal referenzierten "namespace.key". */
const referenced = new Set(references.map((r) => `${r.namespace}.${r.key}`));

/** Alle von deklarierten Familien erwarteten "namespace.key". */
const familyExpected = new Set();
for (const fam of KEY_FAMILIES) {
  for (const member of fam.members()) {
    familyExpected.add(`${fam.namespace}.${member}`);
  }
}

/** Flacht einen Locale-Baum zu "namespace.pfad.zum.key" auf. */
function flattenKeys(messages) {
  const out = new Set();
  for (const [ns, value] of Object.entries(messages)) {
    if (value == null || typeof value !== "object") continue;
    const walk = (node, prefix) => {
      for (const [k, v] of Object.entries(node)) {
        if (v != null && typeof v === "object") walk(v, `${prefix}${k}.`);
        else out.add(`${prefix}${k}`);
      }
    };
    walk(value, `${ns}.`);
  }
  return out;
}

// Familienmitglieder, die in mindestens einer Locale fehlen.
/** @type {Map<string, Set<string>>} */
const familyMissing = new Map();
for (const expected of familyExpected) {
  for (const [locale, messages] of locales) {
    if (!flattenKeys(messages).has(expected)) {
      if (!familyMissing.has(expected)) familyMissing.set(expected, new Set());
      familyMissing.get(expected).add(locale);
    }
  }
}

// Keys, die in einer Locale stehen, aber weder referenziert noch Familienmitglied sind.
/** @type {Map<string, Set<string>>} */
const orphans = new Map();
for (const [locale, messages] of locales) {
  for (const key of flattenKeys(messages)) {
    if (referenced.has(key) || familyExpected.has(key)) continue;
    if (!orphans.has(key)) orphans.set(key, new Set());
    orphans.get(key).add(locale);
  }
}
```

Der Import gehört an den Kopf der Datei zu den anderen Imports, nicht mitten hinein — er steht hier nur beim zugehörigen Block, damit der Zusammenhang lesbar ist.

- [ ] **Step 5: Den Report erweitern**

Der bestehende `if (missing.size === 0) { … process.exit(0) }`-Block muß weg — er beendet das Skript, bevor die neuen Kategorien berichtet werden. Ersetzen durch:

```js
// ─── Bericht ─────────────────────────────────────────────────────────────────

console.log(
  `Familien: ${KEY_FAMILIES.length} deklariert, ${familyExpected.size} erwartete Keys.\n`
);

let failed = false;

if (missing.size > 0) {
  failed = true;
  console.error(`✗ ${missing.size} referenzierte(r) Key fehlt/fehlen:\n`);
  for (const [ref, localeSet] of [...missing.entries()].sort()) {
    console.error(`  MISSING  ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error(`           used in : ${[...(refFiles.get(ref) ?? [])].join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ MISSING   keine — jeder referenzierte Key steht in allen Sprachen.");
}

if (familyMissing.size > 0) {
  failed = true;
  console.error(`✗ ${familyMissing.size} Familienmitglied(er) fehlt/fehlen:\n`);
  for (const [ref, localeSet] of [...familyMissing.entries()].sort()) {
    console.error(`  FAMILY   ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ FAMILY    keine — jede Familie ist in allen Sprachen vollständig.");
}

if (orphans.size > 0) {
  failed = true;
  console.error(`✗ ${orphans.size} verwaiste(r) Key:\n`);
  console.error(
    "  Ein verwaister Key ist entweder toter Text ODER eine Übersetzung, deren\n" +
      "  Verdrahtung fehlt. Vor dem Löschen prüfen, was von beidem — genau so\n" +
      "  wurde review.push_title gefunden: in sieben Sprachen übersetzt, von\n" +
      "  keiner Zeile benutzt, während lib/push.ts den deutschen Text hartkodierte.\n"
  );
  for (const [ref, localeSet] of [...orphans.entries()].sort()) {
    console.error(`  ORPHAN   ${ref}`);
    console.error(`           locales : ${[...localeSet].sort().join(", ")}`);
    console.error("");
  }
} else {
  console.log("✓ ORPHAN    keine — jeder Key ist referenziert oder Familienmitglied.");
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 6: Das JSDoc am Dateikopf berichtigen**

Zeilen 2-14 beschreiben nur die alte Richtung:

```js
/**
 * i18n completeness audit — beide Richtungen.
 *
 * 1. MISSING  referenziert ⇒ vorhanden. Scannt alle .ts/.tsx nach
 *             useTranslations()/getTranslations()-Bindungen und den
 *             Literal-Keys, die darauf aufgerufen werden.
 * 2. FAMILY   Aufzählung ⇒ vorhanden. Keys, die per Template-Literal
 *             gebildet werden (`t(`catalog.${key}.title`)`), stehen in
 *             scripts/i18n-key-families.mjs mit der codeseitigen Aufzählung,
 *             aus der ihre Mitglieder stammen.
 * 3. ORPHAN   vorhanden ⇒ referenziert. Ein Key in messages/*.json, der weder
 *             als Literal referenziert noch Familienmitglied ist.
 *
 * Alle drei Kategorien werden immer berichtet, auch mit null Befunden — sonst
 * ist "grün" nicht von "ungeprüft" zu unterscheiden.
 *
 * Exit 0 → alle drei leer. Exit 1 → mindestens ein Befund.
 *
 * Usage:
 *   node scripts/check-i18n.mjs          # run from repo root
 */
```

- [ ] **Step 7: Skript laufen lassen und die Befunde ansehen**

Run: `npm run check:i18n`
Expected: Exit 1, mit `ORPHAN`-Befunden. Die vier Label-Keys aus Task 2 (`review.streak`, `review.streak_max`, `stats.current_streak`, `stats.best_streak`) stehen darunter, ebenso `review.push_title` und `review.push_body`, ebenso die Kandidaten, die die Roadmap zählte.

**Das ist der Zweck des Schrittes, kein Fehler.** Die Liste wandert nach Task 4.

- [ ] **Step 8: Commit**

```bash
git add scripts/check-i18n.mjs scripts/i18n-key-families.mjs __tests__/check-i18n.test.ts
git commit -m "feat(config): check:i18n prueft beide Richtungen und kennt Key-Familien"
```

---

### Task 4: Die Verwaisten-Liste abarbeiten

**Files:**
- Modify: alle sieben `messages/*.json` (nur Löschungen von echtem toten Text)
- Create: `docs-tech/i18n-versprechen/verwaiste-keys.md`
- Modify: `scripts/i18n-key-families.mjs` (weitere Familien, falls der Lauf sie verlangt)

**Interfaces:**
- Consumes: die `ORPHAN`-Ausgabe aus Task 3 Step 7
- Produces: `npm run check:i18n` mit Exit 0

Kein Schritt dieses Tasks löscht auf Verdacht. Jeder Verwaiste bekommt eine von drei Antworten, und die Antwort steht in `verwaiste-keys.md`, bevor irgendetwas gelöscht wird.

| Antwort | Wann | Handlung |
| --- | --- | --- |
| **Familie** | Der Key wird per Template-Literal gebildet | Eintrag in `KEY_FAMILIES` |
| **Fehlende Verdrahtung** | Der Text existiert übersetzt, der Code hartkodiert stattdessen | **Nicht löschen** — in `verwaiste-keys.md` als Befund notieren, Fix gehört in seinen eigenen Schnitt |
| **Toter Text** | Keine Aufrufstelle, keine geplante, kein hartkodiertes Gegenstück | Löschen, in allen sieben Locales |

- [ ] **Step 1: Die Liste erzeugen und ablegen**

Run: `npm run check:i18n 2>&1 | grep -A2 "^  ORPHAN" > /tmp/orphans.txt; wc -l /tmp/orphans.txt`

- [ ] **Step 2: `verwaiste-keys.md` anlegen**

```markdown
# Verwaiste Message-Keys — Bestandsaufnahme

Erzeugt von `npm run check:i18n` (ORPHAN-Kategorie) nach dem Einbau der
Gegenrichtung. Jede Zeile hat eine Antwort, bevor gelöscht wird.

| Key | Antwort | Begründung |
| --- | --- | --- |
| `review.push_title` | fehlende Verdrahtung | in sieben Sprachen übersetzt; `lib/push.ts:1114` hartkodiert den deutschen Text. Schnitt 3 verdrahtet, löscht nicht. |
| `review.push_body` | fehlende Verdrahtung | wie oben, `lib/push.ts:1115` |
| `review.streak` | toter Text | Task 2 hat die Zeile durch `review.streak_line` ersetzt |
| `review.streak_max` | toter Text | wie oben |
| `stats.current_streak` | toter Text | Task 2 hat die Zeile durch `stats.current_streak_days` ersetzt |
| `stats.best_streak` | toter Text | wie oben |
| `quick.empty_title` | toter Text | verlor die Referenz, als `five-minute-view.tsx`s Leerzustand ein `EmptyState` wurde. `t("empty_title")` in `components/focus/focus-mode-view.tsx:124` ist Namespace `focus`, nicht `quick`. |
```

Die restlichen Zeilen aus `/tmp/orphans.txt` ergänzen. Für jede: Aufrufstelle suchen mit
`grep -rn "<letztes Keysegment>" app components lib --include=*.ts --include=*.tsx`.
Findet der Grep ein Template-Literal, ist es eine **Familie**. Findet er einen
hartkodierten deutschen String mit derselben Bedeutung, ist es eine **fehlende
Verdrahtung**. Findet er nichts, ist es **toter Text**.

- [ ] **Step 3: Familien nachtragen**

Für jeden Verwaisten mit Antwort „Familie" einen Eintrag in `KEY_FAMILIES`. Die Roadmap nennt drei erwartete Fälle: `closure.quote_${n}`, `templates.<x>.task_N`, `progress.tab_${id}`. Muster für `closure`:

```js
  {
    namespace: "closure",
    pattern: "quote_<n>",
    members: () => {
      const src = readFileSync(
        join(ROOT, "components/closure/closure-view.tsx"),
        "utf8"
      );
      const m = src.match(/QUOTE_COUNT\s*=\s*(\d+)/);
      if (!m) throw new Error("QUOTE_COUNT nicht gefunden — Familie closure.quote anpassen");
      return Array.from({ length: Number(m[1]) }, (_, i) => `quote_${i + 1}`);
    },
    why: "components/closure/closure-view.tsx",
  },
```

Gibt es keine codeseitige Aufzählung, muß eine geschaffen werden (eine exportierte Konstante), statt die Zahl im Familienregister zu erfinden. Eine Familie, deren `members()` aus den Locale-Dateien liest, prüft sich selbst und ist wertlos.

- [ ] **Step 4: Toten Text löschen**

Nur Keys mit Antwort „toter Text", und in **allen sieben** Locales. Nach jeder Löschung:

Run: `npm run check:i18n 2>&1 | tail -20`

- [ ] **Step 5: Grün werden**

Run: `npm run check:i18n`
Expected: Exit 0, drei Häkchen:
```
✓ MISSING   keine — jeder referenzierte Key steht in allen Sprachen.
✓ FAMILY    keine — jede Familie ist in allen Sprachen vollständig.
✓ ORPHAN    keine — jeder Key ist referenziert oder Familienmitglied.
```

Bleiben Keys mit Antwort „fehlende Verdrahtung" übrig, ist Exit 0 **nicht** erreichbar, ohne einen echten Befund zu verstecken. In dem Fall: die betroffenen Keys in eine dokumentierte Ausnahmeliste am Kopf von `i18n-key-families.mjs` aufnehmen, mit dem PR, der sie verdrahtet, als Fälligkeitsdatum:

```js
/**
 * Keys, deren Uebersetzung existiert und deren Verdrahtung fehlt.
 * Das ist eine Schuld mit Faelligkeit, keine Ausnahme: jeder Eintrag nennt
 * den Schnitt, der ihn entfernt. Ein Eintrag ohne Faelligkeit gehoert hier
 * nicht hin — dann ist es toter Text und wird geloescht.
 */
export const PENDING_WIRING = new Map([
  ["review.push_title", "Schnitt 3 — lib/push.ts:1114"],
  ["review.push_body", "Schnitt 3 — lib/push.ts:1115"],
]);
```

Und im Report als eigene Kategorie ausgeben, nicht stillschweigend aus `orphans` filtern:

```js
console.log(`ℹ PENDING   ${PENDING_WIRING.size} Key(s) warten auf Verdrahtung:`);
for (const [key, due] of PENDING_WIRING) console.log(`            ${key} → ${due}`);
```

- [ ] **Step 6: Volle Suite**

Run: `npm run check:i18n && npm test && npx tsc --noEmit && npm run lint`
Expected: alle vier grün

- [ ] **Step 7: Commit**

```bash
git add messages/ scripts/ docs-tech/i18n-versprechen/verwaiste-keys.md
git commit -m "chore(config): Verwaisten-Liste abgearbeitet, check:i18n gruen"
```

---

### Task 5: Doku und Abschluß

**Files:**
- Modify: `CHANGELOG.md` (`[Unreleased]`)
- Modify: `scripts/CLAUDE.md`
- Modify: `messages/CLAUDE.md`

- [ ] **Step 1: `CHANGELOG.md` ergänzen**

```markdown
- **Das Nutzermenü war deutsch, in einer Sieben-Sprachen-App.** Sechs Labels
  (`Statistiken`, `Wochenrückblick`, `Einstellungen`, `API Keys`, `Admin`,
  `Abmelden`) standen als nackte Textknoten in `user-menu.tsx` und gingen nie
  durch `t()` — `check:i18n` war blind dafür, weil es nur prüfte, ob
  referenzierte Keys existieren. Dazu hing das Tages-`d` der Streak-Zeilen per
  JS-Konkatenation an der Zahl, sodass Chinesisch „3d 连击" rendert; die
  Einheit steckt jetzt in der ICU-Nachricht. Das Sparkline-`aria-label` war
  englisch hartkodiert.
- **`check:i18n` prüft jetzt beide Richtungen.** Neu: `FAMILY` (eine
  codeseitige Aufzählung erzeugt eine Key-Familie — ein fehlendes Mitglied ist
  rot) und `ORPHAN` (ein Key ohne Referenz ist rot). Alle drei Kategorien
  werden immer berichtet, auch mit null Befunden: sonst ist „grün" nicht von
  „ungeprüft" zu unterscheiden. Der erste Lauf fand `review.push_title` und
  `review.push_body` — in allen sieben Sprachen übersetzt, von keiner Zeile
  benutzt, während `lib/push.ts` den deutschen Text hartkodierte.
```

- [ ] **Step 2: `scripts/CLAUDE.md` ergänzen**

Eintrag für `i18n-key-families.mjs` mit der Regel, daß `members()` aus dem Code ableiten muß und nie aus den Locale-Dateien.

- [ ] **Step 3: `messages/CLAUDE.md` ergänzen**

Die Datei schreibt heute vor, daß jeder Key in allen sieben Locales stehen muß. Ergänzen: Keys, die per Template-Literal gebildet werden, gehören in `scripts/i18n-key-families.mjs` — sonst meldet `check:i18n` sie als verwaist.

- [ ] **Step 4: Commit und PR**

```bash
git add CHANGELOG.md scripts/CLAUDE.md messages/CLAUDE.md
git commit -m "docs(docs): Ratsche und Nutzermenue im CHANGELOG"
git push -u origin HEAD
gh pr create --title "fix(ui): Nutzermenue, Streak-Zeilen und eine Ratsche, die beide Richtungen prueft"
```
