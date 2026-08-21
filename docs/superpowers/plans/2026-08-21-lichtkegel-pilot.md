# Lichtkegel — Implementierungsplan (Fundament + Dashboard-Pilot)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Momos visuelles System auf Tokens umstellen — vier Flächenstufen statt Rahmen und Schatten, Amber nur als Licht, Fraunces statt Lora — und das Dashboard als Pilot darauf umbauen.

**Architecture:** Erst das Fundament (Tokens in `globals.css`, Schriften in `layout.tsx`, ein Durchsetzungs-Script mit Ratsche), dann die Primitives (`Surface` ersetzt `Card`, `Button` auf drei Varianten), dann das Dashboard: aus acht gleich lauten Flächen werden ein belichtetes und zwei leise Elemente. Statische Prüfungen laufen als Node-Script nach dem Vorbild von `scripts/check-i18n.mjs`; UI-Verhalten wird über die vorhandene Playwright-Spur geprüft.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, `next/font/google`, next-themes, next-intl, Playwright, Vitest, Node-Scripts (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-21-lichtkegel-design.md`

## Global Constraints

- **Keine Farbe im Komponentencode.** Erlaubt sind ausschließlich `var(--…)`-Referenzen. Kein Hex, kein `rgb()`/`hsl()`, kein `white`/`black`, keine Tailwind-Palettenutility (`text-red-500` etc.).
- **Radius nur über vier Token:** `--radius-sm` 7px, `--radius-md` 11px, `--radius-lg` 14px, `--radius-pill` 999px. Kein `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`.
- **Keine Schatten** außer `--shadow-overlay` (nur Dialog und Popover).
- **Amber genau einmal pro Seite**, und nur als Wash, Glow oder Textfarbe der einen Handlung — nie als Fläche, nie als Rahmen.
- **Fraunces genau einmal pro Seite in großer Größe.** Abschnittsüberschriften sind Mono-Eyebrows.
- **7 Locales, nicht 3.** Jeder neue oder geänderte i18n-Key muss in **allen sieben** Dateien stehen: `messages/de.json`, `en.json`, `es.json`, `fr.json`, `nl.json`, `ru.json`, `zh.json`. `npm run check:i18n` muss grün sein. (CLAUDE.md behauptet „de/en/fr" — das ist veraltet und wird in Task 2 korrigiert.)
- **Dark und Light müssen beide funktionieren.** Dark ist Standard (`:root`), Light über `[data-theme="light"]` von next-themes.
- **TypeScript strict, kein `any`.** Bei Unklarheit `unknown` und einengen.
- **Conventional Commits** mit Scope aus der CLAUDE.md-Liste (`ui`, `config`, `docs`, `daily-quest`, …). Nach jeder Task committen.
- **`main` ist branch-protected.** Direkt-Push schlägt fehl; die Arbeit läuft auf `design/lichtkegel-impl` und geht per PR.
- **Für alle Playwright-Schritte** muss in einem zweiten Terminal `npm run dev` laufen, und die Testbefehle brauchen `DATABASE_URL` auf dieselbe Datenbank:

  ```bash
  # Terminal 1
  npm run dev
  # Terminal 2
  DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test <datei>
  ```

- **`PLAYWRIGHT_TEST_PASSWORD` darf NICHT gesetzt sein.** Sobald die Variable existiert, hängt `lib/auth.ts` den Credentials-Provider an die Auth.js-Konfiguration — und Auth.js verwirft daraufhin die *gesamte* Konfiguration mit `UnsupportedStrategy`, weil Credentials mit `session.strategy: "database"` unzulässig ist. Jeder Auth-Aufruf antwortet dann mit 500 und jede geschützte Route leitet auf `/login`. `e2e/global.setup.ts` legt die Session stattdessen direkt in der Datenbank an und braucht die Variable nicht. Details siehe „Vorgefundener Zustand" unten.

## Vorgefundener Zustand (Pre-Flight, 2026-08-21)

Beim Einrichten der Verifikationsspur kam heraus, dass die Playwright-Suite bis
jetzt **nie gelaufen ist**. Das wurde vor Task 1 behoben; die Funde stehen hier,
weil sie das Testen jedes Tasks betreffen.

| Befund | Wirkung | Status |
|---|---|---|
| `PLAYWRIGHT_TEST_PASSWORD` (in `.env.example` dokumentiert) fügt den Credentials-Provider hinzu; Auth.js verwirft mit `UnsupportedStrategy` die ganze Konfiguration, weil `session.strategy` `"database"` ist | **Jede** Anmeldung bricht: `/api/auth/session` → 500, jede geschützte Route → `/login`. Nicht nur Tests. | offen — Produktionscode, bewusst nicht im Rahmen dieses Plans geändert |
| `test-credentials`-Provider in `lib/auth.ts:93-135` | toter Code, kann mit DB-Sessions nie funktionieren | offen — siehe oben |
| `/login` rendert kein Credentials-Formular, `/api/auth/signin` leitet per `pages`-Config auf `/login` | `e2e/global.setup.ts` lief in einen 30-s-Timeout | **behoben**: Setup legt die Session direkt in der DB an |
| Testnutzer hatte `onboarding_completed = false` | jede geschützte Route leitete auf `/onboarding` | **behoben** im Setup |
| `a[href="/focus"]` matcht 3 Elemente (Sidebar, Dashboard, Mobile-Nav), Test ohne `.first()` | Strict-Mode-Verstoß in `dashboard.spec.ts` zweimal | **behoben**: auf `main` eingegrenzt |
| `e2e/helpers/api.ts` sendet `estimatedMinutes: 10`, der Validator erlaubt nur `5 \| 15 \| 30 \| 60 \| null` | 422 bei jedem Lauf | **behoben** |
| Playwright läuft in keinem CI-Workflow | 15 Spec-Dateien, die niemand ausführt — deshalb fiel nichts davon auf | offen — eigene Entscheidung, siehe unten |

`e2e/dashboard.spec.ts` ist seitdem 10/10 grün.

**Nicht in diesem Plan:** die zwei offenen Auth-Punkte anfassen. Das ist
Produktions-Authentifizierung und gehört nicht in einen Design-Umbau. Ebenso
das Verdrahten von Playwright in CI — sinnvoll, aber eine eigene Entscheidung,
weil es einen Dienst-Container und eine Migrationsstufe im Workflow braucht.

---

### Task 1: Token-Fundament in `globals.css`

**Files:**
- Modify: `app/globals.css` (Blöcke `:root`/`[data-theme="dark"]`, `[data-theme="light"]`, `@theme inline`)
- Create: `e2e/design-tokens.spec.ts`

**Interfaces:**
- Consumes: nichts.
- Produces: CSS-Custom-Properties, auf die alle folgenden Tasks zugreifen — `--ground`, `--s1`, `--s2`, `--s3`, `--hairline`, `--ink`, `--ink-2`, `--ink-3`, `--amber`, `--on-amber`, `--done`, `--danger`, `--radius-sm|md|lg|pill`, `--space-1|2|3|4|6|8|12|18`, `--shadow-overlay`. Die alten Namen (`--bg-primary`, `--bg-surface`, `--bg-elevated`, `--border`, `--text-primary`, `--text-muted`, `--accent-amber`, `--accent-green`, `--accent-red`, `--coin-gold`, `--accent-amber-100|60|25|10`, `--shadow-sm|md|lg`) bleiben als Aliase auf die neuen bestehen, damit die 130 noch nicht migrierten Dateien weiter rendern.

- [ ] **Step 1: Den Prüftest schreiben**

Neue Datei `e2e/design-tokens.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/**
 * Prueft, dass das Token-Fundament in beiden Themes vollstaendig aufgeloest
 * wird. Ein leerer String heisst: das Token existiert im aktiven Theme nicht.
 */
const REQUIRED = [
  "--ground", "--s1", "--s2", "--s3", "--hairline",
  "--ink", "--ink-2", "--ink-3",
  "--amber", "--on-amber", "--done", "--danger",
  "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill",
  "--shadow-overlay",
];

async function readTokens(page: import("@playwright/test").Page) {
  return page.evaluate((names: string[]) => {
    const s = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const n of names) out[n] = s.getPropertyValue(n).trim();
    return out;
  }, REQUIRED);
}

test.describe("Design-Tokens", () => {
  test("sind im Dark Mode vollstaendig", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    const t = await readTokens(page);
    for (const name of REQUIRED) expect(t[name], name).not.toBe("");
    expect(t["--ground"]).toBe("#0e100f");
    expect(t["--amber"]).toBe("#f0a500");
    expect(t["--on-amber"]).toBe("#171408");
  });

  test("sind im Light Mode vollstaendig und anders", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "light"),
    );
    const t = await readTokens(page);
    for (const name of REQUIRED) expect(t[name], name).not.toBe("");
    expect(t["--ground"]).toBe("#eceee5");
    expect(t["--amber"]).toBe("#a86f00");
    expect(t["--on-amber"]).toBe("#fffaf0");
  });

  test("Radien sind die vier Stufen der Skala", async ({ page }) => {
    await page.goto("/dashboard");
    const t = await readTokens(page);
    expect(t["--radius-sm"]).toBe("7px");
    expect(t["--radius-md"]).toBe("11px");
    expect(t["--radius-lg"]).toBe("14px");
    expect(t["--radius-pill"]).toBe("999px");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts`
Expected: FAIL — `--ground` ist `""`, weil die Tokens noch nicht existieren.

- [ ] **Step 3: Die neuen Token in `globals.css` eintragen**

Im Block `:root, [data-theme="dark"]` **ergänzen** (die bestehenden Zeilen zunächst stehen lassen):

```css
  /* ─── Lichtkegel: Flächen-Leiter ─────────────────────────────────────── */
  --ground:   #0e100f;
  --s1:       #151917;
  --s2:       #1b201d;
  --s3:       #222826;
  --hairline: #2a322e;

  --ink:   #f2e9d8;
  --ink-2: #a4b0a7;
  --ink-3: #6c7a71;

  --amber:    #f0a500;
  --on-amber: #171408;
  --done:     #5ec47e;
  --danger:   #d06460;

  /* Radius — vier Stufen, keine mehr. */
  --radius-sm:   7px;
  --radius-md:   11px;
  --radius-lg:   14px;
  --radius-pill: 999px;

  /* Abstand — Basis 4px. */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-6: 24px;  --space-8: 32px;  --space-12: 48px; --space-18: 72px;

  /* Der einzige verbleibende Schatten: Flächen, die wirklich schweben. */
  --shadow-overlay: 0 12px 40px rgba(0,0,0,.55);
```

Im Block `[data-theme="light"]` ergänzen:

```css
  --ground:   #eceee5;
  --s1:       #f5f6f0;
  --s2:       #e3e7db;
  --s3:       #d8ddce;
  --hairline: #c9d0be;

  --ink:   #1b241e;
  --ink-2: #55635a;
  --ink-3: #7d8a80;

  --amber:    #a86f00;
  --on-amber: #fffaf0;
  --done:     #2e7048;
  --danger:   #9e3b38;

  --shadow-overlay: 0 12px 40px rgba(0,0,0,.18);
```

- [ ] **Step 4: Alte Namen zu Aliassen umschreiben**

Damit die 130 noch nicht migrierten Dateien weiter korrekt rendern, werden die alten Token auf die neuen umgebogen. Im Block `:root, [data-theme="dark"]` die bisherigen Farb-Definitionen **ersetzen** durch:

```css
  /* ─── Aliase auf die Lichtkegel-Token ────────────────────────────────────
     Uebergangsschicht: nicht migrierte Dateien lesen weiter die alten Namen,
     bekommen aber die neuen Werte. Faellt weg, wenn die Ratsche in
     scripts/check-design-tokens.mjs bei 0 steht. */
  --bg-primary:   var(--ground);
  --bg-surface:   var(--s1);
  --bg-elevated:  var(--s3);
  --border:       var(--hairline);
  --text-primary: var(--ink);
  --text-muted:   var(--ink-2);
  --accent-amber: var(--amber);
  --accent-green: var(--done);
  --accent-red:   var(--danger);
  --coin-gold:    var(--amber);
```

`--rarity-legendary` bleibt unverändert. Die Kette `--accent-amber-100|60|25|10` bleibt bestehen, da sie über `var(--accent-amber)` mitläuft.

Die drei Schatten-Token werden zu Nullwerten, damit die Elevation aus der Fläche kommt und nicht mehr aus dem Schatten:

```css
  --shadow-sm: none;
  --shadow-md: none;
  --shadow-lg: var(--shadow-overlay);
```

Denselben Alias-Block in `[data-theme="light"]` spiegeln (dort sind die alten Farbdefinitionen ebenfalls durch `var(--…)`-Aliase zu ersetzen).

- [ ] **Step 5: Die Tailwind-Brücke erweitern**

Im `@theme inline`-Block ergänzen, damit Utilities wie `bg-ground` und `text-ink-2` existieren:

```css
  --color-ground: var(--ground);
  --color-s1: var(--s1);
  --color-s2: var(--s2);
  --color-s3: var(--s3);
  --color-hairline: var(--hairline);
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-3: var(--ink-3);
  --color-amber: var(--amber);
  --color-on-amber: var(--on-amber);
  --color-done: var(--done);
  --color-danger: var(--danger);
```

- [ ] **Step 6: Test laufen lassen, Erfolg bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts`
Expected: PASS — alle drei Tests.

- [ ] **Step 7: Sichtprüfung, dass nichts gebrochen ist**

Run: `npx playwright test e2e/dashboard.spec.ts e2e/topics.spec.ts e2e/wishlist.spec.ts`
Expected: PASS. Die Aliase halten die nicht migrierten Seiten am Leben. Schlägt etwas fehl, ist ein Alias falsch zugeordnet — nicht weitergehen.

- [ ] **Step 8: Commit**

```bash
git add app/globals.css e2e/design-tokens.spec.ts
git commit -m "feat(ui): Lichtkegel-Token — Flächen-Leiter, Radius-Skala, Amber als Licht"
```

---

### Task 2: Schriften tauschen

**Files:**
- Modify: `app/layout.tsx:12` (Import), `app/layout.tsx:31-50` (Font-Definitionen), und die `className` am `<html>`- oder `<body>`-Element
- Modify: `app/globals.css` (`@theme inline`-Fontfamilien, `.task-text`)
- Modify: `CLAUDE.md` (Abschnitt „Design & UI Rules", Font-Rollen und i18n-Locales)

**Interfaces:**
- Consumes: die Token aus Task 1.
- Produces: `--font-display` = Fraunces, `--font-ui` = Instrument Sans, `--font-mono` = JetBrains Mono. `--font-body` bleibt als Alias auf `--font-mono` bestehen, damit die nicht migrierten Dateien weiter rendern.

- [ ] **Step 1: Den Prüftest schreiben**

An `e2e/design-tokens.spec.ts` anhängen:

```ts
test.describe("Schriften", () => {
  test("die drei Rollen sind gesetzt und geladen", async ({ page }) => {
    await page.goto("/dashboard");
    const fams = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return {
        display: s.getPropertyValue("--font-display").trim(),
        ui: s.getPropertyValue("--font-ui").trim(),
        mono: s.getPropertyValue("--font-mono").trim(),
        body: s.getPropertyValue("--font-body").trim(),
      };
    });
    expect(fams.display).toContain("Fraunces");
    expect(fams.ui).toContain("Instrument");
    expect(fams.mono).toContain("JetBrains");
    // Alias fuer nicht migrierte Dateien
    expect(fams.body).toContain("JetBrains");
    expect(fams.display).not.toContain("Lora");
    expect(fams.ui).not.toContain("DM Sans");
  });

  test("Fraunces ist wirklich geladen, nicht auf Serif zurueckgefallen", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('1rem "Fraunces"');
    });
    expect(loaded).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts -g Schriften`
Expected: FAIL — `--font-display` enthält noch „Lora".

- [ ] **Step 3: `app/layout.tsx` umschreiben**

Import in Zeile 12 ersetzen:

```ts
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
```

Die drei Font-Definitionen ersetzen:

```ts
/**
 * Self-hosted fonts via next/font/google.
 * Downloaded at build time, served from the app's own domain — no requests to
 * fonts.googleapis.com or fonts.gstatic.com at runtime (DSGVO/performance).
 *
 * Fraunces ist variabel: die Achsen SOFT und WONK tragen den Charakter und
 * werden pro Verwendung über font-variation-settings gesetzt.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});
```

Anschließend die `className`-Liste am Wurzelelement anpassen: `lora.variable` → `fraunces.variable`, `dmSans.variable` → `instrumentSans.variable`. `jetbrainsMono.variable` bleibt namentlich gleich, liefert jetzt aber `--font-mono`.

**Achtung:** `Fraunces` ist eine Variable Font — `weight` darf nicht zusammen mit `axes` gesetzt werden, sonst wirft der Build. `next/font` erlaubt `axes` nur für die nicht-Gewichts-Achsen; `wght` ist implizit variabel.

- [ ] **Step 4: `globals.css` nachziehen**

Im `@theme inline`-Block:

```css
  --font-display: "Fraunces", Georgia, serif;
  --font-ui: "Instrument Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  /* Alias fuer nicht migrierte Dateien — faellt mit der Ratsche weg. */
  --font-body: var(--font-mono);
```

Und `.task-text` auf den neuen Namen umstellen:

```css
.task-text {
  font-family: var(--font-mono, "JetBrains Mono", monospace);
}
```

- [ ] **Step 5: Build laufen lassen**

Run: `npm run build`
Expected: Erfolg. Ein Fehler an dieser Stelle betrifft fast immer die `axes`-Angabe bei Fraunces.

- [ ] **Step 6: Test laufen lassen, Erfolg bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts`
Expected: PASS — alle fünf Tests.

- [ ] **Step 7: `CLAUDE.md` korrigieren**

Zwei Stellen. Im Abschnitt „Design & UI Rules" den Font-Satz ersetzen:

> Font usage: `--font-display` (Fraunces, variabel — Achsen SOFT/WONK) genau **einmal pro Seite** in großer Größe: auf dem Dashboard die Quest, sonst die Seitenüberschrift. `--font-mono` (JetBrains Mono) für Aufgaben- und Zahlentext. `--font-ui` (Instrument Sans) für alles andere — Labels, Badges, Buttons, Fließtext. Abschnittsüberschriften innerhalb einer Seite sind Mono-Eyebrows, nicht Fraunces.

Dieselben Regeln um zwei Zeilen ergänzen:

> Radius ausschließlich über `--radius-sm|md|lg|pill`. Keine Schatten außer `--shadow-overlay`. Amber erscheint genau einmal pro Seite und nur als Licht — nie als Fläche, nie als Rahmen.

Und in der Projektstruktur die Locale-Zeile berichtigen:

> `messages/` → i18n-Übersetzungen **de/en/es/fr/nl/ru/zh** (sieben Locales — jeder Key muss in allen sieben stehen, `npm run check:i18n` erzwingt das)

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/globals.css e2e/design-tokens.spec.ts CLAUDE.md
git commit -m "feat(ui): Fraunces und Instrument Sans ersetzen Lora und DM Sans"
```

---

### Task 3: Durchsetzungs-Script mit Ratsche

Ohne diesen Schritt läuft das System wieder auseinander. Weil heute 50 Hex-Werte und 1521 Inline-Styles existieren, kann die Prüfung nicht bei Null anfangen — sie arbeitet als **Ratsche**: eine Baseline pro Datei, die nur sinken darf.

**Files:**
- Create: `scripts/check-design-tokens.mjs`
- Create: `scripts/design-baseline.json` (generiert)
- Modify: `package.json` (Script `check:design`)
- Modify: `.github/workflows/test.yml` (Schritt nach „Check i18n completeness", Zeile ~140)

**Interfaces:**
- Consumes: nichts aus früheren Tasks.
- Produces: `npm run check:design` — Exit 0 wenn keine Datei ihre Baseline überschreitet, Exit 1 sonst. `npm run check:design -- --update` schreibt die Baseline neu, aber nur nach unten. `npm run check:design -- --selftest` prüft die Regexe gegen eingebaute Fixtures.

- [ ] **Step 1: Das Script schreiben, mit Selbsttest**

Neue Datei `scripts/check-design-tokens.mjs`:

```js
#!/usr/bin/env node
/**
 * Design-Token-Ratsche.
 *
 * Zaehlt pro Datei die Verstoesse gegen das Token-System und vergleicht mit
 * scripts/design-baseline.json. Der Zaehler darf nur sinken. Neue Dateien
 * duerfen keine Verstoesse einbringen.
 *
 * Drei Kategorien:
 *   color  — Hex, rgb(), hsl(), white/black, Tailwind-Palettenutilities
 *   radius — rounded-* ausserhalb der vier Token
 *   inline — style={{ … }}
 *
 * Exit 0 → keine Datei ueber Baseline.
 * Exit 1 → mindestens eine Datei ueber Baseline, oder Baseline fehlt.
 *
 * Usage:
 *   node scripts/check-design-tokens.mjs
 *   node scripts/check-design-tokens.mjs --update     # Baseline senken
 *   node scripts/check-design-tokens.mjs --selftest   # Regexe pruefen
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const BASELINE = join(ROOT, "scripts", "design-baseline.json");
const SCAN_DIRS = [join(ROOT, "app"), join(ROOT, "components")];
const IGNORE_DIRS = new Set(["node_modules", ".next", "dist", ".git"]);

const TAILWIND_PALETTES =
  "red|green|blue|amber|yellow|orange|purple|indigo|violet|slate|gray|grey|" +
  "zinc|neutral|stone|emerald|teal|cyan|sky|rose|pink|fuchsia|lime";

const PATTERNS = {
  color: [
    /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    /\brgba?\(/g,
    /\bhsla?\(/g,
    /["'\s:](?:white|black)["'\s,;}]/g,
    new RegExp(
      `\\b(?:text|bg|border|ring|from|via|to|fill|stroke|decoration|outline|shadow)-(?:${TAILWIND_PALETTES})-\\d{2,3}\\b`,
      "g",
    ),
  ],
  radius: [/\brounded-(?:sm|md|lg|xl|2xl|3xl|t|b|l|r|tl|tr|bl|br)\b/g],
  inline: [/style=\{\{/g],
};

/** Zaehlt Treffer aller Muster einer Kategorie in einem Quelltext. */
function countCategory(source, category) {
  let n = 0;
  for (const re of PATTERNS[category]) {
    re.lastIndex = 0;
    const m = source.match(re);
    if (m) n += m.length;
  }
  return n;
}

/** Alle .tsx-Dateien unter den Scan-Verzeichnissen. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/** Verstoss-Zaehler fuer das ganze Repo: { "pfad": {color,radius,inline} }. */
function scan() {
  const result = {};
  for (const dir of SCAN_DIRS) {
    if (!existsSync(dir)) continue;
    for (const file of collect(dir)) {
      const src = readFileSync(file, "utf8");
      const counts = {
        color: countCategory(src, "color"),
        radius: countCategory(src, "radius"),
        inline: countCategory(src, "inline"),
      };
      if (counts.color || counts.radius || counts.inline) {
        result[relative(ROOT, file)] = counts;
      }
    }
  }
  return result;
}

function selftest() {
  const cases = [
    ['color', 'color: "#1a1a0a"', 1],
    ['color', 'background: "rgba(0,0,0,.5)"', 1],
    ['color', 'className="text-red-500"', 1],
    ['color', 'color: "var(--ink)"', 0],
    ['color', 'className="text-ink-2 bg-s1"', 0],
    ['radius', 'className="rounded-xl"', 1],
    ['radius', 'className="rounded-[var(--radius-md)]"', 0],
    ['radius', 'className="rounded-full"', 0],
    ['inline', 'style={{ color: "red" }}', 1],
    ['inline', 'className="x"', 0],
  ];
  let failed = 0;
  for (const [cat, src, want] of cases) {
    const got = countCategory(src, cat);
    if (got !== want) {
      console.error(`selftest FAIL [${cat}] ${JSON.stringify(src)} → ${got}, erwartet ${want}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`\n${failed} Selbsttest(s) fehlgeschlagen.`);
    process.exit(1);
  }
  console.log(`Selbsttest: ${cases.length} Faelle in Ordnung.`);
  process.exit(0);
}

// ─── Hauptlauf ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes("--selftest")) selftest();

const current = scan();

if (args.includes("--update")) {
  const old = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
  const merged = {};
  let raised = [];
  for (const [file, counts] of Object.entries(current)) {
    const prev = old[file];
    if (prev) {
      for (const k of ["color", "radius", "inline"]) {
        if (counts[k] > prev[k]) raised.push(`${file} (${k}: ${prev[k]} → ${counts[k]})`);
      }
    }
    merged[file] = counts;
  }
  if (raised.length) {
    console.error("Die Baseline ist eine Ratsche — sie darf nicht steigen:\n");
    for (const r of raised) console.error(`  ${r}`);
    process.exit(1);
  }
  writeFileSync(BASELINE, JSON.stringify(merged, null, 2) + "\n");
  const total = Object.values(merged).reduce(
    (a, c) => a + c.color + c.radius + c.inline, 0);
  console.log(`Baseline aktualisiert: ${Object.keys(merged).length} Dateien, ${total} Verstoesse.`);
  process.exit(0);
}

if (!existsSync(BASELINE)) {
  console.error("scripts/design-baseline.json fehlt. Einmalig anlegen mit:");
  console.error("  npm run check:design -- --update");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
const problems = [];

for (const [file, counts] of Object.entries(current)) {
  const allowed = baseline[file] ?? { color: 0, radius: 0, inline: 0 };
  for (const k of ["color", "radius", "inline"]) {
    if (counts[k] > allowed[k]) {
      problems.push(`${file} — ${k}: ${counts[k]}, erlaubt ${allowed[k]}`);
    }
  }
}

if (problems.length) {
  console.error("Design-Token-Ratsche verletzt:\n");
  for (const p of problems) console.error(`  ${p}`);
  console.error("\nErlaubt sind nur var(--…)-Referenzen, Radien nur ueber");
  console.error("--radius-sm|md|lg|pill. Sinkt der Zaehler, Baseline senken mit:");
  console.error("  npm run check:design -- --update");
  process.exit(1);
}

const total = Object.values(current).reduce(
  (a, c) => a + c.color + c.radius + c.inline, 0);
console.log(`Design-Token-Ratsche in Ordnung — ${total} Verstoesse, keiner neu.`);
```

- [ ] **Step 2: Selbsttest laufen lassen, Erfolg bestätigen**

Run: `node scripts/check-design-tokens.mjs --selftest`
Expected: PASS — „Selbsttest: 10 Faelle in Ordnung." Schlägt ein Fall fehl, ist ein Regex falsch; erst hier weiterarbeiten, wenn alle zehn sitzen.

- [ ] **Step 3: Ohne Baseline laufen lassen, Fehlschlag bestätigen**

Run: `node scripts/check-design-tokens.mjs`
Expected: FAIL mit „scripts/design-baseline.json fehlt."

- [ ] **Step 4: Baseline anlegen**

Run: `node scripts/check-design-tokens.mjs --update`
Expected: „Baseline aktualisiert: N Dateien, M Verstoesse." M muss in der Größenordnung 1600 liegen (1521 Inline-Styles + Farben + Radien). Liegt es weit darunter, greifen die Regexe nicht.

- [ ] **Step 5: Erneut laufen lassen, Erfolg bestätigen**

Run: `node scripts/check-design-tokens.mjs`
Expected: PASS — „keiner neu."

- [ ] **Step 6: Die Ratsche gegen einen künstlichen Verstoß prüfen**

In eine beliebige Datei unter `components/` testweise `style={{ color: "#ff0000" }}` einfügen, dann:

Run: `node scripts/check-design-tokens.mjs`
Expected: FAIL, die Datei wird namentlich genannt (color und inline je +1). Änderung anschließend zurücknehmen und erneut laufen lassen — muss wieder PASS ergeben.

- [ ] **Step 7: `package.json` erweitern**

Im `scripts`-Block neben `check:i18n` einfügen:

```json
    "check:design": "node scripts/check-design-tokens.mjs",
```

- [ ] **Step 8: CI verdrahten**

In `.github/workflows/test.yml` direkt nach dem Schritt „Check i18n completeness" einfügen:

```yaml
      - name: Check design-token ratchet
        run: |
          npm run check:design -- --selftest
          npm run check:design
```

- [ ] **Step 9: Commit**

```bash
git add scripts/check-design-tokens.mjs scripts/design-baseline.json package.json .github/workflows/test.yml
git commit -m "test(config): Design-Token-Ratsche — Farben, Radien und Inline-Styles dürfen nur sinken"
```

---

### Task 4: `Surface` ersetzt `Card`

`Card` **ist** der Kasten, den der Entwurf abschafft: Rahmen plus Schatten plus Fläche. `Surface` trägt nur eine Flächenstufe und einen Radius.

**Files:**
- Create: `components/ui/surface.tsx`
- Delete: `components/ui/card.tsx`
- Modify: `app/(docs)/design-system/page.tsx` (Import von `Card` auf `Surface` umstellen)

**Interfaces:**
- Consumes: `--s1`, `--s2`, `--s3`, `--radius-md`, `--radius-lg`, `--shadow-overlay` aus Task 1; `cn` aus `@/lib/utils`.
- Produces:
  ```ts
  type SurfaceLevel = "flat" | "raised" | "input" | "overlay";
  interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
    level?: SurfaceLevel;   // Standard "flat"
    radius?: "md" | "lg";   // Standard "md"
    asChild?: boolean;      // Standard false
  }
  export function Surface(props: SurfaceProps): React.ReactElement
  ```
  Task 7, 8 und 10 verwenden genau diese Namen.

- [ ] **Step 1: Den Prüftest schreiben**

An `e2e/design-tokens.spec.ts` anhängen:

```ts
test.describe("Surface", () => {
  test("hat keinen Rahmen und keinen Schatten", async ({ page }) => {
    await page.goto("/design-system");
    const el = page.getByTestId("surface-flat");
    await expect(el).toBeVisible();
    const s = await el.evaluate((n) => {
      const c = getComputedStyle(n);
      return { border: c.borderTopWidth, shadow: c.boxShadow, radius: c.borderTopLeftRadius };
    });
    expect(s.border).toBe("0px");
    expect(s.shadow).toBe("none");
    expect(s.radius).toBe("11px");
  });

  test("flat, raised und input sind unterschiedlich hell", async ({ page }) => {
    await page.goto("/design-system");
    const bg = async (id: string) =>
      page.getByTestId(id).evaluate((n) => getComputedStyle(n).backgroundColor);
    const flat = await bg("surface-flat");
    const raised = await bg("surface-raised");
    const input = await bg("surface-input");
    expect(new Set([flat, raised, input]).size).toBe(3);
  });

  test("overlay ist die einzige Stufe mit Schatten", async ({ page }) => {
    await page.goto("/design-system");
    const shadow = await page
      .getByTestId("surface-overlay")
      .evaluate((n) => getComputedStyle(n).boxShadow);
    expect(shadow).not.toBe("none");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts -g Surface`
Expected: FAIL — `surface-flat` existiert nicht.

- [ ] **Step 3: `components/ui/surface.tsx` schreiben**

```tsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/**
 * Surface — die Flaeche, auf der Inhalt liegt.
 *
 * Ersetzt die fruehere Card. Der Unterschied ist Absicht: eine Surface hat
 * keinen Rahmen und keinen Schatten. Abgrenzung entsteht aus der Helligkeit
 * der Flaeche, nicht aus einer Linie — sonst wirken acht Flaechen gleich
 * schwer, und genau das war das Problem.
 *
 * Stufen:
 *   flat    — unbeleuchteter Inhalt (--s1)
 *   raised  — angehoben, z. B. ausgewaehlt (--s2)
 *   input   — Eingabe, Hover (--s3)
 *   overlay — schwebt wirklich ueber Inhalt: Dialog, Popover. Nur hier
 *             gibt es einen Schatten.
 */

export type SurfaceLevel = "flat" | "raised" | "input" | "overlay";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: SurfaceLevel;
  radius?: "md" | "lg";
  asChild?: boolean;
}

const LEVEL_CLASS: Record<SurfaceLevel, string> = {
  flat: "bg-[var(--s1)]",
  raised: "bg-[var(--s2)]",
  input: "bg-[var(--s3)]",
  overlay: "bg-[var(--s2)] shadow-[var(--shadow-overlay)]",
};

const RADIUS_CLASS = {
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
} as const;

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, level = "flat", radius = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={cn("border-0", LEVEL_CLASS[level], RADIUS_CLASS[radius], className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);
Surface.displayName = "Surface";
```

**Hinweis:** `@radix-ui/react-slot` wird von `card.tsx` und `button.tsx` importiert, steht aber nicht in `package.json` — es kommt transitiv über die anderen Radix-Pakete. Wenn `npm run build` es nicht auflöst, mit `npm i @radix-ui/react-slot` als direkte Abhängigkeit nachziehen und das im Commit erwähnen.

- [ ] **Step 4: Die Design-System-Seite auf `Surface` umstellen**

In `app/(docs)/design-system/page.tsx` den `Card`-Import entfernen und einen Abschnitt mit den vier Stufen einsetzen, jede mit `data-testid`:

```tsx
import { Surface } from "@/components/ui/surface";

// … im JSX:
<section>
  <p className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
    Flächen
  </p>
  <div className="flex flex-wrap gap-4">
    <Surface data-testid="surface-flat" className="p-6">flat — unbeleuchtet</Surface>
    <Surface data-testid="surface-raised" level="raised" className="p-6">raised</Surface>
    <Surface data-testid="surface-input" level="input" className="p-6">input, hover</Surface>
    <Surface data-testid="surface-overlay" level="overlay" radius="lg" className="p-6">
      overlay — die einzige Stufe mit Schatten
    </Surface>
  </div>
</section>
```

- [ ] **Step 5: `card.tsx` löschen**

Run: `git rm components/ui/card.tsx`
Danach prüfen, dass niemand sie noch importiert:
Run: `grep -rn "components/ui/card" app components`
Expected: keine Ausgabe.

- [ ] **Step 6: Test laufen lassen, Erfolg bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts -g Surface`
Expected: PASS — alle drei Tests.

- [ ] **Step 7: Ratsche prüfen**

Run: `npm run check:design`
Expected: PASS. Die neue Datei bringt keine Verstöße ein (nur `var(--…)`-Referenzen und Token-Radien).

- [ ] **Step 8: Commit**

Die Löschung von `card.tsx` ist durch `git rm` in Step 5 bereits vorgemerkt.

```bash
git add components/ui/surface.tsx "app/(docs)/design-system/page.tsx" e2e/design-tokens.spec.ts
git commit -m "refactor(ui): Surface ersetzt Card — Fläche statt Rahmen und Schatten"
```

---

### Task 5: `Button` auf drei Varianten, `Badge` auf Token

Sechs Varianten waren fünf zu viel: `primary`, `secondary`, `ghost`, `danger`, `success`, `outline` — dabei ist „die eine Handlung" genau eine.

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/badge.tsx`
- Modify: `app/(docs)/design-system/page.tsx` (Varianten-Galerie)

**Interfaces:**
- Consumes: Token aus Task 1.
- Produces:
  ```ts
  variant?: "primary" | "quiet" | "danger";   // Standard "quiet"
  size?: "sm" | "md" | "lg" | "icon";         // unveraendert
  ```
  `Badge`-Varianten: `"neutral" | "done" | "danger" | "amber"`.

- [ ] **Step 1: Den Prüftest schreiben**

An `e2e/design-tokens.spec.ts` anhängen:

```ts
test.describe("Button", () => {
  test("primary traegt Amber als Text, nicht als Flaeche", async ({ page }) => {
    await page.goto("/design-system");
    const s = await page.getByTestId("btn-primary").evaluate((n) => {
      const c = getComputedStyle(n);
      return { bg: c.backgroundColor, color: c.color, border: c.borderTopWidth };
    });
    // Amber #f0a500 = rgb(240, 165, 0) — als Textfarbe, nicht als Hintergrund
    expect(s.color).toBe("rgb(240, 165, 0)");
    expect(s.bg).not.toBe("rgb(240, 165, 0)");
    expect(s.border).toBe("0px");
  });

  test("es gibt genau drei Varianten", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByTestId("btn-primary")).toBeVisible();
    await expect(page.getByTestId("btn-quiet")).toBeVisible();
    await expect(page.getByTestId("btn-danger")).toBeVisible();
    await expect(page.getByTestId("btn-success")).toHaveCount(0);
    await expect(page.getByTestId("btn-outline")).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/design-tokens.spec.ts -g Button`
Expected: FAIL — `btn-primary` existiert nicht.

- [ ] **Step 3: `button.tsx` umschreiben**

Den `variantStyles`-Block und den Typ ersetzen:

```tsx
  variant?: "primary" | "quiet" | "danger";
```

```tsx
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap border-0 " +
      "rounded-[var(--radius-sm)] text-sm font-semibold transition-colors duration-150 " +
      "disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none";

    // primary traegt Amber als Textfarbe, nicht als Flaeche: Amber ist Licht.
    // Es gibt genau eine primary-Handlung pro Seite.
    const variantStyles = {
      primary: "bg-transparent text-[var(--amber)] hover:bg-[var(--s2)]",
      quiet: "bg-[var(--s2)] text-[var(--ink)] hover:bg-[var(--s3)]",
      danger: "bg-transparent text-[var(--danger)] hover:bg-[var(--s2)]",
    };
```

Den `focus-visible:ring-2 focus-visible:ring-offset-2` aus `baseStyles` **entfernen**. Er setzte einen `box-shadow` ohne Ringfarbe und überschrieb damit den globalen Amber-Fokus-Glow aus `globals.css`.

Den Standardwert der Prop von `"secondary"` auf `"quiet"` ändern.

- [ ] **Step 4: `badge.tsx` auf Token umstellen**

`variantStyles` ersetzen:

```tsx
  const variantStyles = {
    neutral: "bg-[var(--s2)] text-[var(--ink-2)]",
    done: "bg-[color-mix(in_srgb,var(--done)_15%,transparent)] text-[var(--done)]",
    danger: "bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]",
    amber: "bg-[color-mix(in_srgb,var(--amber)_15%,transparent)] text-[var(--amber)]",
  };
```

Typ auf `"neutral" | "done" | "danger" | "amber"`, Standard `"neutral"`. Radius auf `rounded-[var(--radius-sm)]`, `border` auf `border-0`, `font-family` per `className` statt Inline-Style.

- [ ] **Step 5: Aufrufer finden und anpassen**

Run: `grep -rn 'variant="secondary"\|variant="ghost"\|variant="outline"\|variant="success"' app components`

Jeden Treffer umschreiben: `secondary`/`ghost`/`outline` → `quiet`, `success` → `primary`. Nur wenn die Datei `Button` aus `components/ui/button` importiert — andere Komponenten haben eigene `variant`-Props.

- [ ] **Step 6: Design-System-Seite: die drei Varianten mit testids**

```tsx
<Button data-testid="btn-primary" variant="primary">jetzt anfangen</Button>
<Button data-testid="btn-quiet" variant="quiet">aufteilen</Button>
<Button data-testid="btn-danger" variant="danger">löschen</Button>
```

Alte Varianten aus der Galerie entfernen.

- [ ] **Step 7: Tests laufen lassen**

Run: `npx playwright test e2e/design-tokens.spec.ts`
Expected: PASS — alle Gruppen.
Run: `npm run build`
Expected: Erfolg. TypeScript findet jeden übersehenen `variant`-Aufrufer.

- [ ] **Step 8: Commit**

```bash
git add components/ui/button.tsx components/ui/badge.tsx "app/(docs)/design-system/page.tsx" e2e/design-tokens.spec.ts
git commit -m "refactor(ui): Button auf drei Varianten, Badge auf Token — Amber wird Textfarbe"
```

---

### Task 6: Dashboard entschlacken

Aus acht Flächen werden drei Elemente. Dieser Task nimmt weg; Task 7 und 8 bauen das Verbleibende um.

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `e2e/dashboard.spec.ts:20-60`
- Modify: `messages/de.json`, `en.json`, `es.json`, `fr.json`, `nl.json`, `ru.json`, `zh.json`

**Interfaces:**
- Consumes: `Surface` aus Task 4, Token aus Task 1.
- Produces: die Metazeile über der Quest, die Task 7 erwartet — ein `<div data-testid="quest-meta">` mit Wochentag, Energie-Zustand und Streak.

- [ ] **Step 1: Die e2e-Erwartung umschreiben (der failing test)**

In `e2e/dashboard.spec.ts` den Stat-Karten-Test (Zeile 22-26) und die beiden Quick-Link-Tests (Zeile 44-60) ersetzen:

```ts
  test("zeigt keine Stat-Tiles mehr", async ({ page }) => {
    await page.goto("/dashboard");
    // Coins und Level stehen in der Navbar; auf dem Dashboard standen sie doppelt.
    await expect(page.getByTestId("stat-tiles")).toHaveCount(0);
  });

  test("zeigt keine Quick-Links mehr", async ({ page }) => {
    await page.goto("/dashboard");
    // Dupliziert die Sidebar.
    await expect(page.getByTestId("dashboard-quick-links")).toHaveCount(0);
  });

  test("Wochentag, Energie und Streak stehen in einer Metazeile", async ({ page }) => {
    await page.goto("/dashboard");
    const meta = page.getByTestId("quest-meta");
    await expect(meta).toBeVisible();
    await expect(meta).toContainText(/\d+/); // Streak-Zahl
  });
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/dashboard.spec.ts`
Expected: FAIL — `quest-meta` existiert nicht.

- [ ] **Step 3: Die Stat-Tiles, Quick-Links und den Focus-Banner entfernen**

In `app/(app)/dashboard/page.tsx` drei Blöcke löschen:

1. Die `<section>` mit `t("section_overview")` samt der vierfachen `.map()`-Kachelliste.
2. Die `<section>` mit `t("navigate")` samt den beiden `<Link>`-Elementen.
3. Den freistehenden `<Link href="/focus">`-Banner (der grüne Kasten mit `t("focus_cta")` und `faBullseye`). Er wird in Task 7 zur ersten Handlung in der Quest-Zeile — als Text, nicht als Banner.

Dadurch werden unbenutzt und sind mitzuentfernen: der `getCoinTier`-Helper, die Variable `coinTier`, die Importe `faCoins`, `faFire`, `faTrophy`, `faCircleCheck`, `faBullseye`, `IconDefinition` und `FontAwesomeIcon` (falls kein weiterer Nutzer in der Datei bleibt).

Ebenfalls löschen: der dekorative Glow-`<div>` über dem Greeting (`aria-hidden`, 300×180 px, `radial-gradient`). Er ist in der gerenderten Seite nicht wahrnehmbar und wird in Task 7 durch die echte Lichtquelle ersetzt.

`totalCompletions` bleibt — es wird noch für `isNewUser` und `bestDayInsight` gebraucht. `stats` bleibt für den Streak in der Metazeile.

**Nicht zu entfernen, weil nicht vorhanden:** einen „I only have 5 minutes"-Block gibt es im Code nicht mehr. Die Keys `five_min_cta` und `five_min_cta_count` sind Waisen aus einer früheren Fassung — sie kommen in Step 5 mit auf die Löschliste. `public/screenshots/01-dashboard.png` zeigt diesen Block noch und ist damit ebenfalls veraltet (siehe Task 9).

- [ ] **Step 3b: Das Greeting klein und mono setzen**

Das Greeting ist Begrüßung, nicht die Hauptsache der Seite — Fraunces ist für die Quest reserviert. Den `<h1>`-Block ersetzen, **das `h1`-Element aber vorerst behalten**:

```tsx
        <h1 className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] font-normal tracking-[0.01em] text-[var(--ink-2)]">
          {greeting}, {firstName}.
        </h1>
```

Warum noch `h1`: `e2e/dashboard.spec.ts:15` prüft, dass die Seite eine `h1` hat. In Task 7 wird die Quest zur `h1` — semantisch richtig, denn sie *ist* die Hauptsache der Seite —, und dieses Element wird dann zum `<p>`. Bis dahin bleibt jeder Zwischenzustand grün.

Der `<p>` mit `subtitle` direkt darunter entfällt — die Metazeile aus Step 4 sagt dasselbe präziser. Damit werden die Keys `subtitle_quest`, `subtitle_done` und `subtitle_empty` frei und kommen in Step 5 auf die Löschliste; die Variable `subtitle` und ihre Berechnung entfallen mit.

- [ ] **Step 4: Die Metazeile einsetzen**

Den bisherigen `EnergyCheckinCard`-Abschnitt und den Insight-Chip ersetzen durch eine Zeile über der Quest:

```tsx
      {/* ── Metazeile: Wochentag, Energie, Streak ─────────────────────────────
          Ersetzt drei fruehere Flaechen (Energie-Karte, Insight-Chip,
          Stat-Tiles). Alles Mono, alles gedimmt — es ist Kontext, keine
          Handlung. */}
      <div
        data-testid="quest-meta"
        className="flex items-center justify-between gap-3 flex-wrap font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-3)]"
      >
        <span>{weekdayLabel} · {energyLabel}</span>
        <span className="flex gap-4">
          <span>{t("meta_streak", { days: stats.streakCurrent })}</span>
          {bestDayInsight && <span>{bestDayInsight}</span>}
        </span>
      </div>

      <EnergyCheckinCard
        energyLevel={cachedEnergyLevel}
        energyLevelDate={cachedEnergyLevelDate}
      />
```

Direkt vor dem `return` die zwei neuen Labels berechnen:

```tsx
  // Wochentag als Wort — der Nutzer liest "donnerstag", nicht ein Datum.
  const weekdayKeys = ["meta_day_mon","meta_day_tue","meta_day_wed","meta_day_thu","meta_day_fri","meta_day_sat","meta_day_sun"] as const;
  const isoDow = ((new Date().getDay() + 6) % 7); // 0 = Montag
  const weekdayLabel = t(weekdayKeys[isoDow] as Parameters<typeof t>[0]);

  const energyLabel = userEnergyToday
    ? t(`energy_${userEnergyToday.toLowerCase()}` as Parameters<typeof t>[0])
    : t("meta_energy_unknown" as Parameters<typeof t>[0]);
```

Die Eyebrow-Überschrift `t("section_quest")` über der Quest entfällt — die Quest *ist* das eine Ding, sie braucht keine Ankündigung.

- [ ] **Step 5: Die neuen i18n-Keys in alle sieben Locales**

Neu im Namespace `dashboard`: `meta_streak`, `meta_energy_unknown`, `meta_day_mon` bis `meta_day_sun` — **neun Keys × sieben Dateien**.

Deutsch:
```json
    "meta_streak": "{days} Tage Serie",
    "meta_energy_unknown": "Energie noch offen",
    "meta_day_mon": "montag",
    "meta_day_tue": "dienstag",
    "meta_day_wed": "mittwoch",
    "meta_day_thu": "donnerstag",
    "meta_day_fri": "freitag",
    "meta_day_sat": "samstag",
    "meta_day_sun": "sonntag",
```

Englisch:
```json
    "meta_streak": "{days} day streak",
    "meta_energy_unknown": "energy not set",
    "meta_day_mon": "monday",
    "meta_day_tue": "tuesday",
    "meta_day_wed": "wednesday",
    "meta_day_thu": "thursday",
    "meta_day_fri": "friday",
    "meta_day_sat": "saturday",
    "meta_day_sun": "sunday",
```

Die übrigen fünf, Wochentage klein wo die Sprache es zulässt:

| Key | es | fr | nl | ru | zh |
|---|---|---|---|---|---|
| `meta_streak` | `{days} días de racha` | `{days} jours de suite` | `{days} dagen reeks` | `{days} дней подряд` | `连续 {days} 天` |
| `meta_energy_unknown` | `energía sin definir` | `énergie non définie` | `energie nog niet gezet` | `энергия не указана` | `未设定精力` |
| `meta_day_mon` | `lunes` | `lundi` | `maandag` | `понедельник` | `星期一` |
| `meta_day_tue` | `martes` | `mardi` | `dinsdag` | `вторник` | `星期二` |
| `meta_day_wed` | `miércoles` | `mercredi` | `woensdag` | `среда` | `星期三` |
| `meta_day_thu` | `jueves` | `jeudi` | `donderdag` | `четверг` | `星期四` |
| `meta_day_fri` | `viernes` | `vendredi` | `vrijdag` | `пятница` | `星期五` |
| `meta_day_sat` | `sábado` | `samedi` | `zaterdag` | `суббота` | `星期六` |
| `meta_day_sun` | `domingo` | `dimanche` | `zondag` | `воскресенье` | `星期日` |

**Hinweis zu `meta_streak`:** `{days}` ist ein einfacher Platzhalter, keine ICU-Pluralform. Wenn im Deutschen „1 Tage Serie" störend ist, stattdessen die ICU-Form nach dem Vorbild von `five_min_cta_count` verwenden — dann aber in allen sieben Dateien.

Obsolet und aus allen sieben Dateien zu entfernen (elf Keys):
`section_overview`, `navigate`, `all_tasks`, `all_topics`, `stat_coins`,
`stat_streak`, `stat_level`, `stat_completed`, `section_quest`,
`subtitle_quest`, `subtitle_done`, `subtitle_empty`.

Dazu die beiden Waisen, die schon vor dieser Arbeit unbenutzt waren:
`five_min_cta`, `five_min_cta_count`.

`focus_cta` („Enter Focus Mode") und `focus_cta_hint` kommen ebenfalls auf die Löschliste. Task 7 führt für dieselbe Stelle den neuen Key `quest_start` ein — „jetzt anfangen" sagt, was passiert, während „Enter Focus Mode" einen Modus benennt, den nur die App kennt.

- [ ] **Step 6: i18n-Prüfung laufen lassen**

Run: `npm run check:i18n`
Expected: PASS. Ein Fehlschlag nennt Datei und Key — dort fehlt eine der sieben Übersetzungen.

- [ ] **Step 7: e2e laufen lassen, Erfolg bestätigen**

Run: `npx playwright test e2e/dashboard.spec.ts`
Expected: PASS — alle Tests, auch die drei neuen.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/dashboard/page.tsx" e2e/dashboard.spec.ts messages/
git commit -m "refactor(ui): Dashboard entschlackt — Stat-Tiles und Quick-Links weg, Metazeile statt drei Flächen"
```

---

### Task 7: Die Quest wird die Lichtquelle

**Files:**
- Modify: `components/dashboard/daily-quest-card.tsx`
- Modify: `app/globals.css` (`.quest-card-breathing` ersetzen durch `.lichtkegel`)
- Modify: `e2e/daily-quest.spec.ts`

**Interfaces:**
- Consumes: `quest-meta` aus Task 6, Token aus Task 1, Fraunces aus Task 2.
- Produces: `<div data-testid="quest-light">` als Lichtquelle, `<h1 data-testid="quest-title">` in Fraunces.

- [ ] **Step 1: Den Prüftest schreiben**

An `e2e/daily-quest.spec.ts` anhängen:

```ts
test.describe("Lichtkegel", () => {
  test("die Quest ist in Fraunces gesetzt und gross", async ({ page }) => {
    await page.goto("/dashboard");
    const title = page.getByTestId("quest-title");
    await expect(title).toBeVisible();
    const s = await title.evaluate((n) => {
      const c = getComputedStyle(n);
      return { family: c.fontFamily, size: parseFloat(c.fontSize) };
    });
    expect(s.family).toContain("Fraunces");
    expect(s.size).toBeGreaterThan(27); // clamp-Minimum 1.75rem
  });

  test("die Quest hat keinen Rahmen und keinen Kasten", async ({ page }) => {
    await page.goto("/dashboard");
    const s = await page.getByTestId("quest-light").evaluate((n) => {
      const c = getComputedStyle(n);
      return { border: c.borderTopWidth, bg: c.backgroundColor };
    });
    expect(s.border).toBe("0px");
    // transparent oder gar nicht gesetzt — die Quest liegt im Licht,
    // nicht auf einer Flaeche.
    expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(s.bg);
  });

  test("Amber kommt auf dem Dashboard genau einmal als Textfarbe vor", async ({ page }) => {
    await page.goto("/dashboard");
    const count = await page.evaluate(() => {
      const amber = "rgb(240, 165, 0)";
      return Array.from(document.querySelectorAll("main *")).filter(
        (n) => getComputedStyle(n).color === amber,
      ).length;
    });
    expect(count).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/daily-quest.spec.ts -g Lichtkegel`
Expected: FAIL — `quest-title` existiert nicht.

- [ ] **Step 3: Die Lichtquelle in `globals.css` definieren**

Den Block `@keyframes quest-breathe` und `.quest-card-breathing` **ersetzen**:

```css
/* ─── Der Lichtkegel ────────────────────────────────────────────────────────
 * Die eine Lichtquelle pro Seite. Kein Rahmen, keine Flaeche — ein weiter,
 * weicher Wash von oben. Die Keule ist absichtlich breit: eine engere
 * Version liest als Fleck hinter der Schrift statt als Licht.
 */
.lichtkegel {
  position: relative;
  isolation: isolate;
}
.lichtkegel::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -6rem;
  width: min(190%, 64rem);
  height: 30rem;
  transform: translateX(-50%);
  background: radial-gradient(ellipse 55% 48% at 50% 46%,
    color-mix(in srgb, var(--amber) 11%, transparent) 0%,
    color-mix(in srgb, var(--amber) 7%,  transparent) 26%,
    color-mix(in srgb, var(--amber) 3%,  transparent) 48%,
    transparent 84%);
  pointer-events: none;
  z-index: -1;
}
```

- [ ] **Step 4: `daily-quest-card.tsx` auf das Licht umbauen**

Zuerst in `app/(app)/dashboard/page.tsx` das Greeting-`h1` aus Task 6 Step 3b zu `<p>` machen (Klassen unverändert) — ab jetzt liefert die Quest die `h1`, und zwei `h1` auf einer Seite wären falsch.

Dann in `daily-quest-card.tsx`: die äußere Fläche der Karte verliert Rahmen, Hintergrund und Schatten. Der Container bekommt `className="lichtkegel"` und `data-testid="quest-light"`. Der Titel wird:

```tsx
        <h1
          data-testid="quest-title"
          className="m-0 max-w-[26ch] font-[family-name:var(--font-display)] font-normal
                     text-[clamp(1.75rem,4.1vw,2.85rem)] leading-[1.08] tracking-[-0.022em]
                     text-[var(--ink)] text-balance"
          style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 130' }}
        >
          {quest.title}
        </h1>
```

`fontVariationSettings` ist der einzige verbleibende Inline-Style in dieser Datei — CSS-Custom-Properties können keine Variation-Achsen tragen, und die Ratsche zählt ihn, deshalb wird die Baseline in Step 8 gesenkt statt bei Null erwartet.

**Wichtig für den Leerzustand:** `daily-quest-card.tsx` hat drei Zustände — Quest offen, Quest erledigt, keine Quest (`quest_no_quest`). **Alle drei** müssen dasselbe `<h1 data-testid="quest-title">` rendern, sonst hat die Seite im Leerzustand keine `h1` und `e2e/dashboard.spec.ts:15` schlägt fehl. Im Leerzustand steht dort der `quest_no_quest`-Text, im erledigten Zustand der Titel mit `line-through` und `text-[var(--ink-3)]`.

Die Handlungszeile wird Text, nicht Knöpfe. Genau eine Handlung trägt Amber:

```tsx
        <div className="flex flex-wrap items-center gap-6 font-[family-name:var(--font-ui)] text-sm">
          <Link href="/focus" className="font-medium text-[var(--amber)] no-underline">
            {t("quest_start")}
          </Link>
          <button type="button" onClick={handleComplete}
            className="border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer">
            {t("quest_complete_btn")}
          </button>
          <button type="button" onClick={handleBreakdown}
            className="border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer">
            {t("quest_breakdown")}
          </button>
          <button type="button" onClick={handlePostpone} disabled={postponesLeft === 0}
            className="border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-40">
            {t("quest_postpone_btn")}
          </button>
        </div>
```

Die bisherigen amberfarbenen Elemente der Karte — Rahmen, Eyebrow-Label, Bonus-Chip — verlieren Amber und werden `var(--ink-3)`. Sonst reißt der Test aus Step 1 („genau einmal").

- [ ] **Step 5: Zwei neue i18n-Keys in alle sieben Locales**

`quest_start` und `quest_breakdown` im Namespace `dashboard`:

| Key | de | en | es | fr | nl | ru | zh |
|---|---|---|---|---|---|---|---|
| `quest_start` | jetzt anfangen | start now | empezar ahora | commencer | nu beginnen | начать сейчас | 现在开始 |
| `quest_breakdown` | aufteilen | break it down | dividir | découper | opsplitsen | разбить | 拆分 |

Gleichzeitig `focus_cta` und `focus_cta_hint` aus allen sieben Dateien entfernen (siehe Task 6 Step 5).

- [ ] **Step 6: Prüfungen laufen lassen**

Run: `npm run check:i18n`
Expected: PASS.
Run: `npx playwright test e2e/daily-quest.spec.ts e2e/dashboard.spec.ts`
Expected: PASS. Schlägt „genau einmal" fehl, listet der Test die Zahl — dann trägt noch ein Element Amber.

- [ ] **Step 7: In beiden Themes ansehen**

Run: `npx playwright test e2e/daily-quest.spec.ts -g Lichtkegel --headed`
Prüfen: Das Licht liest als Wash von oben, nicht als Fleck hinter der Schrift. Dann `data-theme="light"` in den DevTools setzen und dasselbe prüfen — im Light Mode muss das Licht sichtbar, aber schwächer sein.

- [ ] **Step 8: Ratsche senken und committen**

Run: `npm run check:design -- --update`
Expected: die Gesamtzahl sinkt deutlich (`daily-quest-card.tsx` hatte 20 Inline-Styles, jetzt 1).

```bash
git add components/dashboard/daily-quest-card.tsx app/globals.css e2e/daily-quest.spec.ts messages/ scripts/design-baseline.json
git commit -m "feat(daily-quest): die Quest wird die Lichtquelle — kein Kasten, Fraunces, eine Amber-Handlung"
```

---

### Task 8: Quick Wins als nackte Liste mit drei Aufwandsstufen

**Files:**
- Modify: `components/dashboard/quick-wins-section.tsx`
- Modify: `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: Token aus Task 1, `QuickWinTask` (bestehend, unverändert: `id`, `title`, `estimatedMinutes`, `coinValue`, `energyLevel`, …).
- Produces: `<li data-testid="quick-win-row" data-effort="small|medium|large">` pro Zeile.

- [ ] **Step 1: Den Prüftest schreiben**

An `e2e/dashboard.spec.ts` anhängen:

```ts
test.describe("Aufwandsstufen", () => {
  test("die Schriftgroesse folgt der geschaetzten Dauer", async ({ page }) => {
    await page.goto("/dashboard");
    const rows = page.getByTestId("quick-win-row");
    const n = await rows.count();
    test.skip(n === 0, "keine Quick Wins im Testdatensatz");

    const seen = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      const effort = await row.getAttribute("data-effort");
      const size = await row
        .getByTestId("quick-win-title")
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      if (effort) seen.set(effort, size);
    }
    // Groessere Stufe → groessere Schrift, und nie unter 14px.
    for (const size of seen.values()) expect(size).toBeGreaterThanOrEqual(14);
    if (seen.has("small") && seen.has("medium")) {
      expect(seen.get("medium")!).toBeGreaterThan(seen.get("small")!);
    }
    if (seen.has("medium") && seen.has("large")) {
      expect(seen.get("large")!).toBeGreaterThan(seen.get("medium")!);
    }
  });

  test("die Liste hat keine Kaesten", async ({ page }) => {
    await page.goto("/dashboard");
    const rows = page.getByTestId("quick-win-row");
    const n = await rows.count();
    test.skip(n === 0, "keine Quick Wins im Testdatensatz");
    const s = await rows.first().evaluate((el) => {
      const c = getComputedStyle(el);
      return { bg: c.backgroundColor, radius: c.borderTopLeftRadius };
    });
    expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(s.bg);
    expect(s.radius).toBe("0px");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx playwright test e2e/dashboard.spec.ts -g Aufwandsstufen`
Expected: FAIL — `quick-win-row` existiert nicht.

- [ ] **Step 3: Die Aufwandsstufe als reine Funktion einführen**

Oben in `components/dashboard/quick-wins-section.tsx`:

```tsx
/**
 * Ordnet einer Aufgabe eine von drei Aufwandsstufen zu. Die Stufe steuert die
 * Schriftgroesse: der Aufwand ist sichtbar, bevor man die Zeile liest.
 *
 * Drei Stufen, nicht stufenlos — eine stufenlose Skala kollidiert mit
 * Mindestgroessen und Zoom.
 *
 * estimatedMinutes ist ein Enum, kein freier Integer: 5 | 15 | 30 | 60 | null
 * (lib/validators/index.ts). Die Stufen bilden darauf ab:
 *   5 → small,  15 und 30 → medium,  60 → large,  null → medium.
 *
 * @param minutes - Geschaetzte Dauer (5, 15, 30, 60) oder null
 * @returns "small" (≤5 min), "medium" (≤30 min oder ohne Schaetzung), "large" (>30 min)
 */
export function effortStep(minutes: number | null): "small" | "medium" | "large" {
  if (minutes === null) return "medium";
  if (minutes <= 5) return "small";
  if (minutes <= 30) return "medium";
  return "large";
}

const EFFORT_TEXT = {
  small: "text-[0.875rem]",
  medium: "text-[1rem]",
  large: "text-[1.25rem]",
} as const;
```

- [ ] **Step 4: Die Liste umbauen**

Die Kachel- oder Kastendarstellung durch eine `<ul>` ohne Flächen ersetzen:

```tsx
      <p className="font-[family-name:var(--font-mono)] text-[0.625rem] uppercase tracking-[0.2em] text-[var(--ink-3)]">
        {t("quick_wins_hint")}
      </p>
      <ul className="m-0 list-none p-0">
        {tasks.map((task) => {
          const step = effortStep(task.estimatedMinutes);
          return (
            <li
              key={task.id}
              data-testid="quick-win-row"
              data-effort={step}
              className="flex items-baseline gap-4 border-0 bg-transparent
                         border-t border-t-[var(--hairline)] first:border-t-0 py-2.5"
            >
              <button
                type="button"
                onClick={() => handleComplete(task.id)}
                aria-label={t("quick_win_complete_aria", { title: task.title })}
                className="border-0 bg-transparent p-0 text-[var(--ink-3)] hover:text-[var(--done)] cursor-pointer"
              >
                ○
              </button>
              <span
                data-testid="quick-win-title"
                className={cn("flex-1 min-w-0 text-[var(--ink-2)]", EFFORT_TEXT[step])}
              >
                {task.title}
              </span>
              <span className="shrink-0 font-[family-name:var(--font-mono)] text-[0.6875rem] text-[var(--ink-3)] tabular-nums">
                {task.estimatedMinutes ?? "—"} min
              </span>
            </li>
          );
        })}
      </ul>
```

`cn` aus `@/lib/utils` importieren. `AnimatePresence`/`motion` für das Verschwinden abgehakter Zeilen bleibt erhalten — es ist eine bestehende, sinnvolle Rückmeldung.

- [ ] **Step 5: Tests laufen lassen**

Vorher im Test zwei Aufgaben anlegen, damit die Stufen überhaupt auftreten — `createTask` aus `e2e/helpers/api.ts`, mit **gültigen** Enum-Werten:

```ts
    const a = await createTask(request, `Klein ${Date.now()}`, { estimatedMinutes: 5 });
    const b = await createTask(request, `Mittel ${Date.now()}`, { estimatedMinutes: 15 });
    // … Assertions …
    await deleteTask(request, a.id);
    await deleteTask(request, b.id);
```

Run: `npx playwright test e2e/dashboard.spec.ts`
Expected: PASS.

**Warum nur zwei Stufen geprüft werden:** die Quick-Wins-Abfrage in `app/(app)/dashboard/page.tsx` filtert `lte(tasks.estimatedMinutes, 15)`. Auf dem Dashboard sind damit nur `small` (5) und `medium` (15) erreichbar — `large` (60) kann dort nie erscheinen. Die dritte Stufe wird erst geprüft, wenn `/tasks` migriert wird. Der Test aus Step 1 ist deshalb so geschrieben, dass er nur vorhandene Stufen vergleicht.

- [ ] **Step 6: Ratsche senken und committen**

Run: `npm run check:design -- --update`

```bash
git add components/dashboard/quick-wins-section.tsx e2e/dashboard.spec.ts scripts/design-baseline.json
git commit -m "feat(ui): Quick Wins als nackte Liste — Schriftgröße zeigt den Aufwand"
```

---

### Task 9: Design-System-Seite, Doku, Screenshots

**Files:**
- Modify: `app/(docs)/design-system/page.tsx`
- Rewrite: `docs/design-system.md`
- Modify: `CHANGELOG.md`
- Replace: `public/screenshots/01-dashboard.png`, `03-habits.png`

**Interfaces:**
- Consumes: alles Vorherige.
- Produces: nichts, was Code liest.

- [ ] **Step 1: Die Seite zur echten Referenz machen**

`app/(docs)/design-system/page.tsx` zeigt am Ende: die fünf Flächenstufen (Task 4), die drei Button-Varianten (Task 5), die vier Radien, die drei Schriftrollen mit Fraunces' Achsen, die Amber-Regel als Text, und die drei Aufwandsstufen als Beispielliste. Alle `data-testid`s aus Task 4 und 5 bleiben — sie sind jetzt Testoberfläche, nicht Dekoration.

- [ ] **Step 2: `docs/design-system.md` neu schreiben**

Die bestehende Datei beschreibt Komponenten, die es nicht mehr gibt (`Card`) und Schriften, die ersetzt sind (Lora, DM Sans). Neu, in dieser Reihenfolge: die Designthese in zwei Sätzen, die Flächenleiter als Tabelle mit beiden Themes, die vier Radien, die Amber-Regel, die drei Schriftrollen, `Surface`/`Button`/`Badge` mit Signaturen, und ein Verweis auf `npm run check:design` als das, was die Regeln durchsetzt. Ein Link auf die Spec.

- [ ] **Step 3: `CHANGELOG.md` unter `[Unreleased]`**

```markdown
### Changed
- Visuelles System auf Tokens umgestellt: vier Flächenstufen statt Rahmen und
  Schatten, Amber nur noch als Licht und nur einmal pro Seite, Radius auf vier
  Werte reduziert.
- Schriften: Fraunces ersetzt Lora, Instrument Sans ersetzt DM Sans.
  JetBrains Mono bleibt für Aufgaben- und Zahlentext.
- Dashboard: Stat-Tiles und Quick-Links entfernt (standen doppelt zur Navbar
  und Sidebar); Energie-Karte und Insight-Chip zu einer Metazeile
  zusammengefasst. Die Daily Quest ist jetzt das einzige belichtete Element.
- Quick Wins zeigen den geschätzten Aufwand über die Schriftgröße.

### Removed
- `Card`-Komponente — ersetzt durch `Surface` ohne Rahmen und Schatten.
- Button-Varianten `secondary`, `ghost`, `outline`, `success` — es bleiben
  `primary`, `quiet`, `danger`.

### Added
- `npm run check:design` — Ratsche gegen hartkodierte Farben, Radien
  außerhalb der Skala und neue Inline-Styles. Läuft in CI.
```

- [ ] **Step 4: `docs-site/features.md` prüfen**

Run: `grep -n "Stat\|Overview\|Quick link\|5 Minuten\|5 minutes\|Focus Mode" docs-site/features.md`

Jede Fundstelle, die Bedienschritte über entfernte Elemente beschreibt, umschreiben. Beschreibt die Datei nur Funktionen und keine Klickwege, bleibt sie unverändert — die Funktionen sind alle noch da, nur anders dargestellt.

- [ ] **Step 5: Screenshots neu aufnehmen**

Dev-Server starten, anmelden, bei 1280×800 aufnehmen.

- `01-dashboard.png` ersetzen. Er ist doppelt veraltet: er zeigt das alte Kastensystem **und** einen „I only have 5 minutes"-Block, den es im Code schon vorher nicht mehr gab.
- `03-habits.png` ersetzen. Er zeigt derzeit die **Topics**-Seite, nicht Habits — hier die echte Habits-Seite aufnehmen.
- `02-topics.png`, `04-stats.png`, `05-wishlist.png` bleiben: diese Seiten werden erst in den Spec-Schritten 4 bis 6 umgebaut. Sie zeigen bis dahin korrekt den Ist-Zustand.

- [ ] **Step 6: Alles laufen lassen**

```bash
npm run check:i18n
npm run check:design -- --selftest
npm run check:design
npm run build
npx playwright test
```
Expected: alles PASS.

- [ ] **Step 7: Commit und PR**

```bash
git add "app/(docs)/design-system/page.tsx" docs/design-system.md CHANGELOG.md public/screenshots/
git commit -m "docs(ui): Design-System-Doku und Screenshots auf Lichtkegel aktualisiert"
git push -u origin design/lichtkegel-impl
gh pr create --draft --base main --title "feat(ui): Lichtkegel — Token-Fundament und Dashboard-Pilot"
```

---

## Was dieser Plan nicht umfasst

Die Spec-Schritte 4 bis 6 (Tasks/Topics, Wishlist/Progress/Stats/Focus/Habits, Settings/Admin/Auth/Legal) werden **erst nach dem Pilot geplant**. Zwei Fragen sind vorher offen und nur am fertigen Dashboard zu beantworten:

1. Tragen die drei Aufwandsstufen, oder konkurriert die große Stufe mit der Quest? Rückfallpfad laut Spec: die große Stufe fällt weg, es bleiben zwei.
2. Wie viel Arbeit ist eine Seite wirklich? Die Ratschenzahlen nach Task 8 geben die erste belastbare Schätzung — die drei schwersten Dateien sind `app/(app)/admin/page.tsx` (91 Inline-Styles), `components/progress/progress-tabs.tsx` (89) und `app/(legal)/datenschutz/page.tsx` (80).

Die Alias-Schicht aus Task 1 Step 4 hält die 130 nicht migrierten Dateien am Leben. Sie fällt weg, wenn die Ratsche bei Null steht — nicht vorher.
