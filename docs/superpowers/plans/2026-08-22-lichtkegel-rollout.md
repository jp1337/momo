# Lichtkegel II — Implementierungsplan (Phase 0 + mitgeführte Bugs + Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Lücken der Lichtkegel-Spec schließen — Maß, Listen-Primitive, Farbregeln, Leerzustände, Ankunft — sie als Tests durchsetzen und die vier Seiten der Phase 1 (`/tasks`, `/focus`, `/topics`, `/progress`) darauf migrieren.

**Architecture:** Phase 0 zuerst und allein: drei Layout-Tokens plus ein `PageFrame` (Lesespalte + optionaler Rand), ein `List`/`Row`-Primitive, das aus der bereits gebauten Quick-Wins-Zeile extrahiert wird, ein `EmptyState`, eine vierte Ratschen-Kategorie `spacing` und vier Playwright-Zähler (Amber, Fraunces, Kästen, Maß). Erst danach Phase 1: jede Seite baut auf `PageFrame` + `List`, `task-item.tsx` (803 Zeilen) wird dabei zerlegt. Die mitgeführten Bugs sind eigene Tasks, weil keiner davon zum Entwurf gehört — inklusive des Versions-Defekts, der beim Schreiben dieses Plans dazukam.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 (`@theme inline`), next-themes, next-intl v4, Motion, Playwright, Vitest (Node-Umgebung, DB-gestützt, nur `.test.ts`), Node-Scripts (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md`
(Vorgänger, weiter gültig: `docs/superpowers/specs/2026-08-21-lichtkegel-design.md`)

## Umfang dieses Plans

Die Spec ordnet die Arbeit in fünf Phasen. Dieser Plan deckt **Phase 0 und
Phase 1** ab, plus die Bugs aus §10. Grund: Phase 0 allein liefert keine
sichtbare Software, und die Spec verlangt ausdrücklich „Phase 0 zuerst und
allein — ohne die Tests migriert Phase 1 gegen keine Zusicherung". Phase 0 + 1
zusammen ist die kleinste Einheit, die funktionierende, prüfbare Software
ergibt.

**Phasen 2–4 bekommen eigene Plandokumente.** Sie sind mechanische
Wiederholung von Phase 1 gegen dann vorhandene Primitives; sie in dieses
Dokument zu ziehen würde es verdoppeln, ohne eine Entscheidung zu klären.

## Global Constraints

Jede Task-Anforderung enthält diesen Abschnitt implizit.

- **Farbe nur über `var(--…)`.** Kein Hex, kein `rgb()`/`hsl()`, kein
  `white`/`black`, keine Tailwind-Palettenutility. Einzige Ausnahme: die
  frei gewählte Nutzer-Themenfarbe, und die ausschließlich als **6-px-Punkt**
  (Task 4).
- **Radius nur über vier Token:** `--radius-sm` 7px, `--radius-md` 11px,
  `--radius-lg` 14px, `--radius-pill` 999px.
- **Abstand nur aus der Skala `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72`** — in
  Tailwind also `p|m|gap|space-*` mit `0 · px · auto · 1 · 2 · 3 · 4 · 6 · 8 ·
  12 · 18` oder `[var(--space-N)]`. Keine zweite, „bessere" Skala.
- **Amber:** höchstens einmal pro Seite, gezählt **über das gesamte Dokument**
  (nicht `main`), und nur als Text oder weicher Wash — **nie als Fläche, nie
  als Rahmen**. Der Rand (`--rail`) trägt nie Amber.
- **Fraunces genau einmal pro Seite** in großer Größe, innerhalb von `main`.
  Abschnittsüberschriften sind Mono-Eyebrows (`0.6875rem`, versal,
  `tracking-[0.16em]`, `--ink-3`).
- **Null umrahmte Inhaltsflächen.** Eine Kante nur an einer echten Affordanz
  (Eingabe, Button, Hover). Keine Chips um Text.
- **Keine Inhaltsspalte breiter als `--measure`.**
- **`--done` heißt ausschließlich „erledigt"**, `--danger` ausschließlich
  Zerstörung und Überfälligkeit.
- **Keine Schatten** außer `--shadow-overlay` (Dialog, Popover).
- **7 Locales.** Jeder neue oder geänderte i18n-Key muss in `messages/de.json`,
  `en.json`, `es.json`, `fr.json`, `nl.json`, `ru.json`, `zh.json` stehen.
  `npm run check:i18n` muss grün sein.
- **Dark und Light müssen beide funktionieren.** Dark ist `:root`, Light
  `[data-theme="light"]`.
- **TypeScript strict, kein `any`.** Bei Unklarheit `unknown` und einengen.
- **Die Baseline darf nur fallen.** `npm run check:design` ist eine Ratsche;
  ein echter Rückgang wird mit `-- --update` festgeschrieben.
- **Conventional Commits** mit Scope aus der CLAUDE.md-Liste. Nach jeder Task
  committen.
- **`main` ist branch-protected.** Die Arbeit läuft auf
  `design/lichtkegel-impl` und geht per PR.
- **Playwright braucht einen laufenden Dev-Server** und `DATABASE_URL`:

  ```bash
  # Terminal 1
  npm run dev
  # Terminal 2
  DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test <datei>
  ```

- **`PLAYWRIGHT_TEST_PASSWORD` darf NICHT gesetzt sein.** Sobald die Variable
  existiert, hängt `lib/auth.ts` den Credentials-Provider an, Auth.js verwirft
  die gesamte Konfiguration mit `UnsupportedStrategy` (Credentials mit
  `session.strategy: "database"`), und jede geschützte Route leitet auf
  `/login`. `e2e/global.setup.ts` legt die Session direkt in der DB an.
- **Jede Phase endet mit einem Chrome-Review** beider Themes bei 1440 px und
  375 px. Grüne Tests sind kein Beleg dafür, dass ein Entwurf funktioniert —
  im Pilot kamen fünf falsche Festlegungen durch saubere Reviews.

---

## Vorgefundener Zustand (gemessen 2026-08-22)

| Befund | Wert | Quelle |
|---|---|---|
| Ratschen-Baseline | 1934 Verstöße über 115 Dateien | `scripts/design-baseline.json` |
| Neue Kategorie `spacing` würde ergänzen | **285 Verstöße in 69 Dateien** | eigene Messung, s. u. |
| häufigste Abstandsverstöße | `py-1.5` (39×), `gap-1.5` (38×), `py-0.5` (29×), `p-5` (22×), `py-2.5` (21×) | dieselbe Messung |
| Dateien, die `components/ui/surface` importieren | 2 von 136 `.tsx` | `grep` |
| `main` und Tag `v0.6.0` tragen | `"version": "0.6.0"` | `package.json` |
| GHCR `:latest`, gebaut 2026-08-22 05:07 | Revision `83ced1f` (HEAD von main) | OCI-Config-Labels |
| Live-Instanz serviert | **Lora + DM Sans** — die Schriften von vor Lichtkegel | `curl https://momotask.app/` |

Die Zeile mit den 285 ist der Grund, warum Task 2 die Baseline nicht senkt
sondern neu legt: eine erweiterte Regel ist der eine legitime Grund für eine
höhere Zahl, und der dokumentierte Weg dafür ist Baseline löschen +
`--update`, nicht `--admit`.

### Der Versions-Defekt (Analyse, 2026-08-22)

Der Admin-Block meldet „Installierte Version: v0.5.0 — Momo ist aktuell, du
verwendest die neueste Version. Geprüft: 11:18". Beide Sätze sind zusammen
unmöglich; gemessen ist die Lage:

| Frage | Befund |
|---|---|
| Ist `package.json` auf main falsch? | Nein — `0.6.0`, auch im Tag `v0.6.0` |
| Kennt GitHub das Release? | Ja — `releases/latest` → `tag_name: v0.6.0`, publiziert 2026-08-21 07:40 |
| Ist `:latest` alt? | Nein — gebaut 2026-08-22 05:07 aus `83ced1f` |
| Hat die Publish-Pipeline versagt? | Nein — die letzten sechs Läufe inkl. `deploy` sind grün |
| Läuft live wirklich 0.5.0? | **Ja** — die Live-Seite serviert Lora und DM Sans, die Schriften vor Lichtkegel |
| Ist der Checker-Code zwischen 0.5.0 und HEAD verschieden? | Nein — `git diff v0.5.0 HEAD -- lib/update-checker.ts` ist leer |

Damit sind es **zwei** Defekte, und nur einer davon liegt im Repository:

**(1) Der Rollout greift nicht.** Der `deploy`-Job postet an Watchtower und
behandelt „HTTP 2xx" als „ausgerollt". Der Container auf dem Live-Host ist
trotzdem der vom Mai. Nichts in der Pipeline und nichts an der Anwendung kann
das bemerken: `/api/health` gibt keine Version zurück, und die einzige Stelle,
die eine Version zeigt, steht hinter Admin-Login.

**(2) „Momo ist aktuell" ist eine Lüge mit frischem Zeitstempel.** Der
Checker hat **zwei** Cache-Schichten übereinander:

```
Modul-Cache (24 h)  →  fetch(… , { next: { revalidate: 86400 } })  →  GitHub
```

`checkForUpdates()` läuft nur, wenn jemand die Admin-Seite öffnet — also
selten. Läuft sie nach Ablauf des Modul-Caches, ruft sie `fetch`; der
Next-Data-Cache liefert bei abgelaufenem Eintrag nach
Stale-while-revalidate **den alten Wert** und erneuert erst im Hintergrund.
Der alte Wert stammt vom letzten Besuch — hier: von vor dem 0.6.0-Release.
Dieser veraltete Wert wird dann mit `checkedAt: new Date()` gestempelt und für
weitere 24 h im Modul-Cache festgehalten. Ergebnis: die Antwort ist immer
**einen Besuch hinterher** und trägt immer einen frischen Zeitstempel.

Der bestehende Test hat das nicht gesehen, weil er `global.fetch` ersetzt —
ein Double hat keine Stale-while-revalidate-Semantik. Außerdem rendert die
UI `updateAvailable === false` unabhängig davon, ob `latestVersion` bekannt
ist: „wir wissen es nicht" liest sich als Beruhigung.

Task 8 behebt (2) vollständig und macht (1) sichtbar und prüfbar. Die
Ursache von (1) selbst liegt in der Host-Konfiguration und nicht im
Repository — der Plan liefert die Erkennung, nicht den Watchtower-Fix.

---

## Dateistruktur

**Neu:**

| Datei | Verantwortung |
|---|---|
| `components/ui/page-frame.tsx` | Maß, Rand, Rhythmus: eine Lesespalte (`--measure`), ein optionaler Rand (`--rail`), als Block zentriert |
| `components/ui/list.tsx` | `List` + `Row` + `effortStep` + `EFFORT_TEXT` — die eine Zeile für die ganze App |
| `components/ui/empty-state.tsx` | leere Sammlung: eine Mono-Zeile, eine stille Handlung, kein Kasten |
| `components/layout/feather-mark.tsx` | die Feder als Inline-SVG mit `currentColor` statt amberfarbenem Bild |
| `components/tasks/task-row.tsx` | eine Aufgabenzeile auf `Row` — Titel, Eyebrow, Datum, Punkt |
| `components/tasks/task-row-actions.tsx` | die Aktionen einer Zeile (Bearbeiten, Löschen, Snooze, Aufteilen, Verschieben) |
| `components/tasks/use-task-swipe.ts` | die Wisch-Logik als Hook, aus `task-item.tsx` gelöst |
| `components/tasks/task-groups.ts` | reine Gruppierung nach Priorität (vitest-fähig, kein JSX) |
| `components/tasks/tasks-rail.tsx` | Zähler und Filter im Rand von `/tasks` |
| `lib/update-status.ts` | reine Entscheidungsfunktion für den Versions-Block |
| `e2e/helpers/design-count.ts` | die vier Zähler (Amber, Fraunces, Kästen, Maß) |
| `e2e/design-rules.spec.ts` | die vier Regeln, pro migrierter Seite, in beiden Themes |
| `__tests__/update-status.test.ts` | Tests für die Entscheidungsfunktion |
| `__tests__/task-groups.test.ts` | Tests für die Prioritätsgruppierung |

**Geändert:** `app/globals.css`, `scripts/check-design-tokens.mjs`,
`scripts/design-baseline.json`, `components/dashboard/quick-wins-section.tsx`,
`components/dashboard/daily-quest-card.tsx`, `app/(docs)/design-system/page.tsx`,
`components/layout/navbar.tsx`, `components/layout/coin-counter.tsx`,
`components/layout/level-badge.tsx`, `components/theme-toggle.tsx`,
`messages/*.json` (7×), `components/progress/progress-tabs.tsx`,
`lib/update-checker.ts`, `app/api/health/route.ts`, `app/(app)/admin/page.tsx`,
`.github/workflows/build-and-publish.yml`, `app/(app)/tasks/page.tsx`,
`components/tasks/task-list.tsx`, `components/shared/search-filter-bar.tsx`,
`app/focus/layout.tsx`, `components/focus/focus-mode-view.tsx`,
`app/(app)/topics/page.tsx`, `components/topics/topics-grid.tsx`,
`components/topics/topic-card.tsx`, `app/(app)/progress/page.tsx`,
`CHANGELOG.md`, `docs/design-system.md`.

**Gelöscht:** `components/tasks/task-item.tsx` (am Ende von Task 9, wenn
`task-row.tsx` alle Aufrufer bedient).

---

### Task 1: Maß, Rand, Rhythmus — Layout-Tokens und `PageFrame`

Ohne Spaltenmaß hat jede Seite ihr eigenes: `/dashboard` 1024 px, `/tasks`
896 px, `/topics` ein 3-Spalten-Raster mit einer Karte. Diese Task legt das
Maß fest und gibt ihm ein Primitive; angewandt wird es ab Task 9.

**Files:**
- Modify: `app/globals.css` (Block `:root,[data-theme="dark"]`; Block `@theme inline`)
- Create: `components/ui/page-frame.tsx`
- Modify: `app/(docs)/design-system/page.tsx` (Abschnitt „Maß und Rand" mit Test-Handles)
- Modify: `e2e/design-tokens.spec.ts`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - CSS: `--measure: 40rem`, `--rail: 13rem`, `--gutter: 3rem`, Tailwind-Breakpoint `rail` (1100px).
  - `export function PageFrame(props: { children: React.ReactNode; rail?: React.ReactNode; className?: string }): JSX.Element`
  - DOM-Vertrag für alle Tests: die Lesespalte trägt `data-column`, der Rand `data-rail`.

- [ ] **Step 1: Die Prüftests schreiben**

In `e2e/design-tokens.spec.ts` die Konstante `REQUIRED` um die drei neuen
Token erweitern:

```ts
const REQUIRED = [
  "--ground", "--raised", "--hairline",
  "--ink", "--ink-2", "--ink-3",
  "--amber", "--on-amber", "--done", "--danger",
  "--radius-sm", "--radius-md", "--radius-lg", "--radius-pill",
  "--shadow-overlay",
  "--measure", "--rail", "--gutter",
];
```

Und am Ende derselben Datei anfügen:

```ts
test.describe("Maß und Rand", () => {
  test("die drei Layout-Token haben die Werte der Spec", async ({ page }) => {
    await page.goto("/design-system");
    const t = await readTokens(page);
    expect(t["--measure"]).toBe("40rem");
    expect(t["--rail"]).toBe("13rem");
    expect(t["--gutter"]).toBe("3rem");
  });

  test("die Lesespalte ist bei 1440 px genau 640 px breit", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const box = await page.getByTestId("frame-with-rail").locator("[data-column]").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(641);
    expect(box!.width).toBeGreaterThanOrEqual(639);
  });

  test("der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-with-rail");
    const col = (await frame.locator("[data-column]").boundingBox())!;
    const rail = (await frame.locator("[data-rail]").boundingBox())!;
    expect(rail.x).toBeGreaterThan(col.x + col.width - 1);
    expect(rail.x - (col.x + col.width)).toBeGreaterThanOrEqual(47);
    expect(rail.x - (col.x + col.width)).toBeLessThanOrEqual(49);
    expect(rail.width).toBeLessThanOrEqual(209);
  });

  // Der Umbruch der Spec: unter 1100 px fällt der Rand UNTER den Inhalt.
  // 1024 px ist bewusst gewählt — es ist Tailwinds `lg`, und genau der
  // Standard-Breakpoint wäre der falsche Umbruchpunkt gewesen.
  test("unter 1100 px fällt der Rand unter den Inhalt", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/design-system");
    const frame = page.getByTestId("frame-with-rail");
    const col = (await frame.locator("[data-column]").boundingBox())!;
    const rail = (await frame.locator("[data-rail]").boundingBox())!;
    expect(rail.y).toBeGreaterThan(col.y + col.height - 1);
  });

  test("ohne Rand ist der Rahmen genau eine Lesespalte breit", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    const box = await page.getByTestId("frame-no-rail").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(641);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-tokens.spec.ts -g "Maß und Rand"`
Expected: FAIL — die Token liefern `""`, und `getByTestId("frame-with-rail")` findet nichts.

- [ ] **Step 3: Die Token in `app/globals.css` ergänzen**

Im Block `:root, [data-theme="dark"]` direkt hinter dem Abstands-Block
(`--space-18: 72px;`) einfügen:

```css
  /* ─── Maß, Rand, Rinne ───────────────────────────────────────────────────
     Die Lesespalte gilt auf jeder Seite; der Rand ist optional pro Seite.
     Der Block aus Spalte + Rinne + Rand wird als GANZES zentriert (siehe
     components/ui/page-frame.tsx): auf 1440 px sind das 640 + 48 + 208 =
     896 px und je ~180 px Luft. Der Leerraum verschwindet nicht, er wird
     verteilt statt rechts geparkt.
     Bewusst NICHT theme-abhängig — ein Maß ist kein Farbwert. */
  --measure: 40rem;   /* 640px — die Lesespalte. Jede Seite. */
  --rail:    13rem;   /* 208px — die Randnotiz. Optional pro Seite. */
  --gutter:   3rem;   /*  48px — dazwischen */
```

Im Block `@theme inline` hinter den Font-Familien einfügen:

```css
  /* Der Umbruchpunkt des Randes. 1100px, nicht Tailwinds lg (1024px):
     unter 1100 px reichen 640 + 48 + 208 plus Seitenpolster nicht mehr,
     ohne die Lesespalte zu stauchen. Erzeugt die Variante `rail:`. */
  --breakpoint-rail: 1100px;
```

- [ ] **Step 4: `components/ui/page-frame.tsx` anlegen**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * PageFrame — Maß, Rand, Rhythmus für eine Seite.
 *
 * In die Lesespalte gehört, was der Nutzer *tut*. In den Rand gehört, was
 * die App *über* seinen Tag sagt: Zähler, Summen, Filter. Der Rand trägt
 * nie Amber — sonst wäre er eine zweite Lichtquelle.
 *
 * Der Rand ist optional, weil die Seiten wirklich verschieden sind:
 * `/focus` ist eine Bühne, auf der eine Sache zählt, und eine erzwungene
 * Randspalte auf einer Bühne wäre dieselbe Gleichmacherei, die dieser
 * Entwurf abschafft.
 *
 * Umbruch: unter 1100 px (`rail:`) fällt der Rand unter den Inhalt und
 * legt seine Fakten in eine umbrechende Zeile; unter 640 px (`sm:`)
 * stapelt er am Seitenende.
 */
export interface PageFrameProps {
  /** Die Lesespalte — der Inhalt, mit dem der Nutzer arbeitet. */
  children: React.ReactNode;
  /** Die Randnotiz. Weglassen heißt: diese Seite hat keinen Rand. */
  rail?: React.ReactNode;
  className?: string;
}

/**
 * Zentriert den Block aus Lesespalte und optionalem Rand im Inhaltsbereich.
 *
 * @param children - Inhalt der Lesespalte
 * @param rail - Inhalt der Randspalte, oder nichts
 * @param className - zusätzliche Klassen für den äußeren Block
 * @returns Der Seitenrahmen
 */
export function PageFrame({ children, rail, className }: PageFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-8",
        rail
          ? "max-w-[calc(var(--measure)_+_var(--gutter)_+_var(--rail))] rail:flex-row rail:gap-[var(--gutter)]"
          : "max-w-[var(--measure)]",
        className,
      )}
    >
      <div data-column className="flex w-full min-w-0 max-w-[var(--measure)] flex-col gap-8">
        {children}
      </div>
      {rail ? (
        <aside
          data-rail
          className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6 rail:w-[var(--rail)] rail:shrink-0 rail:flex-col rail:gap-4"
        >
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Test-Handles auf `/design-system` anlegen**

In `app/(docs)/design-system/page.tsx` den Import ergänzen und vor dem
Abschnitt „Effort steps" einen neuen Abschnitt einfügen:

```tsx
import { PageFrame } from "@/components/ui/page-frame";
```

```tsx
      {/* ── Maß und Rand ──────────────────────────────────────────────────
          Die Handles frame-with-rail / frame-no-rail liest
          e2e/design-tokens.spec.ts; nicht umbenennen. */}
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Maß und Rand
        </h2>
        <p className="max-w-[60ch] text-[var(--ink-2)]">
          640 px Lesespalte, 48 px Rinne, 208 px Randnotiz — als Block
          zentriert, nicht links geklebt. Unter 1100 px fällt der Rand unter
          den Inhalt.
        </p>
        <div data-testid="frame-with-rail">
          <PageFrame
            rail={
              <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
                Serie · 4 Tage
              </p>
            }
          >
            <p className="m-0 text-[var(--ink-2)]">
              Die Lesespalte. Hier steht, was der Nutzer tut.
            </p>
          </PageFrame>
        </div>
        <div data-testid="frame-no-rail">
          <PageFrame>
            <p className="m-0 text-[var(--ink-2)]">
              Ohne Rand: eine Bühne, eine Sache.
            </p>
          </PageFrame>
        </div>
      </section>
```

- [ ] **Step 6: Tests laufen lassen, Erfolg prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-tokens.spec.ts`
Expected: PASS, inklusive der fünf neuen Fälle und der erweiterten
`REQUIRED`-Liste in beiden Themes.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css components/ui/page-frame.tsx "app/(docs)/design-system/page.tsx" e2e/design-tokens.spec.ts
git commit -m "feat(ui): Maß, Rand und Rinne als Token plus PageFrame-Primitive"
```

---

### Task 2: Die vierte Kategorie — `spacing` in der Ratsche

Die Abstandsskala steht seit dem 2026-08-21 in der Spec und wird von nichts
erzwungen. 285 Utilities liegen außerhalb; allein 6 px (`*-1.5`) kommt 104×
vor.

**Files:**
- Modify: `scripts/check-design-tokens.mjs`
- Modify: `scripts/design-baseline.json` (neu erzeugt)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: nichts.
- Produces: `scripts/design-baseline.json` mit vier Zählern pro Datei —
  `{ color, radius, inline, spacing }`. Jede Task, die danach Code anfasst,
  muss `npm run check:design` grün halten.

- [ ] **Step 1: Die Selbsttests schreiben**

Der Selbsttest **ist** der Test dieses Scripts. In
`scripts/check-design-tokens.mjs` in der Liste `cases` innerhalb von
`selftest()` anfügen:

```js
    // Abstandsskala: 4·8·12·16·24·32·48·72 → Tailwind 1,2,3,4,6,8,12,18.
    ['spacing', 'className="p-4 gap-6 m-0 mx-auto px-px"', 0],
    ['spacing', 'className="p-[var(--space-6)] gap-[var(--space-12)]"', 0],
    ['spacing', 'className="mt-1.5"', 1],
    ['spacing', 'className="-mx-2.5"', 1],
    ['spacing', 'className="gap-5"', 1],
    ['spacing', 'className="space-y-16"', 1],
    ['spacing', 'className="pb-[7px]"', 1],
    // Keine Fehlalarme auf Utilities, die nur mit p oder m anfangen.
    ['spacing', 'className="min-w-0 place-items-center pointer-events-none"', 0],
    ['spacing', 'className="flex-1 translate-x-2 max-w-5xl"', 0],
```

- [ ] **Step 2: Selbsttest laufen lassen, Fehlschlag prüfen**

Run: `node scripts/check-design-tokens.mjs --selftest`
Expected: FAIL — `countCategory(src, "spacing")` liefert für jeden Fall `0`,
weil `PATTERNS.spacing` nicht existiert; die fünf Verstoß-Fälle melden
`→ 0, erwartet 1`.

- [ ] **Step 3: Die Kategorie implementieren**

In `scripts/check-design-tokens.mjs`:

a) Hinter `TAILWIND_PALETTES` einfügen:

```js
// Die Abstandsskala der Spec: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px.
// In Tailwinds Basis-4-Skala sind das genau diese Stufen, plus die drei
// Werte, die keine Groesse sind (0, px, auto).
const SPACING_OK = "0|px|auto|1|2|3|4|6|8|12|18";
// Erlaubt ist zusaetzlich der direkte Token-Zugriff p-[var(--space-4)].
//
// (?![\w./]) statt \b hinter der Werteliste: \b liegt AUCH zwischen "1" und
// dem Punkt in "mt-1.5", die erlaubte "1" haette dort also den haeufigsten
// Verstoss im Repo (6px, 115 Vorkommen) freigegeben. Der Wert muss ganz zu
// Ende sein, nicht nur anfangen.
const SPACING_GUARD = `(?!(?:${SPACING_OK})(?![\\w./])|\\[var\\(--space-)`;
```

b) `PATTERNS` um die vierte Kategorie erweitern:

```js
  spacing: [
    // Lookbehind statt \b: bei "-mx-2.5" steht vor dem Minus ein
    // Leerzeichen, und \b greift dort nicht.
    new RegExp(`(?<![\\w-])-?(?:p|m)[xytrbles]?-${SPACING_GUARD}(?:\\[[^\\]]*\\]|[\\w./]+)`, "g"),
    new RegExp(`(?<![\\w-])gap(?:-[xy])?-${SPACING_GUARD}(?:\\[[^\\]]*\\]|[\\w./]+)`, "g"),
    new RegExp(`(?<![\\w-])space-[xy]-${SPACING_GUARD}(?:\\[[^\\]]*\\]|[\\w./]+)`, "g"),
  ],
```

c) Die drei Stellen, an denen die Kategorien aufgezählt sind, auf **eine**
Liste zusammenziehen. Direkt hinter `PATTERNS` einfügen:

```js
/** Die Kategorien in einer Liste — sonst vergisst eine Stelle die vierte. */
const CATEGORIES = ["color", "radius", "inline", "spacing"];
```

d) In `scan()` die Zähler-Bildung ersetzen:

```js
      const counts = {};
      let any = 0;
      for (const c of CATEGORIES) {
        counts[c] = countCategory(src, c);
        any += counts[c];
      }
      if (any) result[relative(ROOT, file)] = counts;
```

e) `ZERO_COUNTS` und die Schleifen anpassen:

```js
const ZERO_COUNTS = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
```

In `findRaised()` und in der Hauptprüfung `for (const k of ["color", "radius",
"inline"])` jeweils durch `for (const k of CATEGORIES)` ersetzen. Beide
Summen `a + c.color + c.radius + c.inline` durch
`a + CATEGORIES.reduce((s, k) => s + (c[k] ?? 0), 0)` ersetzen.

f) Im Kopfkommentar „Drei Kategorien" auf vier erweitern:

```js
 * Vier Kategorien:
 *   color   — Hex, rgb(), hsl(), white/black, Tailwind-Palettenutilities
 *   radius  — rounded-* ausserhalb der vier Token
 *   inline  — style={{ … }}
 *   spacing — p-/m-/gap-/space-Utilities ausserhalb der Achterskala
 *             (4·8·12·16·24·32·48·72). Ergaenzt 2026-08-22: die Skala stand
 *             seit dem 2026-08-21 in der Spec und wurde von nichts erzwungen.
```

- [ ] **Step 4: Selbsttest laufen lassen, Erfolg prüfen**

Run: `node scripts/check-design-tokens.mjs --selftest`
Expected: PASS — `Selbsttest: 28 Faelle in Ordnung.` (19 alte + 9 neue).

- [ ] **Step 5: Die Baseline neu legen**

Eine erweiterte Regel ist der eine legitime Grund für eine quer durch alle
Dateien höhere Zahl. Der dokumentierte Weg dafür ist nicht `--admit`:

```bash
rm scripts/design-baseline.json
npm run check:design -- --update
npm run check:design
```

Expected: die `--update`-Zeile meldet rund **2219 Verstöße** (1934 + 285);
der zweite Aufruf meldet „keiner neu". Die genaue Zahl aus dem Lauf ist die
verbindliche und gehört in die Commit-Message.

- [ ] **Step 6: CHANGELOG ergänzen**

Unter `## [Unreleased]` → `### Added` an den Absatz zu `check:design`
anfügen:

```markdown
- **Vierte Ratschen-Kategorie `spacing`.** `npm run check:design` verwirft jetzt auch
  `p-`/`m-`/`gap-`/`space-`-Utilities außerhalb der Abstandsskala
  4 · 8 · 12 · 16 · 24 · 32 · 48 · 72 px. Die Skala stand seit dem 2026-08-21 im
  Designentwurf und wurde von nichts erzwungen — gemessen lagen 285 Utilities in
  69 Dateien daneben, allein 104 davon auf 6 px. Die Baseline steigt dadurch
  einmalig auf den neuen, ehrlichen Boden und fällt ab dort wieder nur.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/check-design-tokens.mjs scripts/design-baseline.json CHANGELOG.md
git commit -m "chore(config): vierte Ratschen-Kategorie spacing (285 Verstoesse sichtbar)"
```

---

### Task 3: Die Zähler — und das Navbar-Schlupfloch

Die Amber-Regel zählte über `main`. Federlogo, Münzzähler und Level-Badge
liegen außerhalb und tragen Amber auf jeder Seite; das Auge kennt die
`main`-Grenze nicht. Diese Task schreibt zuerst die Zähler, die das messen,
und schließt dann das Loch — sonst wären die Tests am Ende der Task rot.

**Files:**
- Create: `e2e/helpers/design-count.ts`
- Create: `e2e/design-rules.spec.ts`
- Create: `components/layout/feather-mark.tsx`
- Modify: `components/layout/navbar.tsx`
- Modify: `components/layout/coin-counter.tsx`
- Modify: `components/layout/level-badge.tsx`
- Modify: `app/globals.css` (Link-Standardfarbe)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `data-column` aus Task 1.
- Produces:
  - `export interface Hit { tag: string; testid: string | null; prop: string; text: string; inLight: boolean }`
  - `export async function countAmber(page: Page): Promise<Hit[]>`
  - `export async function countDisplayFont(page: Page): Promise<Hit[]>`
  - `export async function countBoxes(page: Page): Promise<Hit[]>`
  - `export async function measureColumns(page: Page): Promise<{ measurePx: number; widths: number[] }>`
  - `export const MIGRATED_PAGES: string[]` — die Liste, die jede Phase verlängert. Phase 0: `["/dashboard"]`.
  - `export function FeatherMark(props: { className?: string }): JSX.Element`

**Gemessen vorab in Chromium (2026-08-22), damit die Zähler nicht auf
Annahmen stehen:**

| Deklaration | Berechneter Wert |
|---|---|
| `color: var(--amber)` | `rgb(240, 165, 0)` |
| `background: color-mix(in srgb, var(--amber) 12%, transparent)` | `color(srgb 0.941176 0.647059 0 / 0.12)` |
| `border: 1px solid color-mix(…25%…)` | `color(srgb 0.941176 0.647059 0 / 0.25)` |
| `radial-gradient(…, color-mix(…11%…), transparent)` | `radial-gradient(color(srgb 0.941176 0.647059 0 / 0.11) 0%, rgba(0, 0, 0, 0) 84%)` |
| `box-shadow: 0 0 16px color-mix(…12%…)` | `color(srgb 0.941176 0.647059 0 / 0.12) 0px 0px 16px 0px` |
| `background: transparent` | `rgba(0, 0, 0, 0)` |
| `getComputedStyle(el, "::before").content` ohne Pseudoelement | `"none"` |
| dasselbe mit `content: ""` | `""` |
| `word-break: break-word` | `break-word` (wird **nicht** wegnormalisiert) |

`0.941176 × 255 = 240.0`, `0.647059 × 255 = 165.0` — die Umrechnung im
Zähler trifft `--amber` exakt; die Toleranz von 4 pro Kanal deckt
Rundungen ab. Der durchsichtige Farbstopp eines Gradienten kommt als
`rgba(0, 0, 0, 0)` und fällt durch die Alpha-Schwelle von 0.03 heraus.

- [ ] **Step 1: Die Zähler schreiben**

Neue Datei `e2e/helpers/design-count.ts`:

```ts
import type { Page } from "@playwright/test";

/**
 * Die vier Zähler der Spec (§8), gemessen mit derselben Methode, mit der
 * die Ausgangslage gezählt wurde.
 *
 * Zwei Fallen, an denen eine naive Messung vorbeiläuft:
 *
 * 1. `color(srgb … / α)`. Chromium serialisiert alles, was durch
 *    `color-mix(in srgb, …)` gegangen ist, in dieser Form — nicht als
 *    `rgb()`. Beim Messen für die Spec hat ein Zähler, der nur `rgb()`
 *    kannte, vier Amber-Elemente auf /tasks als null gemeldet. Ein Test,
 *    der die Verstöße nicht sieht, ist schlimmer als keiner.
 *
 * 2. Vererbung. `color` erbt: unter einem amberfarbenen Element meldet
 *    jedes Kind ebenfalls Amber. Deshalb zählt `color` nur an Elementen
 *    mit eigenem Textknoten — das ist die ehrliche Zahl „so viele Stellen
 *    tragen amberfarbenen Text".
 */
export interface Hit {
  tag: string;
  testid: string | null;
  prop: string;
  text: string;
  /** True, wenn der Treffer innerhalb der einen Lichtquelle (.lichtkegel) liegt. */
  inLight: boolean;
}

/** Seiten, die auf das Token-System migriert sind. Jede Phase verlängert die Liste. */
export const MIGRATED_PAGES: string[] = ["/dashboard"];

/**
 * Zählt Amber über das GESAMTE Dokument — Navbar, Sidebar, Dialoge
 * eingeschlossen. Die alte Zählung über `main` war das Schlupfloch, durch
 * das Feder und Münzzähler auf jeder Seite ungezählt Amber trugen.
 *
 * @param page - Die Playwright-Seite, bereits navigiert
 * @returns Ein Treffer pro Element und Eigenschaft, die Amber trägt
 */
export async function countAmber(page: Page): Promise<Hit[]> {
  return page.evaluate(() => {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--amber")
      .trim()
      .replace("#", "");
    const target = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
    const near = (r: number, g: number, b: number) =>
      Math.abs(r - target[0]) <= 4 &&
      Math.abs(g - target[1]) <= 4 &&
      Math.abs(b - target[2]) <= 4;
    const alpha = (raw: string | undefined) => {
      if (raw === undefined) return 1;
      const s = raw.trim();
      return s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s);
    };
    const carries = (value: string | null) => {
      if (!value || value === "none") return false;
      let m: RegExpExecArray | null;
      const rgb =
        /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)/g;
      while ((m = rgb.exec(value)) !== null) {
        if (alpha(m[4]) > 0.03 && near(+m[1], +m[2], +m[3])) return true;
      }
      const srgb =
        /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.%]+))?\s*\)/g;
      while ((m = srgb.exec(value)) !== null) {
        if (alpha(m[4]) > 0.03 && near(+m[1] * 255, +m[2] * 255, +m[3] * 255))
          return true;
      }
      return false;
    };
    const ownText = (el: Element) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );

    const hits: Hit[] = [];
    const push = (el: Element, prop: string) =>
      hits.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        prop,
        text: (el.textContent ?? "").trim().slice(0, 40),
        inLight: el.closest(".lichtkegel") !== null,
      });

    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity) === 0) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;

      if (ownText(el) && carries(cs.color)) push(el, "color");
      if (carries(cs.backgroundColor)) push(el, "background");
      if (carries(cs.backgroundImage)) push(el, "background-image");
      if (carries(cs.boxShadow)) push(el, "box-shadow");
      if (carries(cs.fill)) push(el, "fill");
      if (carries(cs.stroke)) push(el, "stroke");

      for (const side of ["top", "right", "bottom", "left"]) {
        const w = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        const style = cs.getPropertyValue(`border-${side}-style`);
        if (w > 0 && style !== "none" && carries(cs.getPropertyValue(`border-${side}-color`))) {
          push(el, `border-${side}`);
          break;
        }
      }

      // Der Lichtkegel selbst liegt in ::before — ohne Pseudoelemente
      // sieht der Zähler die eine erlaubte Lichtquelle gar nicht und die
      // Regel wäre trivial erfüllt.
      for (const pseudo of ["::before", "::after"]) {
        const ps = getComputedStyle(el, pseudo);
        if (ps.content === "none") continue;
        if (carries(ps.backgroundImage) || carries(ps.backgroundColor) || carries(ps.color)) {
          push(el, pseudo);
        }
      }
    }
    return hits;
  });
}

/** Der Wurzelknoten für die Zähler, die sich auf Inhalt beziehen. */
const CONTENT_ROOT = "main";

/**
 * Zählt Fraunces innerhalb von `main`. Die Spec erlaubt genau eins pro
 * Seite; /stats hatte 16.
 */
export async function countDisplayFont(page: Page): Promise<Hit[]> {
  return page.evaluate((rootSel: string) => {
    const root = document.querySelector(rootSel) ?? document.body;
    const ownText = (el: Element) =>
      Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
      );
    const hits: Hit[] = [];
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (!ownText(el)) continue;
      if (!/^\s*["']?Fraunces/.test(cs.fontFamily)) continue;
      hits.push({
        tag: el.tagName.toLowerCase(),
        testid: el.getAttribute("data-testid"),
        prop: `font-size:${cs.fontSize}`,
        text: (el.textContent ?? "").trim().slice(0, 40),
        inLight: el.closest(".lichtkegel") !== null,
      });
    }
    return hits;
  }, CONTENT_ROOT);
}

/**
 * Zählt umrahmte oder gefüllte Inhaltsflächen in `main`.
 *
 * Ein Kasten ist: eine Kante auf ALLEN VIER Seiten, oder eine Fläche, die
 * sich von `--ground` unterscheidet. Eine einzelne Linie (Trennlinie unter
 * einer Überschrift, Haarlinie zwischen Zeilen) ist kein Kasten — sie
 * trennt, sie umrahmt nicht.
 *
 * Ausgenommen sind echte Affordanzen: eine Kante um ein Eingabefeld oder
 * einen Button sagt „hier kannst du tippen oder drücken" und ist damit
 * Information. Ausgenommen ist außerdem alles in einem Overlay (Dialog,
 * Popover) — das schwebt und grenzt sich per Definition ab.
 */
export async function countBoxes(page: Page): Promise<Hit[]> {
  return page.evaluate((rootSel: string) => {
    const root = document.querySelector(rootSel) ?? document.body;
    const groundRaw = getComputedStyle(document.documentElement)
      .getPropertyValue("--ground")
      .trim();
    const probe = document.createElement("div");
    probe.style.backgroundColor = groundRaw;
    document.body.appendChild(probe);
    const ground = getComputedStyle(probe).backgroundColor;
    probe.remove();

    const AFFORDANCE =
      'button, input, textarea, select, a, label, summary, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [contenteditable="true"], [data-affordance]';
    const FLOATING = '[role="dialog"], [role="menu"], [role="tooltip"], [data-radix-popper-content-wrapper]';

    const transparent = (c: string) => c === "rgba(0, 0, 0, 0)" || c === "transparent";

    const hits: Hit[] = [];
    for (const el of Array.from(root.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (el.closest(AFFORDANCE) !== null) continue;
      if (el.closest(FLOATING) !== null) continue;

      const framed = ["top", "right", "bottom", "left"].every((s) => {
        const w = parseFloat(cs.getPropertyValue(`border-${s}-width`));
        return w > 0 && cs.getPropertyValue(`border-${s}-style`) !== "none";
      });
      const filled = !transparent(cs.backgroundColor) && cs.backgroundColor !== ground;

      if (framed || filled) {
        hits.push({
          tag: el.tagName.toLowerCase(),
          testid: el.getAttribute("data-testid"),
          prop: framed ? "border" : `background:${cs.backgroundColor}`,
          text: (el.textContent ?? "").trim().slice(0, 40),
          inLight: el.closest(".lichtkegel") !== null,
        });
      }
    }
    return hits;
  }, CONTENT_ROOT);
}

/**
 * Misst jede Inhaltsspalte gegen `--measure`.
 *
 * @returns Das Maß in px und die Breiten aller `[data-column]` in `main`
 */
export async function measureColumns(
  page: Page,
): Promise<{ measurePx: number; widths: number[] }> {
  return page.evaluate((rootSel: string) => {
    const probe = document.createElement("div");
    probe.style.width = "var(--measure)";
    document.body.appendChild(probe);
    const measurePx = probe.getBoundingClientRect().width;
    probe.remove();
    const root = document.querySelector(rootSel) ?? document.body;
    const widths = Array.from(root.querySelectorAll("[data-column]")).map(
      (el) => el.getBoundingClientRect().width,
    );
    return { measurePx, widths };
  }, CONTENT_ROOT);
}
```

- [ ] **Step 2: Die Regel-Spec schreiben**

Neue Datei `e2e/design-rules.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { gotoWithTheme } from "./helpers/theme";
import {
  MIGRATED_PAGES,
  countAmber,
  countBoxes,
  countDisplayFont,
  measureColumns,
} from "./helpers/design-count";

/**
 * Die vier Regeln der Spec (§8), je migrierte Seite, in beiden Themes.
 *
 * Nicht enthalten ist /design-system: die Referenzseite ZEIGT Flächen,
 * Radien und Schriftrollen nebeneinander und kann die Regeln deshalb nicht
 * erfüllen. Sie ist der Katalog, nicht die Anwendung.
 */
for (const path of MIGRATED_PAGES) {
  for (const theme of ["dark", "light"] as const) {
    test.describe(`${path} (${theme})`, () => {
      test("trägt Amber höchstens einmal, dokumentweit", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countAmber(page);
        const outside = hits.filter((h) => !h.inLight);
        const inside = hits.filter((h) => h.inLight);
        const dump = (hs: typeof hits) =>
          hs.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n");
        // Innerhalb der einen Lichtquelle sind Wash und die Textfarbe der
        // einen Handlung erlaubt — das ist ein Licht, nicht zwei Elemente.
        expect(inside.length, `im Licht:\n${dump(inside)}`).toBeLessThanOrEqual(2);
        // Außerhalb: gibt es ein Licht, ist außerhalb kein Amber erlaubt;
        // gibt es keins, darf genau eine Handlung Amber tragen.
        expect(outside.length, `außerhalb:\n${dump(outside)}`).toBeLessThanOrEqual(
          inside.length > 0 ? 0 : 1,
        );
      });

      test("trägt Fraunces genau einmal", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countDisplayFont(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag} ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(1);
      });

      test("hat keine umrahmte Inhaltsfläche", async ({ page }) => {
        await gotoWithTheme(page, theme, path);
        const hits = await countBoxes(page);
        expect(
          hits.length,
          hits.map((h) => `${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`).join("\n"),
        ).toBe(0);
      });

      test("hält jede Inhaltsspalte auf dem Maß", async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await gotoWithTheme(page, theme, path);
        const { measurePx, widths } = await measureColumns(page);
        expect(widths.length, "keine [data-column] gefunden").toBeGreaterThan(0);
        for (const w of widths) expect(w).toBeLessThanOrEqual(measurePx + 1);
      });
    });
  }
}
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts`
Expected: FAIL in beiden Themes. Erwartete Treffer im Fehlertext:
- Amber außerhalb des Lichts: `svg`/`img` (Feder), `span[coin-counter]`
  (Text und Wash), Level-Badge ab Level 7 — plus jeder Link im Inhalt, weil
  `globals.css` `a { color: var(--accent-amber) }` global setzt.
- Maß: `keine [data-column] gefunden` — das Dashboard nutzt noch
  `max-w-4xl lg:max-w-5xl`.

Der Fehlschlag beim Maß wird in Step 8 behoben, alles Übrige in Step 4–7.

- [ ] **Step 4: Die Feder als Inline-SVG ohne Amber**

Neue Datei `components/layout/feather-mark.tsx`:

```tsx
/**
 * FeatherMark — die Feder in der Navigation.
 *
 * Chrome ist ausschließlich Ink (Spec §5): die Feder bleibt eine Feder,
 * aber ohne Amber. Vorher lag sie als `/icon.svg` mit hartkodiertem
 * #f0a500 im Bild — ein `<img>` kann keine Textfarbe erben, deshalb ist
 * sie hier inline und zeichnet mit `currentColor`.
 *
 * Kosten, offen benannt: die Navigation verliert ihre einzige dauerhafte
 * Farbfreude. Der Gegenwert ist eine Amber-Regel, die gilt statt auf dem
 * Papier zu stehen.
 *
 * Das installierte App-Icon (app/icon.svg, apple-icon.svg,
 * public/icon-192.png, icon-512.png, manifest.json) bleibt amberfarben —
 * es erscheint im Betriebssystem und im Browser-Tab, nie neben
 * Seiteninhalt, und fällt damit nicht unter die Regel.
 */
export function FeatherMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={28}
      height={28}
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 44 C6 38 9 28 15 20 C21 12 30 7 38 6 C43 5 45 8 44 13 C42 22 34 32 24 38 C16 42 10 43 6 44 Z"
        fill="currentColor"
      />
      <path
        d="M6 44 Q24 26 42 8"
        stroke="var(--ground)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M11 38 L6 32" stroke="var(--ground)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
```

In `components/layout/navbar.tsx` den `next/image`-Import und das `<Image>`
ersetzen:

```tsx
import { FeatherMark } from "@/components/layout/feather-mark";
```

```tsx
        <FeatherMark className="text-[var(--ink-2)]" />
```

Den Import `import Image from "next/image";` entfernen.

- [ ] **Step 5: Der Münzzähler wird `--ink-2`**

In `components/layout/coin-counter.tsx` das `style`-Objekt und `title`
ersetzen:

```tsx
    <span
      ref={nodeRef}
      data-testid="coin-counter"
      className="flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 font-[family-name:var(--font-mono)] text-sm tabular-nums text-[var(--ink-2)]"
      title={t("coin_balance")}
    >
```

Das gesamte `style={{ … }}` entfällt — kein Amber-Text, kein Amber-Wash.
Die Ziffern gehen auf Mono, weil CLAUDE.md Zahlentext Mono vorschreibt.
`px-2.5` wird `px-2` (10 px liegt nicht auf der Skala). Für `t` oben
ergänzen:

```tsx
import { useTranslations } from "next-intl";
```

```tsx
  const t = useTranslations("nav");
```

- [ ] **Step 6: Level-Badge und Avatar werden Ink**

Das Level-Badge trägt heute ab Level 7 Amber und ab Level 4 `--accent-green`
— das zweite ist zusätzlich ein Verstoß gegen „`--done` ist nur erledigt"
(Spec §2, Lücke 3). In `components/layout/level-badge.tsx` die drei
Funktionen auf eine reine Ink-Leiter ziehen:

```tsx
/**
 * Tier-Farbe eines Levels — eine Ink-Leiter, keine Bedeutungsfarben.
 *
 * Vorher: ab Level 4 --accent-green, ab Level 7 --accent-amber, ab Level 10
 * violett. Zwei davon sind Verstöße, die sich auf JEDER Seite zeigen:
 * Chrome ist ausschließlich Ink (Spec §5), und --done heißt ausschließlich
 * "erledigt" — ein Level ist nichts Erledigtes. Die Stufen bleiben
 * unterscheidbar, nur über Helligkeit statt über Farbe.
 *
 * Das Violett für Legendary lebt weiter auf /achievements, wo eine
 * Seltenheitsstufe Inhalt ist und keine Navigation. Diese Seite ist
 * Phase 2.
 */
function tierColor(level: number): string {
  if (level >= 10) return "var(--ink)";
  if (level >= 7) return "var(--ink)";
  if (level >= 4) return "var(--ink-2)";
  return "var(--ink-3)";
}
```

Die Funktion für die Fläche gibt für jede Stufe
`color-mix(in srgb, var(--ink) 8%, transparent)` zurück, die für die Kante
`color-mix(in srgb, var(--ink) 20%, transparent)` — eine Stufe, nicht vier,
weil die Unterscheidung schon in der Textfarbe steckt.

Ebenso `components/layout/user-menu.tsx:92-99`: der Avatar-Platzhalter ist
heute ein **grün gefüllter Kreis** in der Navigation — der
„Navigationsbutton", den die Spec unter Lücke 3 nennt. Das `style`-Objekt
entfällt:

```tsx
        <button
          aria-label={t("user_menu")}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-pill)] border border-[var(--hairline)] bg-[var(--raised)] text-sm font-medium text-[var(--ink)] transition-opacity hover:opacity-80"
        >
```

Der Key `nav.user_menu` kommt in Task 6 in alle sieben Locales; bis dahin
`aria-label="User menu"` stehen lassen, damit diese Task für sich lauffähig
bleibt. Außerdem `user-menu.tsx:170-171`: die beiden
`var(--accent-amber)`-Werte am Abmelde-Eintrag werden `var(--ink-2)` — ein
Menüeintrag ist nicht *die* Handlung der Seite.

- [ ] **Step 7: Die globale Link-Farbe ist nicht Amber**

In `app/globals.css` den Block `a { … }` ersetzen:

```css
/* ─── Link defaults ─────────────────────────────────────────────────────────── */
/*
 * Bis 2026-08-22 war jeder Link auf jeder Seite amberfarben. Damit brach
 * die Ein-Amber-Regel strukturell auf jeder Seite, die mehr als einen Link
 * im Inhalt hat — und zwar unabhängig davon, was die Seite selbst tut.
 * Ein Link im Fließtext ist keine "eine Handlung"; er ist Text, der wohin
 * führt. Er wird deshalb unterstrichen statt gefärbt. Amber bleibt der
 * einen Handlung, die es explizit über Button variant="primary" anfordert.
 */
a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--hairline);
  text-underline-offset: 0.15em;
  transition: text-decoration-color 0.15s ease;
}

a:hover {
  text-decoration-color: currentColor;
}
```

- [ ] **Step 8: Das Dashboard auf `PageFrame` setzen**

Damit der Maß-Test einen Bezugspunkt hat, bekommt das Dashboard den Rahmen
aus Task 1 und den Rand aus der Spec-Tabelle (Serie, Coins, verbleibende
Verschiebungen). In `app/(app)/dashboard/page.tsx` den äußeren Container
ersetzen:

```tsx
import { PageFrame } from "@/components/ui/page-frame";
```

```tsx
    <PageFrame
      rail={
        <>
          {streakText && (
            <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
              {streakText}
            </p>
          )}
          <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
            {t("rail_coins", { coins: stats.coins })}
          </p>
          {postponeLimit - postponesToday > 0 && (
            <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
              {t("rail_postpones", { left: postponeLimit - postponesToday })}
            </p>
          )}
        </>
      }
    >
```

Der schließende `</div>` des alten Containers wird `</PageFrame>`. Die
`gap-12`-Klasse entfällt — `PageFrame` setzt `gap-8` auf die Spalte; die
enge Kopf-Gruppe und der große Bruch zur Quest bleiben über die inneren
`gap-2`/`gap-8` erhalten.

`streakText` wird damit im Rand gezeigt statt in der Metazeile: das Prop
`streakText` an `EnergyCheckinCard` auf `null` setzen und den Parameter dort
belassen (Phase 2 räumt die Komponente auf). Zwei neue i18n-Keys in **allen
sieben** `messages/*.json` unter `dashboard`:

```json
    "rail_coins": "{coins} Münzen",
    "rail_postpones": "noch {left}× verschiebbar",
```

(en: `"{coins} coins"` / `"{left} postpone(s) left"`; es: `"{coins} monedas"` /
`"quedan {left} aplazamientos"`; fr: `"{coins} pièces"` / `"{left} report(s)
restant(s)"`; nl: `"{coins} munten"` / `"nog {left}× uitstellen"`; ru:
`"{coins} монет"` / `"осталось переносов: {left}"`; zh: `"{coins} 枚硬币"` /
`"还可推迟 {left} 次"`.)

- [ ] **Step 9: Tests laufen lassen, Erfolg prüfen**

```bash
npm run check:i18n
npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts e2e/dashboard.spec.ts e2e/navigation.spec.ts
```

Expected: alles grün. Der Amber-Zähler auf `/dashboard` findet jetzt höchstens
zwei Treffer, beide im `.lichtkegel` (Wash und die Textfarbe von „jetzt
anfangen"), und keinen außerhalb.

- [ ] **Step 10: Im Browser ansehen**

Dashboard in Chrome bei 1440 px und 375 px, dark und light: Feder grau,
Münzzähler grau, Level-Badge ohne Amber, Links unterstrichen statt
amberfarben, Spalte 640 px mit Rand rechts. Grüne Tests sind kein Beleg.

- [ ] **Step 11: Commit**

```bash
git add e2e/helpers/design-count.ts e2e/design-rules.spec.ts components/layout/feather-mark.tsx components/layout/navbar.tsx components/layout/coin-counter.tsx components/layout/level-badge.tsx app/globals.css "app/(app)/dashboard/page.tsx" messages/
git commit -m "feat(ui): Amber-, Fraunces-, Kasten- und Maszaehler als Test; Chrome ist Ink"
```

---

### Task 4: Eine Liste für die ganze App — `List`, `Row`, `EmptyState`

Fünf getrennte Zeilen-Implementierungen tragen 227 Verstöße. Die sechste
ist die Quick-Wins-Zeile aus dem Pilot — sie ist die einzige, die schon
richtig ist, und wird deshalb nicht neu erfunden, sondern extrahiert.

**Files:**
- Create: `components/ui/list.tsx`
- Create: `components/ui/empty-state.tsx`
- Modify: `components/dashboard/quick-wins-section.tsx`
- Modify: `app/(docs)/design-system/page.tsx`
- Modify: `e2e/design-tokens.spec.ts`
- Modify: `scripts/design-baseline.json`

**Interfaces:**
- Consumes: nichts aus vorigen Tasks.
- Produces:
  - `export type EffortStep = "small" | "medium" | "large"`
  - `export function effortStep(minutes: number | null): EffortStep`
  - `export const EFFORT_TEXT: Record<EffortStep, string>`
  - `export function List(props: { children: React.ReactNode; className?: string }): JSX.Element`
  - `export interface RowProps { lead?: React.ReactNode; title: React.ReactNode; eyebrow?: React.ReactNode; trailing?: React.ReactNode; actions?: React.ReactNode; effort?: EffortStep; dotColor?: string | null; dimmed?: boolean; className?: string; testId?: string }`
    — Task 10 ergänzt `wrapTitle?: boolean`; bis dahin schneidet der Titel ab.
  - `export function Row(props: RowProps): JSX.Element` — rendert `<li>` mit
    `data-testid={testId}` (Standard `"row"`), `data-effort`, und den Punkt
    als `data-testid="row-dot"`. Der Titel trägt `data-row-title`.
  - `export function GroupHeading(props: { children: React.ReactNode }): JSX.Element`
  - `export function EmptyState(props: { line: string; action?: React.ReactNode; testId?: string }): JSX.Element` (Standard-`testId`: `"empty-state"`)

- [ ] **Step 1: Die Prüftests schreiben**

An `e2e/design-tokens.spec.ts` anfügen:

```ts
test.describe("List und Row", () => {
  test("Zeilen sind durch Haarlinien getrennt, nicht durch Kästen", async ({ page }) => {
    await page.goto("/design-system");
    const rows = page.getByTestId("demo-row");
    await expect(rows).toHaveCount(3);
    const first = await rows.nth(0).evaluate((n) => {
      const c = getComputedStyle(n);
      return { top: c.borderTopWidth, bottom: c.borderBottomWidth, bg: c.backgroundColor };
    });
    const second = await rows.nth(1).evaluate((n) => {
      const c = getComputedStyle(n);
      return { top: c.borderTopWidth, bg: c.backgroundColor };
    });
    // Erste Zeile ohne Linie oben, jede folgende mit genau einer.
    expect(first.top).toBe("0px");
    expect(first.bottom).toBe("0px");
    expect(second.top).toBe("1px");
    // Kein Kasten: keine Fläche unter der Zeile.
    expect(first.bg).toBe("rgba(0, 0, 0, 0)");
    expect(second.bg).toBe("rgba(0, 0, 0, 0)");
  });

  test("die Dauer steckt in der Schriftgröße des Titels", async ({ page }) => {
    await page.goto("/design-system");
    const sizes: number[] = [];
    for (const step of ["small", "medium", "large"]) {
      const px = await page
        .locator(`[data-testid="demo-row"][data-effort="${step}"] [data-row-title]`)
        .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
      sizes.push(px);
    }
    expect(sizes[0]).toBeCloseTo(14, 0);
    expect(sizes[1]).toBeCloseTo(16, 0);
    expect(sizes[2]).toBeCloseTo(20, 0);
  });

  test("die Nutzerfarbe erscheint als 6-px-Punkt, nicht als Fläche", async ({ page }) => {
    await page.goto("/design-system");
    const dot = page.getByTestId("row-dot").first();
    const s = await dot.evaluate((n) => {
      const c = getComputedStyle(n);
      return { w: c.width, h: c.height, radius: c.borderTopLeftRadius, border: c.borderTopWidth };
    });
    expect(s.w).toBe("6px");
    expect(s.h).toBe("6px");
    expect(s.border).toBe("0px");
    expect(parseFloat(s.radius)).toBeGreaterThanOrEqual(3);
  });

  test("der leere Zustand ist eine Zeile und eine Handlung, kein Kasten", async ({ page }) => {
    await page.goto("/design-system");
    const empty = page.getByTestId("demo-empty");
    const s = await empty.evaluate((n) => {
      const c = getComputedStyle(n);
      return { border: c.borderTopWidth, style: c.borderTopStyle, bg: c.backgroundColor };
    });
    expect(s.border).toBe("0px");
    expect(s.style).not.toBe("dashed");
    expect(s.bg).toBe("rgba(0, 0, 0, 0)");
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-tokens.spec.ts -g "List und Row"`
Expected: FAIL — `demo-row` existiert nicht (`toHaveCount(3)` erhält 0).

- [ ] **Step 3: `components/ui/list.tsx` anlegen**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * List und Row — die eine Zeile für die ganze App.
 *
 * Ersetzt fünf getrennte Implementierungen (task-item, task-list,
 * focus-mode-view, wishlist-card, topic-card). Haarlinie trennt, kein
 * Kasten umrahmt.
 *
 * **Die Zeile ist nichts als Text.** Jede Metadatenart bekommt eine
 * Kodierung, die keine Fläche braucht:
 *
 * | Feld | Kodierung |
 * |---|---|
 * | Dauer | die Schriftgröße des Titels (`effort`), plus die Minutenzahl in `trailing` |
 * | Priorität | Gruppenüberschrift (`GroupHeading`), kein Abzeichen an der Zeile |
 * | Thema | Mono-Eyebrow unter dem Titel (`eyebrow`) |
 * | Themenfarbe | ein 6-px-Punkt (`dotColor`) |
 * | Fälligkeit | rechts, Mono (`trailing`); `--danger` nur bei Überfälligkeit |
 *
 * Warum keine Chips: die Spec verlangt, dass eine Fläche beantworten kann,
 * welche Frage sie dem Nutzer stellt. Ein Chip um "60 min" ist eine Fläche
 * ohne Affordanz — man kann ihn nicht drücken. Er fällt damit unter
 * dieselbe Regel wie der abgeschaffte Card.
 *
 * Warum die Größe nicht die einzige Kodierung der Dauer ist: WCAG 1.4.1
 * (Verwendung von Farbe bzw. sensorischen Merkmalen). Die Minutenzahl
 * steht als Text daneben.
 */
export type EffortStep = "small" | "medium" | "large";

/**
 * Ordnet eine geschätzte Dauer einer der drei Aufwandsstufen zu. Die Stufe
 * bestimmt die Schriftgröße der Zeile: der Aufwand ist sichtbar, bevor man
 * liest.
 *
 * Drei diskrete Stufen, nicht stufenlos — stufenlos kollidiert mit
 * Mindestgrößen und Browser-Zoom.
 *
 * `estimatedMinutes` ist ein Enum, kein freier Integer: `5 | 15 | 30 | 60 |
 * null` (siehe `lib/validators/index.ts`).
 *
 * @param minutes - Geschätzte Dauer (5, 15, 30, 60) oder null
 * @returns "small" (≤5 min), "medium" (≤30 min oder ohne Schätzung), "large" (>30 min)
 */
export function effortStep(minutes: number | null): EffortStep {
  if (minutes === null) return "medium";
  if (minutes <= 5) return "small";
  if (minutes <= 30) return "medium";
  return "large";
}

/** Schriftgröße je Aufwandsstufe — nie unter 0.875rem, damit Zoom greift. */
export const EFFORT_TEXT: Record<EffortStep, string> = {
  small: "text-[0.875rem]",
  medium: "text-[1rem]",
  large: "text-[1.25rem]",
};

/** Die Liste: keine Aufzählungspunkte, kein Rahmen, kein Abstand außen. */
export function List({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn("m-0 list-none p-0", className)}>{children}</ul>;
}

/**
 * Gruppenüberschrift innerhalb einer Liste — ein Mono-Eyebrow.
 *
 * Priorität als Gruppierung statt als Abzeichen ist Struktur statt
 * Dekoration: "HOCH · 2" kodiert etwas Wahres über den Inhalt, ein
 * amberfarbenes Abzeichen an jeder Zeile behauptet nur Wichtigkeit.
 */
export function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mt-8 mb-3 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)] first:mt-0">
      {children}
    </p>
  );
}

export interface RowProps {
  /** Links: Abhak-Kreis, Auswahlkästchen, Griff. */
  lead?: React.ReactNode;
  /** Der Titel. Trägt die Aufwandsgröße. */
  title: React.ReactNode;
  /** Mono-Eyebrow unter dem Titel — das Thema, `--ink-3`. */
  eyebrow?: React.ReactNode;
  /** Rechts, Mono: Fälligkeit, Minutenzahl, Summe. */
  trailing?: React.ReactNode;
  /** Aktionen, sichtbar bei Hover und Fokus. */
  actions?: React.ReactNode;
  /** Aufwandsstufe; bestimmt die Titelgröße. Standard: medium. */
  effort?: EffortStep;
  /** Die frei gewählte Themenfarbe des Nutzers, als 6-px-Punkt. */
  dotColor?: string | null;
  /** Erledigt: gedämpft und durchgestrichen. */
  dimmed?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Eine Zeile. Haarlinie oben, außer bei der ersten.
 *
 * @param props - siehe RowProps
 * @returns Ein `<li>` ohne Fläche und ohne Rahmen
 */
export function Row({
  lead,
  title,
  eyebrow,
  trailing,
  actions,
  effort = "medium",
  dotColor,
  dimmed = false,
  className,
  testId = "row",
}: RowProps) {
  return (
    <li
      data-testid={testId}
      data-effort={effort}
      className={cn(
        "group flex items-start gap-3 border-t border-t-[var(--hairline)] bg-transparent py-3 first:border-t-0",
        className,
      )}
    >
      {lead ? <span className="mt-1 shrink-0">{lead}</span> : null}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          {dotColor ? (
            <span
              data-testid="row-dot"
              aria-hidden="true"
              className="h-[6px] w-[6px] shrink-0 rounded-[var(--radius-pill)]"
              // Die EINZIGE verbleibende Öffnung für eine frei gewählte
              // Nutzerfarbe (Spec §5). Ein Inline-Style ist hier
              // unvermeidlich: der Wert kommt aus der Datenbank, kein
              // Token kann ihn abbilden. Bewusst als --admit in der
              // Ratsche geführt statt als stiller Rückschritt.
              style={{ backgroundColor: dotColor }}
            />
          ) : null}
          <span
            data-row-title
            className={cn(
              "min-w-0 flex-1 truncate font-[family-name:var(--font-mono)]",
              EFFORT_TEXT[effort],
              dimmed ? "text-[var(--ink-3)] line-through" : "text-[var(--ink)]",
            )}
          >
            {title}
          </span>
        </span>
        {eyebrow ? (
          <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
            {eyebrow}
          </span>
        ) : null}
      </span>

      {trailing ? (
        <span className="shrink-0 self-center font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
          {trailing}
        </span>
      ) : null}

      {actions ? (
        <span className="shrink-0 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </span>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 4: `components/ui/empty-state.tsx` anlegen**

```tsx
import * as React from "react";

/**
 * EmptyState — eine leere Sammlung.
 *
 * Die Spec trennt zwei Fälle scharf (§6):
 *
 * - **Fehlende Kennzahl** (Serie 0, Budget nicht gesetzt): NICHTS anzeigen.
 *   Leerraum ist kein Defekt, der gefüllt werden muss. Dafür gibt es
 *   bewusst keine Komponente — der Aufrufer rendert `null`.
 * - **Leere Sammlung** (keine Aufgaben, keine Themen): genau das hier —
 *   eine Mono-Zeile plus eine stille Handlung.
 *
 * Kein Kasten, kein gestrichelter Rahmen, kein Emoji, keine Illustration.
 * Der Text sagt, was zu tun ist, in der Stimme der Oberfläche — nicht was
 * schiefging und nicht, wie schade es ist.
 */
export function EmptyState({
  line,
  action,
  testId = "empty-state",
}: {
  /** Eine Zeile. Was zu tun ist, nicht was fehlt. */
  line: string;
  /** Eine stille Handlung — Button variant="quiet" oder ein Link. */
  action?: React.ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col gap-4 py-8">
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
        {line}
      </p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 5: Quick Wins auf das Primitive umstellen (DRY)**

In `components/dashboard/quick-wins-section.tsx`:

- Die lokalen `effortStep()` und `EFFORT_TEXT` **löschen** und stattdessen
  importieren:

  ```tsx
  import { List, Row, effortStep } from "@/components/ui/list";
  ```

- Den `<ul>`-Block durch `List`/`Row` ersetzen; die
  `AnimatePresence`-Animation bleibt, wandert aber auf ein `motion.div`
  **innerhalb** der Zeile, weil `Row` das `<li>` rendert:

  ```tsx
      <List>
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <Row
              key={task.id}
              testId="quick-win-row"
              effort={effortStep(task.estimatedMinutes)}
              lead={
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={completing.has(task.id)}
                  aria-label={t("quick_win_complete_aria", { title: task.title })}
                  className="-m-2 flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-0 bg-transparent p-2 transition-colors hover:bg-[var(--raised)] disabled:cursor-wait"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2 transition-colors",
                      completing.has(task.id)
                        ? "border-[var(--done)] bg-[var(--done)]"
                        : "border-[var(--ink-3)] bg-transparent",
                    )}
                  />
                </button>
              }
              title={<span data-testid="quick-win-title">{task.title}</span>}
              trailing={`${task.estimatedMinutes ?? "—"} min`}
            />
          ))}
        </AnimatePresence>
      </List>
  ```

  `motion.li` entfällt damit; der Import von `motion` bleibt für
  `AnimatePresence`. Wenn ESLint `motion` als unbenutzt meldet, den Import
  auf `AnimatePresence` reduzieren.

- Die drei Vorkommen von `-m-2.5`/`p-2.5` sind auf `-m-2`/`p-2` gesetzt
  (10 px liegt nicht auf der Skala).

`e2e/dashboard.spec.ts` prüft `quick-win-row`, `quick-win-title` und
`data-effort` — diese drei Handles bleiben deshalb erhalten.

- [ ] **Step 6: Auf `/design-system` zeigen (und die Duplikate dort tilgen)**

In `app/(docs)/design-system/page.tsx`:

- Die lokale Kopie von `effortStep` und `EFFORT_TEXT` samt Kommentar
  „Mirrors components/dashboard/quick-wins-section.tsx effortStep() 1:1"
  **löschen** — es gibt jetzt eine Quelle:

  ```tsx
  import { List, Row, GroupHeading, effortStep } from "@/components/ui/list";
  import { EmptyState } from "@/components/ui/empty-state";
  import { Button } from "@/components/ui/button";
  ```

- Den Abschnitt „Effort steps" durch die Liste ersetzen:

  ```tsx
      <section className="space-y-6">
        <h2 className="border-b border-[var(--hairline)] pb-2 text-2xl font-semibold text-[var(--ink)]">
          Liste und Zeile
        </h2>
        <p className="max-w-[60ch] text-[var(--ink-2)]">
          Haarlinie trennt, kein Kasten umrahmt. Die Dauer steckt in der
          Schriftgröße des Titels; die Minutenzahl steht rechts, damit die
          Größe nicht die einzige Kodierung ist.
        </p>
        <GroupHeading>Hoch · 3</GroupHeading>
        <List>
          {EFFORT_EXAMPLES.map((ex, i) => (
            <Row
              key={ex.title}
              testId="demo-row"
              effort={effortStep(ex.minutes)}
              title={ex.title}
              eyebrow={i === 0 ? "Steuer" : undefined}
              dotColor={i === 0 ? "var(--done)" : null}
              trailing={`${ex.minutes} min`}
            />
          ))}
        </List>
        <EmptyState
          testId="demo-empty"
          line="Noch keine Aufgabe. Eine reicht."
          action={
            <Button variant="quiet" size="md">
              Aufgabe anlegen
            </Button>
          }
        />
      </section>
  ```

  Der Punkt trägt in `list.tsx` `data-testid="row-dot"`; der Test aus Step 1
  greift mit `.first()` auf die erste Zeile zu, die als einzige ein
  `dotColor` bekommt.

- `space-y-16` am Wurzel-`div` der Seite auf `space-y-12` setzen (64 px
  liegt nicht auf der Skala, 48 px schon).

- [ ] **Step 7: Tests laufen lassen, Erfolg prüfen**

```bash
npm run check:design -- --update --admit components/ui/list.tsx
npm run check:design
npx tsc --noEmit
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-tokens.spec.ts e2e/dashboard.spec.ts e2e/design-rules.spec.ts
```

Expected: alles grün. Der `--admit` betrifft genau den einen Inline-Style
für die Nutzerfarbe in `list.tsx`; die Ausgabe muss
`components/ui/list.tsx: {"color":0,"radius":0,"inline":1,"spacing":0}`
melden und sonst nichts zulassen.

- [ ] **Step 8: Commit**

```bash
git add components/ui/list.tsx components/ui/empty-state.tsx components/dashboard/quick-wins-section.tsx "app/(docs)/design-system/page.tsx" e2e/design-tokens.spec.ts scripts/design-baseline.json
git commit -m "feat(ui): List/Row und EmptyState als Primitive, Quick Wins darauf umgestellt"
```

---

### Task 5: Die Ankunft umkehren

Auf der Seite, deren These „eine Lichtquelle" ist, kommt das Licht zuletzt:
`lichtkegel-atmen` startet bei `opacity: 0.85` und erreicht die volle Stärke
erst nach 3 s (Hälfte des 6-s-Zyklus), und die Quest fährt zusätzlich aus
`opacity: 0` hoch.

**Files:**
- Modify: `app/globals.css` (`@keyframes lichtkegel-atmen`)
- Modify: `components/dashboard/daily-quest-card.tsx`
- Modify: `components/dashboard/quick-wins-section.tsx`
- Modify: `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: `List`/`Row` aus Task 4.
- Produces: keine neuen Exporte. DOM-Vertrag: `[data-testid="quest-light"]`
  trägt nach dem Laden **keinen** Inline-`opacity`-Stil.

- [ ] **Step 1: Die Prüftests schreiben**

An `e2e/dashboard.spec.ts` anfügen:

```ts
test.describe("Die Ankunft", () => {
  test("das Licht steht bei Ankunft auf voller Stärke", async ({ page }) => {
    await page.goto("/dashboard");
    // Gelesen wird die Keyframe-Regel selbst, nicht ein Zeitpunkt: das ist
    // die Behauptung ("bei 0% volle Stärke") ohne Zeitfenster-Flake.
    const startOpacity = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // fremde Herkunft
        }
        for (const rule of Array.from(rules)) {
          if (
            rule instanceof CSSKeyframesRule &&
            rule.name === "lichtkegel-atmen"
          ) {
            const first = Array.from(rule.cssRules).find(
              (r) => (r as CSSKeyframeRule).keyText.includes("0%"),
            ) as CSSKeyframeRule | undefined;
            return first?.style.opacity ?? null;
          }
        }
      }
      return null;
    });
    expect(startOpacity).toBe("1");
  });

  test("die Quest fährt nicht ein", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByTestId("quest-title").waitFor();
    // Motion schreibt seine Animation als Inline-Style. Kein opacity und
    // kein transform im style-Attribut heißt: es gibt keine
    // Eintrittsanimation auf der Quest.
    const style = await page.getByTestId("quest-light").getAttribute("style");
    expect(style ?? "").not.toContain("opacity");
    expect(style ?? "").not.toContain("translate");
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts -g "Die Ankunft"`
Expected: FAIL — `startOpacity` ist `"0.85"`, und das `style`-Attribut der
Quest enthält `opacity`.

- [ ] **Step 3: Das Licht startet voll**

In `app/globals.css` die Keyframes ersetzen:

```css
/* Die Atmung beginnt bei voller Stärke und senkt sich in der Mitte des
   Zyklus leicht ab — nicht umgekehrt. Vorher stand das Licht bei Ankunft
   auf 0.85 und erreichte seine Stärke erst nach ~3 s: auf der Seite, deren
   These "eine Lichtquelle" ist, kam das Licht zuletzt. */
@keyframes lichtkegel-atmen {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
```

- [ ] **Step 4: Die Quest steht sofort, die Peripherie beruhigt sich**

In `components/dashboard/daily-quest-card.tsx` das äußere `motion.div`
(Zeile ~273–278) durch ein gewöhnliches `div` ersetzen und `initial`,
`animate`, `transition` entfernen:

```tsx
    <div
      data-testid="quest-light"
      className="lichtkegel flex flex-col gap-4"
    >
```

Das schließende `</motion.div>` wird `</div>`. Den `motion`-Import nur
entfernen, wenn er in der Datei nicht anderweitig benutzt wird — `grep -n
"motion\." components/dashboard/daily-quest-card.tsx` prüfen.

Darüber den Grund festhalten:

```tsx
    /*
     * Keine Eintrittsanimation (2026-08-22, Spec §7). Vorher fuhr die
     * Quest aus opacity 0 / y 16 hoch und war dabei dunkler als die Liste
     * unter ihr. Umkehrung: die Quest steht bei Ankunft sofort auf voller
     * Stärke; nur die Peripherie beruhigt sich danach (siehe
     * quick-wins-section.tsx).
     */
```

In `components/dashboard/quick-wins-section.tsx` die Liste als Peripherie
sanft ankommen lassen — und unter `prefers-reduced-motion` gar nicht:

```tsx
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
```

```tsx
  const reduceMotion = useReducedMotion();
```

Den `<section>`-Wurzelknoten durch

```tsx
    <motion.section
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
    >
```

ersetzen; `</section>` wird `</motion.section>`.

- [ ] **Step 5: Tests laufen lassen, Erfolg prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts e2e/design-rules.spec.ts`
Expected: PASS.

- [ ] **Step 6: Im Browser ansehen**

Dashboard neu laden, dark und light: die Quest steht sofort, die Liste
darunter kommt eine Zehntelsekunde später nach. Danach mit
`prefers-reduced-motion: reduce` (Chrome DevTools → Rendering → Emulate CSS
media feature) prüfen: alles statisch, das Licht dennoch voll da.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css components/dashboard/daily-quest-card.tsx components/dashboard/quick-wins-section.tsx e2e/dashboard.spec.ts
git commit -m "fix(ui): das Licht steht bei Ankunft, nur die Peripherie beruhigt sich"
```

---

### Task 6: Mitgeführte Bugs I — Heatmap-Tooltip und englische Chrome-Texte

**Files:**
- Modify: `components/progress/progress-tabs.tsx`
- Modify: `components/theme-toggle.tsx`
- Modify: `components/layout/user-menu.tsx` (nur das `aria-label`)
- Modify: `messages/de.json`, `en.json`, `es.json`, `fr.json`, `nl.json`, `ru.json`, `zh.json`
- Modify: `e2e/progress.spec.ts`

**Interfaces:**
- Consumes: `nav`-Namespace aus Task 3 (`coin_balance`).
- Produces: i18n-Keys `nav.theme_dark`, `nav.theme_light`, `nav.theme_system`,
  `nav.theme_switch`, `nav.theme_aria`.

- [ ] **Step 1: Den Reproduktionstest schreiben**

An `e2e/progress.spec.ts` anfügen:

```ts
test("die Habits-Ansicht rendert ohne Formatierungsfehler", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/progress?tab=habits");
  await page.waitForLoadState("networkidle");
  expect(errors.filter((e) => e.includes("FORMATTING_ERROR")).join("\n")).toBe("");
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts -g "Formatierungsfehler"`
Expected: FAIL — mindestens ein `FORMATTING_ERROR`. Ursache:
`components/progress/progress-tabs.tsx:141-144` ruft
`t("cell_tooltip_one")` ohne den Platzhalter `{date}` auf. Der Konsument,
`components/habits/contribution-grid.tsx:255-259`, ersetzt `{date}` und
`{count}` selbst per `String.replace` — er will die **rohe** Nachricht, aber
`t()` formatiert sie und verlangt dafür die Werte.

- [ ] **Step 3: Die rohen Nachrichten durchreichen**

In `components/progress/progress-tabs.tsx` die drei Zeilen ersetzen:

```tsx
      // t.raw(), nicht t(): contribution-grid.tsx setzt {date} und {count}
      // selbst ein (eine Zelle pro Tag, clientseitig). t() formatiert die
      // ICU-Nachricht sofort und wirft ohne die Werte FORMATTING_ERROR —
      // bei jedem Aufruf von /progress?tab=habits.
      tooltipOne: t.raw("cell_tooltip_one"),
      tooltipOther: t.raw("cell_tooltip_other"),
      tooltipEmpty: t.raw("cell_tooltip_empty"),
```

`t.raw()` liefert `unknown`; da `gridLabels` die Felder als `string`
typisiert, die Werte einengen:

```tsx
      tooltipOne: String(t.raw("cell_tooltip_one")),
      tooltipOther: String(t.raw("cell_tooltip_other")),
      tooltipEmpty: String(t.raw("cell_tooltip_empty")),
```

- [ ] **Step 4: Theme-Umschalter und Münzzähler übersetzen**

In `components/theme-toggle.tsx`:

```tsx
import { useTranslations } from "next-intl";
```

`THEME_CONFIG` verliert die englischen Labels und behält nur Icon und
Nachfolger:

```tsx
/** Icon und Nachfolge-Theme je Zustand. Die Labels kommen aus i18n. */
const THEME_CONFIG = {
  dark: { icon: faMoon as IconDefinition, next: "light", key: "theme_dark" },
  light: { icon: faSun as IconDefinition, next: "system", key: "theme_light" },
  system: { icon: faDesktop as IconDefinition, next: "dark", key: "theme_system" },
} as const;
```

Im Körper:

```tsx
  const t = useTranslations("nav");
```

```tsx
  const label = t(config.key as "theme_dark" | "theme_light" | "theme_system");
```

```tsx
          aria-label={t("theme_aria", { theme: label })}
```

```tsx
      <TooltipContent>{t("theme_switch", { theme: label })}</TooltipContent>
```

Gleichzeitig die drei Token-Verstöße dort beheben: das `style`-Objekt am
Button und der Platzhalter vor dem Mount werden Klassen:

```tsx
      <div className="h-9 w-9 rounded-[var(--radius-sm)] bg-[var(--raised)]" aria-hidden="true" />
```

```tsx
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] text-[var(--ink)] transition-colors duration-150 hover:bg-[var(--ground)]"
```

`hover:scale-105` entfällt — eine Skalierung ist keine Aussage über den
Inhalt.

- [ ] **Step 5: Die Keys in allen sieben Locales anlegen**

Im `nav`-Namespace jeder Datei:

| Key | de | en |
|---|---|---|
| `coin_balance` | „Dein Münzstand" | „Your coin balance" |
| `theme_dark` | „Dunkel" | „Dark mode" |
| `theme_light` | „Hell" | „Light mode" |
| `theme_system` | „System" | „System theme" |
| `theme_switch` | „{theme} — klicken zum Wechseln" | „{theme} — click to switch" |
| `theme_aria` | „Theme wechseln (aktuell {theme})" | „Switch theme (currently {theme})" |
| `user_menu` | „Nutzermenü" | „User menu" |

In derselben Reihenfolge (`coin_balance`, `theme_dark`, `theme_light`,
`theme_system`, `theme_switch`, `theme_aria`, `user_menu`):

- **es:** „Tu saldo de monedas" / „Oscuro" / „Claro" / „Sistema" / „{theme} —
  haz clic para cambiar" / „Cambiar tema (actualmente {theme})" / „Menú de usuario"
- **fr:** „Votre solde de pièces" / „Sombre" / „Clair" / „Système" / „{theme} —
  cliquez pour changer" / „Changer de thème (actuellement {theme})" / „Menu utilisateur"
- **nl:** „Je muntsaldo" / „Donker" / „Licht" / „Systeem" / „{theme} — klik om
  te wisselen" / „Thema wisselen (nu {theme})" / „Gebruikersmenu"
- **ru:** „Ваш баланс монет" / „Тёмная" / „Светлая" / „Системная" / „{theme} —
  нажмите, чтобы переключить" / „Переключить тему (сейчас {theme})" / „Меню пользователя"
- **zh:** „你的金币余额" / „深色" / „浅色" / „跟随系统" / „{theme} — 点击切换" /
  „切换主题（当前：{theme}）" / „用户菜单"

Zusätzlich in `components/layout/user-menu.tsx` das in Task 3 stehen
gelassene `aria-label="User menu"` auf `t("user_menu")` umstellen
(`useTranslations("nav")` ist dort noch nicht importiert).

- [ ] **Step 6: Tests laufen lassen, Erfolg prüfen**

```bash
npm run check:i18n
npm run check:design
npx tsc --noEmit
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts e2e/navigation.spec.ts e2e/design-rules.spec.ts
```

Expected: alles grün; keine `FORMATTING_ERROR` mehr in der Konsole.

- [ ] **Step 7: Commit**

```bash
git add components/progress/progress-tabs.tsx components/theme-toggle.tsx components/layout/user-menu.tsx messages/ e2e/progress.spec.ts
git commit -m "fix(ui): Heatmap-Tooltips ohne FORMATTING_ERROR, Theme-Umschalter uebersetzt"
```

---

### Task 7: Mitgeführte Bugs II — der Versions-Defekt

Die Analyse steht oben unter „Vorgefundener Zustand". Diese Task behebt die
falsche Beruhigung vollständig und macht den stehengebliebenen Rollout
erkennbar.

**Files:**
- Create: `lib/update-status.ts`
- Create: `__tests__/update-status.test.ts`
- Modify: `lib/update-checker.ts`
- Modify: `__tests__/update-checker.test.ts`
- Modify: `app/api/health/route.ts`
- Modify: `app/(app)/admin/page.tsx` (nur der Versions-Block)
- Modify: `.github/workflows/build-and-publish.yml`
- Modify: `docs-site/deployment.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - `export type UpdateStatus = "disabled" | "failed" | "unknown" | "current" | "outdated"`
  - `export function updateStatus(r: { disabled: boolean; error?: string; latestVersion: string | null; updateAvailable: boolean }): UpdateStatus`
  - `GET /api/health` liefert zusätzlich `version: string`.

- [ ] **Step 1: Die Tests schreiben**

Neue Datei `__tests__/update-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { updateStatus } from "@/lib/update-status";

/**
 * Der Versions-Block hat fünf Zustände, und vier davon sahen in der UI
 * gleich aus: sie prüfte `!disabled && !error && !updateAvailable` und
 * zeigte darauf "Momo ist aktuell". Damit las sich "wir wissen es nicht"
 * (latestVersion === null) als Beruhigung.
 */
describe("updateStatus", () => {
  it("deaktiviert schlägt alles andere", () => {
    expect(
      updateStatus({ disabled: true, latestVersion: null, updateAvailable: false }),
    ).toBe("disabled");
  });

  it("ein Fehler ist ein Fehler, keine Beruhigung", () => {
    expect(
      updateStatus({
        disabled: false,
        error: "GitHub API returned 503",
        latestVersion: null,
        updateAvailable: false,
      }),
    ).toBe("failed");
  });

  it("ohne bekannte neueste Version ist der Zustand unbekannt, nicht aktuell", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: null, updateAvailable: false }),
    ).toBe("unknown");
  });

  it("aktuell heißt: die neueste Version ist bekannt und gleich", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: "0.6.0", updateAvailable: false }),
    ).toBe("current");
  });

  it("veraltet, wenn eine höhere Version bekannt ist", () => {
    expect(
      updateStatus({ disabled: false, latestVersion: "0.6.0", updateAvailable: true }),
    ).toBe("outdated");
  });
});
```

In `__tests__/update-checker.test.ts` zwei Fälle anfügen, die genau den
Mechanismus festnageln, der live versagt hat:

```ts
describe("checkForUpdates: eine Cache-Schicht, kein zweiter Boden", () => {
  it("fragt GitHub ohne Next-Data-Cache — sonst ist die Antwort einen Besuch alt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v9.9.9", html_url: "https://example.test" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { checkForUpdates } = await import("@/lib/update-checker");
    await checkForUpdates();
    const init = fetchMock.mock.calls[0][1] as RequestInit & {
      next?: { revalidate?: number };
    };
    // Der Fehler, den das verhindert: Modul-Cache (24 h) ÜBER
    // Next-Data-Cache (24 h). Läuft der Modul-Cache ab, liefert der
    // Data-Cache nach Stale-while-revalidate den ALTEN Wert, der dann mit
    // frischem checkedAt für weitere 24 h festgehalten wird.
    expect(init.next?.revalidate).toBeUndefined();
    expect(init.cache).toBe("no-store");
  });

  it("checkedAt stammt aus dem erfolgreichen Abruf, nicht aus dem Aufruf", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v9.9.9", html_url: "https://example.test" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { checkForUpdates } = await import("@/lib/update-checker");
    const first = await checkForUpdates();
    const second = await checkForUpdates(); // aus dem Cache
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Der zweite Aufruf zeigt den Zeitpunkt des Abrufs, nicht "jetzt".
    expect(second.checkedAt?.getTime()).toBe(first.checkedAt?.getTime());
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npm test -- update-status update-checker`
Expected: FAIL — `lib/update-status.ts` existiert nicht; der
`revalidate`-Test findet `next.revalidate === 86400` und `cache ===
undefined`.

- [ ] **Step 3: Die Entscheidungsfunktion anlegen**

Neue Datei `lib/update-status.ts`:

```ts
/**
 * Der Zustand des Versions-Blocks — fünf Fälle, nicht vier.
 *
 * Die Admin-Seite prüfte bis 2026-08-22 `!disabled && !error &&
 * !updateAvailable` und rendere darauf "Momo ist aktuell — du verwendest
 * die neueste Version". Damit fiel jeder Zustand, der nicht eindeutig
 * "veraltet" war, in dieselbe Beruhigung — auch der, in dem die neueste
 * Version schlicht unbekannt ist. Live stand deshalb "Momo ist aktuell"
 * über einer 0.5.0-Instanz, während 0.6.0 seit einem Tag veröffentlicht
 * war.
 */
export type UpdateStatus = "disabled" | "failed" | "unknown" | "current" | "outdated";

/**
 * Bildet ein Prüfergebnis auf genau einen darstellbaren Zustand ab.
 *
 * @param r - Das Ergebnis von checkForUpdates()
 * @returns Der Zustand, den die UI zeigen darf
 */
export function updateStatus(r: {
  disabled: boolean;
  error?: string;
  latestVersion: string | null;
  updateAvailable: boolean;
}): UpdateStatus {
  if (r.disabled) return "disabled";
  if (r.error) return "failed";
  if (r.latestVersion === null) return "unknown";
  return r.updateAvailable ? "outdated" : "current";
}
```

- [ ] **Step 4: Eine Cache-Schicht statt zwei**

In `lib/update-checker.ts` den `fetch`-Aufruf ändern:

```ts
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          "User-Agent": `momo-update-checker/${CURRENT_VERSION}`,
          Accept: "application/vnd.github+json",
        },
        // Bewusst KEIN next.revalidate (bis 2026-08-22: 86400).
        //
        // Zwei Cache-Schichten übereinander — Modul-Cache 24 h über
        // Next-Data-Cache 24 h — machten die Antwort strukturell falsch,
        // nicht nur alt: checkForUpdates() läuft nur, wenn jemand die
        // Admin-Seite öffnet. Ist der Modul-Cache abgelaufen, liefert der
        // Data-Cache bei abgelaufenem Eintrag nach
        // Stale-while-revalidate den ALTEN Wert und erneuert erst im
        // Hintergrund; dieser alte Wert wurde dann mit checkedAt = jetzt
        // gestempelt und weitere 24 h festgehalten. Die Anzeige war damit
        // dauerhaft einen Besuch hinterher und trug immer einen frischen
        // Zeitstempel. Der Modul-Cache allein reicht: ein Abruf pro
        // Prozess und Tag, weit innerhalb der 60 req/h ohne Token.
        cache: "no-store",
      }
    );
```

Im Kopfkommentar der Datei den Grund festhalten:

```ts
 * Genau EINE Cache-Schicht: der Modul-Cache unten. Der frühere zweite
 * Boden (next.revalidate) hat die Antwort um einen Besuch verzögert und
 * dabei "Momo ist aktuell" über eine drei Monate alte Instanz geschrieben
 * — siehe den Kommentar am fetch().
```

- [ ] **Step 5: Die Version unauthentifiziert sichtbar machen**

In `app/api/health/route.ts`:

```ts
import { CURRENT_VERSION } from "@/lib/update-checker";
```

Den Erfolgs-Response erweitern:

```ts
    return Response.json({
      status: "ok",
      version: CURRENT_VERSION,
      timestamp: new Date().toISOString(),
      cron: cronInfo,
    });
```

Und im Kopfkommentar:

```ts
 * `version` ist die Version des laufenden Images (aus package.json). Sie
 * steht hier, weil ein stehengebliebener Rollout sonst unsichtbar ist: die
 * einzige Stelle, die eine Version zeigte, lag hinter Admin-Login, und
 * genau dort stand am 2026-08-22 "Momo ist aktuell" über einer Instanz,
 * die drei Monate alt war. Eine Version ist kein Geheimnis — sie steht in
 * jedem veröffentlichten Image-Tag.
```

- [ ] **Step 6: Der Admin-Block sagt, was er weiß**

In `app/(app)/admin/page.tsx` den Import ergänzen und die vier Zweige des
Versions-Blocks auf `updateStatus()` umstellen:

```tsx
import { updateStatus } from "@/lib/update-status";
```

```tsx
  const status = updateStatus(updateCheck);
```

- `{updateCheck.disabled && …}` → `{status === "disabled" && …}`
- `{!updateCheck.disabled && updateCheck.error && …}` → `{status === "failed" && …}`
- Der „Up to date"-Zweig `{!updateCheck.disabled && !updateCheck.error &&
  !updateCheck.updateAvailable && …}` → `{status === "current" && …}` und im
  Text die neueste Version mitnennen, damit die Aussage prüfbar ist:

  ```tsx
                  Momo ist aktuell — v{updateCheck.latestVersion} ist die neueste Version.
  ```

- `{!updateCheck.disabled && updateCheck.updateAvailable && …}` → `{status === "outdated" && …}`
- **Neu**, hinter dem Fehler-Zweig, der bisher fehlende fünfte Fall:

  ```tsx
          {/* Neueste Version unbekannt — nicht als "aktuell" ausgeben.
              Das war der Defekt: latestVersion === null landete im
              Up-to-date-Zweig und beruhigte über einen Zustand, den
              niemand geprüft hatte. */}
          {status === "unknown" && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-3">
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="h-4 w-4 shrink-0 text-[var(--ink-3)]"
                aria-hidden="true"
              />
              <span className="text-sm text-[var(--ink-2)]">
                Die neueste Version ist unbekannt — die Prüfung hat keine
                Antwort geliefert.
              </span>
            </div>
          )}
  ```

Die übrigen Verstöße dieser Datei (117 Zähler) bleiben Phase 3; angefasst
wird nur der Versions-Block.

- [ ] **Step 7: Der Rollout beweist sich, statt sich zu behaupten**

In `.github/workflows/build-and-publish.yml` den `deploy`-Job erweitern:

```yaml
      - name: Trigger Watchtower update
        run: |
          curl -sf -X POST \
            -H "Authorization: Bearer ${{ secrets.WATCHTOWER_API_TOKEN }}" \
            "http://watchtower:8085/v1/update?image=ghcr.io/jp1337/momo"

      # Watchtower antwortet mit 200, sobald es die Anfrage angenommen hat —
      # nicht, wenn der Container tatsaechlich getauscht ist. Am 2026-08-22
      # war jeder Lauf gruen, waehrend live seit drei Monaten dasselbe Image
      # lief. Ohne diesen Schritt ist "deploy: success" eine Aussage ueber
      # einen HTTP-Status, nicht ueber den Rollout.
      - name: Verify the rollout actually happened
        env:
          APP_URL: ${{ vars.NEXT_PUBLIC_APP_URL || 'https://momotask.app' }}
          EXPECTED: ${{ github.sha }}
        run: |
          set -euo pipefail
          want="$(curl -sf "https://raw.githubusercontent.com/${{ github.repository }}/${{ github.sha }}/package.json" | jq -r .version)"
          echo "erwartete Version: $want"
          for attempt in $(seq 1 30); do
            got="$(curl -sf "$APP_URL/api/health" | jq -r .version || echo '?')"
            if [ "$got" = "$want" ]; then
              echo "Rollout bestaetigt nach ${attempt} Versuch(en): $got"
              exit 0
            fi
            echo "Versuch $attempt: laeuft $got, erwartet $want"
            sleep 20
          done
          echo "Rollout nicht bestaetigt: /api/health meldet weiter eine andere Version."
          echo "Watchtower hat die Anfrage angenommen, den Container aber nicht getauscht."
          exit 1
```

- [ ] **Step 8: Tests laufen lassen, Erfolg prüfen**

```bash
npm test -- update-status update-checker
npx tsc --noEmit
npm run lint
curl -s localhost:3000/api/health | jq .
```

Expected: Vitest grün; `/api/health` liefert `"version": "0.6.0"`.

Der neue Workflow-Schritt lässt sich vor dem Merge nicht scharf prüfen —
seine erste Ausführung ist der Test. Das ist bewusst so benannt: er darf
fehlschlagen, und wenn er fehlschlägt, ist das der Befund, nicht der Fehler.

- [ ] **Step 9: Dokumentieren**

In `docs-site/deployment.md` im Abschnitt zum Health-Endpunkt das neue Feld
aufnehmen:

```markdown
| Feld | Bedeutung |
|---|---|
| `status` | `ok`, oder `error` bei nicht erreichbarer Datenbank (HTTP 503) |
| `version` | Version des laufenden Images. Der schnellste Weg, einen stehengebliebenen Rollout zu erkennen: `curl -s https://<host>/api/health \| jq -r .version` |
| `timestamp` | Zeitpunkt der Antwort |
| `cron` | Letzter Cron-Lauf; rein informativ, nie Grund für einen Fehlerstatus |
```

In `CHANGELOG.md` unter `### Fixed`:

```markdown
- **„Momo ist aktuell" konnte über eine veraltete Instanz stehen.** Der Update-Checker
  hatte zwei Cache-Schichten übereinander (Modul-Cache 24 h über Next-Data-Cache 24 h).
  Da die Prüfung nur beim Öffnen der Admin-Seite läuft, lieferte der Data-Cache nach
  Ablauf per Stale-while-revalidate die vorherige Antwort — die dann mit frischem
  Zeitstempel für weitere 24 h festgehalten wurde. Die Anzeige war damit dauerhaft einen
  Besuch hinterher. Zusätzlich zeigte die Admin-Seite „du verwendest die neueste Version"
  auch dann, wenn die neueste Version unbekannt war. Beides behoben: eine Cache-Schicht,
  fünf unterscheidbare Zustände, und `GET /api/health` gibt die laufende Version aus, damit
  ein stehengebliebener Rollout ohne Login sichtbar ist. Die Publish-Pipeline prüft den
  Rollout jetzt gegen diesen Endpunkt, statt Watchtowers HTTP 200 als Erfolg zu lesen.
```

- [ ] **Step 10: Commit**

```bash
git add lib/update-status.ts lib/update-checker.ts __tests__/update-status.test.ts __tests__/update-checker.test.ts app/api/health/route.ts "app/(app)/admin/page.tsx" .github/workflows/build-and-publish.yml docs-site/deployment.md CHANGELOG.md
git commit -m "fix(deploy): Versionsanzeige und Rollout-Pruefung sagen die Wahrheit"
```

---

### Task 8: `/tasks` — die Zeile ohne Chips, `task-item.tsx` zerlegt

340 Verstöße liegen in Phase 1, der größte Teil davon hier: `task-item.tsx`
(45, 803 Zeilen) und `task-list.tsx` (46, 1467 Zeilen). Die Vorgängerspec
hatte das Zerlegen ausdrücklich ausgenommen; mit dem Listen-Primitive ist es
unvermeidlich und damit Teil dieser Arbeit.

**Files:**
- Create: `components/tasks/task-groups.ts`
- Create: `__tests__/task-groups.test.ts`
- Create: `components/tasks/task-row.tsx`
- Create: `components/tasks/task-row-actions.tsx`
- Create: `components/tasks/use-task-swipe.ts`
- Create: `components/tasks/tasks-rail.tsx`
- Modify: `app/(app)/tasks/page.tsx`
- Modify: `components/tasks/task-list.tsx`
- Modify: `components/shared/search-filter-bar.tsx`
- Modify: `e2e/helpers/design-count.ts` (`MIGRATED_PAGES`)
- Delete: `components/tasks/task-item.tsx`

**Interfaces:**
- Consumes: `PageFrame` (Task 1), `List`/`Row`/`GroupHeading`/`effortStep` (Task 4), `EmptyState` (Task 4).
- Produces:
  - `export type PriorityKey = "HIGH" | "NORMAL" | "SOMEDAY"`
  - `export interface PriorityGroup<T> { key: PriorityKey; items: T[] }`
  - `export function groupByPriority<T extends { priority: PriorityKey }>(items: T[]): PriorityGroup<T>[]`
  - `export function TaskRow(props: TaskRowProps)` — dieselben Props wie `TaskItem` heute, minus `coinValue` (wandert in den Rand) und minus `energyLevel` (die Energie ist keine Zeilenfarbe mehr; sie steuert weiterhin die Auswahl im Backend).
  - `export function TaskRowActions(props: TaskRowActionsProps)`
  - `export function useTaskSwipe(args: { onComplete: () => void; onDelete: () => void; disabled: boolean }): { swipeX: number; isSwiping: boolean; handlers: { onTouchStart: (e: React.TouchEvent) => void; onTouchMove: (e: React.TouchEvent) => void; onTouchEnd: () => void } }`
  - `export function TasksRail(props: { open: number; overdue: number; coins: number; filterGroups: FilterGroup[]; onFilterChange: (key: string, value: string | null) => void; onClear: () => void }): JSX.Element`

- [ ] **Step 1: Den Test für die Gruppierung schreiben**

Neue Datei `__tests__/task-groups.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupByPriority } from "@/components/tasks/task-groups";

/**
 * Priorität wird zur Gruppenüberschrift statt zum Abzeichen an jeder
 * Zeile. Eine Überschrift "HOCH · 2" kodiert etwas Wahres über den
 * Inhalt; ein amberfarbenes Abzeichen an jeder Zeile behauptet nur
 * Wichtigkeit.
 */
describe("groupByPriority", () => {
  it("sortiert HIGH vor NORMAL vor SOMEDAY", () => {
    const groups = groupByPriority([
      { priority: "SOMEDAY" as const, id: "c" },
      { priority: "HIGH" as const, id: "a" },
      { priority: "NORMAL" as const, id: "b" },
    ]);
    expect(groups.map((g) => g.key)).toEqual(["HIGH", "NORMAL", "SOMEDAY"]);
  });

  it("lässt leere Gruppen weg — eine Überschrift ohne Zeilen ist Lärm", () => {
    const groups = groupByPriority([{ priority: "NORMAL" as const, id: "b" }]);
    expect(groups.map((g) => g.key)).toEqual(["NORMAL"]);
  });

  it("erhält die Eingabereihenfolge innerhalb einer Gruppe", () => {
    const groups = groupByPriority([
      { priority: "HIGH" as const, id: "a" },
      { priority: "HIGH" as const, id: "b" },
    ]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("gibt für eine leere Liste keine Gruppen zurück", () => {
    expect(groupByPriority([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `npm test -- task-groups`
Expected: FAIL — `components/tasks/task-groups.ts` existiert nicht.

- [ ] **Step 3: Die Gruppierung anlegen**

Neue Datei `components/tasks/task-groups.ts`:

```ts
/**
 * Gruppierung nach Priorität — rein, ohne JSX, damit sie in Vitest
 * (Node-Umgebung) prüfbar ist.
 */
export type PriorityKey = "HIGH" | "NORMAL" | "SOMEDAY";

export interface PriorityGroup<T> {
  key: PriorityKey;
  items: T[];
}

/** Feste Reihenfolge — das Wichtigste zuerst, ohne Farbe. */
const ORDER: readonly PriorityKey[] = ["HIGH", "NORMAL", "SOMEDAY"];

/**
 * Teilt Aufgaben in Prioritätsgruppen, in fester Reihenfolge, ohne leere
 * Gruppen, unter Erhalt der Eingabereihenfolge innerhalb einer Gruppe.
 *
 * @param items - Aufgaben mit einem Prioritätsfeld
 * @returns Gruppen in der Reihenfolge HIGH, NORMAL, SOMEDAY
 */
export function groupByPriority<T extends { priority: PriorityKey }>(
  items: T[],
): PriorityGroup<T>[] {
  return ORDER.map((key) => ({ key, items: items.filter((i) => i.priority === key) })).filter(
    (g) => g.items.length > 0,
  );
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `npm test -- task-groups`
Expected: PASS, 4 Fälle.

- [ ] **Step 5: Die Wisch-Logik herauslösen**

Neue Datei `components/tasks/use-task-swipe.ts`. Die Logik ist Zeile für
Zeile die aus `task-item.tsx:209-246`, nur als Hook verpackt — Schwelle 80,
Maximum 110, Achsensperre über den Y-Vergleich mit 10 px Toleranz:

```ts
"use client";

import { useRef, useState } from "react";

/** Ab dieser Auslenkung löst das Wischen aus. */
const SWIPE_THRESHOLD = 80;
/** Weiter als das folgt die Zeile dem Finger nicht. */
const SWIPE_MAX = 110;

/**
 * Wischen zum Abhaken (nach rechts) und zum Löschen (nach links).
 *
 * Wörtlich aus task-item.tsx übernommen; hier als Hook, damit die Zeile
 * selbst nichts als Darstellung ist. Die Achsensperre ist der Grund, warum
 * die Seite beim vertikalen Wischen weiter scrollt: ist die Bewegung mehr
 * vertikal als horizontal (plus 10 px Toleranz), bricht die Geste ab.
 *
 * @param onComplete - wird bei einem Wisch nach rechts aufgerufen
 * @param onDelete - wird bei einem Wisch nach links aufgerufen
 * @param disabled - true, wenn die Zeile gerade bearbeitet oder erledigt ist
 * @returns Auslenkung, Wischzustand und die drei Touch-Handler
 */
export function useTaskSwipe({
  onComplete,
  onDelete,
  disabled,
}: {
  onComplete: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /** Beginnt die Verfolgung einer möglichen horizontalen Wischgeste. */
  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  /** Aktualisiert die Auslenkung; bricht bei vertikaler Geste ab. */
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) + 10) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    setIsSwiping(true);
    setSwipeX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, deltaX)));
  };

  /** Löst die Aktion aus oder schnappt zurück. */
  const onTouchEnd = () => {
    if (touchStartX.current !== null) {
      if (swipeX > SWIPE_THRESHOLD) onComplete();
      else if (swipeX < -SWIPE_THRESHOLD) onDelete();
    }
    setSwipeX(0);
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return { swipeX, isSwiping, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
```

An der Logik nichts ändern — `e2e/tasks.spec.ts` deckt das Abhaken ab und
muss ohne Anpassung grün bleiben. Der 300-ms-Timeout aus
`handleCheckboxChange` (`task-item.tsx:199-206`) bleibt in `TaskRow`, nicht
im Hook: er gehört zur Abhak-Animation, nicht zur Geste.

- [ ] **Step 6: Die Aktionen herauslösen**

Neue Datei `components/tasks/task-row-actions.tsx`. Inhalt: das Markup aus
`task-item.tsx` ab „Edit and delete action buttons" (Zeilen ~615–800) —
Bearbeiten, Löschen (`ConfirmButton`), Snooze-Menü (`DropdownMenu`),
Aufteilen (`TaskBreakdownModal`), Verschieben/Zum Thema. Wörtlich
übernommen, mit genau diesen Ersetzungen:

| vorher | nachher |
|---|---|
| `className="p-1.5 rounded-lg …"` (7×) | `className="p-2 rounded-[var(--radius-sm)] …"` |
| `className="py-1 rounded-lg shadow-lg min-w-[160px] z-50"` | `className="py-1 rounded-[var(--radius-md)] min-w-[160px] z-50 shadow-[var(--shadow-overlay)]"` |
| jedes `style={{ color: "var(--text-muted)" }}` | `className="… text-[var(--ink-3)]"` |
| jedes `style={{ color: "var(--accent-amber)" }}` | `className="… text-[var(--ink-2)]"` — eine Aktion in einer Zeile ist nicht *die* Handlung der Seite |

- [ ] **Step 7: Die Zeile schreiben**

Neue Datei `components/tasks/task-row.tsx`:

```tsx
"use client";

/**
 * TaskRow — eine Aufgabe als Zeile.
 *
 * Ersetzt components/tasks/task-item.tsx (803 Zeilen, sechs Metadaten,
 * fünf davon farbcodiert). Die Zeile ist jetzt nichts als Text:
 *
 * | Feld | vorher | jetzt |
 * |---|---|---|
 * | Priorität | Chip, amber/rot/grau getönt | Gruppenüberschrift in task-list |
 * | Thema | Chip mit `${topicColor}22` Füllung und `${topicColor}44` Rahmen | Mono-Eyebrow + 6-px-Punkt |
 * | Dauer | grüner "60 min"-Chip PLUS Aufwandsgröße — dieselbe Information zweimal | die Aufwandsgröße, Minuten rechts in Mono |
 * | Fälligkeit | Text, --accent-red bei Überfälligkeit | Text rechts, --danger nur bei Überfälligkeit |
 * | Coins | Text plus Münz-Icon | in den Rand (tasks-rail.tsx) |
 * | Energie | Chip amber/grün/grau | entfällt in der Zeile; sie steuert weiter die Auswahl |
 */

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Row, effortStep } from "@/components/ui/list";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { useTaskSwipe } from "@/components/tasks/use-task-swipe";

export interface TaskRowProps {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate?: string | null;
  nextDueDate?: string | null;
  topicTitle?: string | null;
  topicColor?: string | null;
  topicId?: string | null;
  estimatedMinutes?: number | null;
  snoozedUntil?: string | null;
  isBlocked?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onInlineEdit?: (id: string, newTitle: string) => void;
  onPromote?: (id: string) => void;
  onGoToTopic?: (topicId: string) => void;
  onBreakdown?: (id: string) => void;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onUnsnooze?: (id: string) => void;
  onToggleSelect?: (id: string) => void;
}

/**
 * Eine Aufgabenzeile.
 *
 * @param props - siehe TaskRowProps
 * @returns Eine Row ohne Fläche, ohne Rahmen, ohne Chip
 */
export function TaskRow(props: TaskRowProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const isCompleted = props.completedAt !== null;
  const displayDate = props.type === "RECURRING" ? props.nextDueDate : props.dueDate;

  /**
   * Formatiert ein YYYY-MM-DD-Datum für die rechte Spalte.
   * Wörtlich die Logik aus task-item.tsx formatDueDate().
   */
  function formatDueDate(dateStr: string): { text: string; overdue: boolean } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + "T00:00:00");
    if (due < today) {
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
      return {
        text: diffDays === 1 ? t("date_yesterday") : t("date_overdue", { days: diffDays }),
        overdue: true,
      };
    }
    if (due.getTime() === today.getTime()) return { text: t("date_today"), overdue: false };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (due.getTime() === tomorrow.getTime())
      return { text: t("date_tomorrow"), overdue: false };
    return {
      text: due.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      overdue: false,
    };
  }

  const due = displayDate ? formatDueDate(displayDate) : null;

  return (
    <Row
      testId="task-row"
      effort={effortStep(props.estimatedMinutes ?? null)}
      dimmed={isCompleted}
      dotColor={props.topicColor ?? null}
      lead={
        <button
          type="button"
          onClick={() => (isCompleted ? props.onUncomplete(props.id) : props.onComplete(props.id))}
          disabled={props.isBlocked && !isCompleted}
          aria-label={
            isCompleted
              ? t("aria_uncomplete", { title: props.title })
              : t("aria_complete", { title: props.title })
          }
          className="-m-2 flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-0 bg-transparent p-2 transition-colors hover:bg-[var(--raised)] disabled:cursor-not-allowed"
        >
          <span
            aria-hidden="true"
            className={
              isCompleted
                ? "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2 border-[var(--done)] bg-[var(--done)]"
                : "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2 border-[var(--ink-3)] bg-transparent"
            }
          />
        </button>
      }
      title={props.title}
      eyebrow={props.topicTitle ?? undefined}
      trailing={
        due ? (
          <span className={due.overdue ? "text-[var(--danger)]" : undefined}>
            {props.type === "RECURRING" ? t("date_next", { date: due.text }) : due.text}
          </span>
        ) : props.estimatedMinutes ? (
          `${props.estimatedMinutes} min`
        ) : undefined
      }
      actions={<TaskRowActions {...props} onStartEdit={() => setIsEditing(true)} />}
    />
  );
}
```

Die Inline-Titelbearbeitung (Doppelklick) bleibt erhalten: der `isEditing`-
Zweig übernimmt das `<input>`-Markup aus `task-item.tsx:420-440`, mit
`bg-[var(--raised)] border border-[var(--hairline)]
rounded-[var(--radius-sm)]` statt der Inline-Styles.

- [ ] **Step 8: Den Rand von `/tasks` bauen**

Neue Datei `components/tasks/tasks-rail.tsx`:

```tsx
"use client";

/**
 * Der Rand von /tasks: Zähler und die Filter.
 *
 * "In die Lesespalte gehört, was der Nutzer tut. In den Rand gehört, was
 * die App über seinen Tag sagt." Die Coins der einzelnen Zeilen landen
 * hier als Summe statt an jeder Zeile — und der Rand trägt nie Amber.
 */
import { useTranslations } from "next-intl";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";

export function TasksRail({
  open,
  overdue,
  coins,
  filterGroups,
  onFilterChange,
  onClear,
}: {
  open: number;
  overdue: number;
  coins: number;
  filterGroups: FilterGroup[];
  onFilterChange: (key: string, value: string | null) => void;
  onClear: () => void;
}) {
  const t = useTranslations("tasks");
  return (
    <>
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
        {t("rail_open", { count: open })}
      </p>
      {/* Überfällige nur zeigen, wenn es welche gibt: eine Null als Tatsache
          zu präsentieren ist ein täglicher kleiner Vorwurf (Spec §6). */}
      {overdue > 0 && (
        <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--danger)]">
          {t("rail_overdue", { count: overdue })}
        </p>
      )}
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]">
        {t("rail_coins", { coins })}
      </p>
      <SearchFilterBar
        filterGroups={filterGroups}
        onFilterChange={onFilterChange}
        onClearAll={onClear}
      />
    </>
  );
}
```

Drei neue Keys in **allen sieben** `messages/*.json` unter `tasks`:

| Locale | `rail_open` | `rail_overdue` | `rail_coins` |
|---|---|---|---|
| de | `{count} offen` | `{count} überfällig` | `{coins} Münzen möglich` |
| en | `{count} open` | `{count} overdue` | `{coins} coins available` |
| es | `{count} abiertas` | `{count} vencidas` | `{coins} monedas disponibles` |
| fr | `{count} en cours` | `{count} en retard` | `{coins} pièces à gagner` |
| nl | `{count} open` | `{count} te laat` | `{coins} munten te halen` |
| ru | `открыто: {count}` | `просрочено: {count}` | `можно получить: {coins}` |
| zh | `{count} 项待办` | `{count} 项已逾期` | `可获得 {coins} 枚硬币` |

- [ ] **Step 9: Amber aus dem Filterbalken und dem Anlegen-Button nehmen**

In `components/shared/search-filter-bar.tsx:188-193` — die `Alle`-Pillen
tragen Amber heute als **Fläche und Rahmen** gleichzeitig, beide Hälften der
Regel auf einmal:

```tsx
    <button
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 text-xs font-medium transition-colors duration-150",
        active
          ? "bg-[var(--raised)] text-[var(--ink)] border border-[var(--hairline)]"
          : "bg-transparent text-[var(--ink-3)] border border-transparent",
      )}
    >
```

Der ausgewählte Zustand ist eine Affordanz und darf deshalb eine Kante
haben — aber keine Lichtfarbe. Ebenso in `search-filter-bar.tsx:162` das
`style={{ color: "var(--accent-amber)" }}` auf `text-[var(--ink-2)]` setzen.

In `components/tasks/task-list.tsx:838` trägt „+ Neue Aufgabe" Amber als
Fläche. Der Button wird `Button variant="primary"` aus
`components/ui/button.tsx` — dort ist Amber Text, nicht Fläche, und das ist
dann **das eine** Amber der Seite. Die Amber-Vorkommen in
`task-list.tsx:777-781` (Umschalter „nach Thema"), `:902`, `:1138`, `:1153`
und die Sequenz-Linie werden `--ink-2` bzw. `--hairline`; die beiden
Leerzustands-Konfigurationen (`:204`, `:208`) verlieren Icon und Halo und
werden `EmptyState`:

```tsx
        <EmptyState
          line={t("empty_generic")}
          action={
            <Button variant="quiet" size="md" onClick={() => setShowCreateForm(true)}>
              {t("empty_cta")}
            </Button>
          }
        />
```

Die vier tageszeitabhängigen Leertexte (`empty_morning`, `empty_evening` …)
werden auf **einen** Text reduziert: „Der Text sagt, was zu tun ist, in der
Stimme der Oberfläche — nicht was schiefging und nicht, wie schade es ist."
Die alten Keys bleiben in `messages/*.json` stehen, damit `check:i18n` nicht
über verwaiste Verweise stolpert; diese zwei kommen in allen sieben dazu:

| Locale | `empty_generic` | `empty_cta` |
|---|---|---|
| de | `Keine Aufgabe hier. Eine reicht.` | `Aufgabe anlegen` |
| en | `Nothing here. One is enough.` | `Add a task` |
| es | `Nada por aquí. Con una basta.` | `Crear tarea` |
| fr | `Rien ici. Une seule suffit.` | `Créer une tâche` |
| nl | `Niets hier. Eén is genoeg.` | `Taak toevoegen` |
| ru | `Здесь ничего нет. Хватит и одной.` | `Создать задачу` |
| zh | `这里什么都没有。一个就够了。` | `新建任务` |

- [ ] **Step 10: Die Seite auf den Rahmen setzen**

Zähler und Filter hängen am Zustand von `TaskList` (`filteredTasks`,
`priorityFilter`, `topicFilter`). Der Rahmen gehört deshalb **in** die
Client-Komponente, nicht in die Serverseite — sonst müsste der Zustand nach
oben gereicht werden, nur damit der Rand ihn lesen kann.

`app/(app)/tasks/page.tsx` wird damit auf drei Zeilen kürzer: der Container
`max-w-4xl mx-auto`, der `<div className="mb-8">` mit `<h1>` und
`DueTodayBanner` entfallen, die Überschrift geht als Prop mit:

```tsx
  return (
    <TaskList
      initialTasks={serializedTasks}
      topics={serializedTopics}
      pageTitle={t("page_title")}
    />
  );
```

`dueTodayCount` und seine Berechnung entfallen dort ebenfalls — „überfällig"
zählt `TaskList` aus den Aufgaben, die es ohnehin im Zustand hält.

`TaskList` rendert intern:

```tsx
    <PageFrame rail={<TasksRail open={openCount} overdue={overdueCount} coins={coinSum} filterGroups={filterGroups} onFilterChange={handleFilterChange} onClear={clearAllFilters} />}>
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {pageTitle}
      </h1>
      {groupByPriority(filteredTasks).map((group) => (
        <section key={group.key}>
          <GroupHeading>
            {t(`priority_${group.key.toLowerCase()}` as "priority_high" | "priority_normal" | "priority_someday")} · {group.items.length}
          </GroupHeading>
          <List>
            {group.items.map((task) => (
              <TaskRow key={task.id} {...taskProps(task)} />
            ))}
          </List>
        </section>
      ))}
    </PageFrame>
```

`DueTodayBanner` entfällt: „überfällig" steht jetzt im Rand, und ein Banner
ist ein Kasten. Die Datei `components/tasks/due-today-banner.tsx` bleibt
liegen (kein Aufrufer mehr) und wird in Phase 2 mit dem Rest entfernt —
`grep -rn "DueTodayBanner" app components` muss danach leer sein außer der
Datei selbst.

- [ ] **Step 11: `/tasks` in die Regel-Liste aufnehmen und `task-item.tsx` löschen**

In `e2e/helpers/design-count.ts`:

```ts
export const MIGRATED_PAGES: string[] = ["/dashboard", "/tasks"];
```

```bash
grep -rn "task-item" app components e2e   # muss leer sein
git rm components/tasks/task-item.tsx
```

- [ ] **Step 12: Tests laufen lassen, Erfolg prüfen**

```bash
npx tsc --noEmit
npm run lint
npm run check:i18n
npm run check:design
npm test -- task-groups
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/tasks.spec.ts e2e/design-rules.spec.ts e2e/user-journey.spec.ts
```

Expected: alles grün. `check:design` muss einen **Rückgang** melden; mit
`npm run check:design -- --update` festschreiben und die neue Summe in die
Commit-Message nehmen.

- [ ] **Step 13: Im Browser ansehen**

`/tasks` bei 1440 px und 375 px, dark und light: keine Chips, Gruppen mit
Mono-Überschrift und Anzahl, Themenpunkt 6 px, Filter im Rand, genau ein
Amber („+ Neue Aufgabe" als Text), Spalte 640 px. Eine Aufgabe abhaken,
wischen, inline umbenennen, snoozen — die Interaktionen dürfen der
Umstellung nicht zum Opfer gefallen sein.

- [ ] **Step 14: Commit**

```bash
git add -A components/tasks components/shared/search-filter-bar.tsx "app/(app)/tasks/page.tsx" __tests__/task-groups.test.ts e2e/helpers/design-count.ts messages/ scripts/design-baseline.json
git commit -m "feat(tasks): Zeile ohne Chips, Prioritaet als Gruppe, task-item zerlegt"
```

---

### Task 9: `/focus` — die Bühne

63 Verstöße, acht Balken über 1500 px, kein `<main>`. `/focus` hat **keinen
Rand**: eine Bühne, auf der eine Sache zählt.

**Files:**
- Modify: `app/focus/layout.tsx`
- Modify: `components/focus/focus-mode-view.tsx`
- Modify: `e2e/helpers/design-count.ts`
- Modify: `e2e/focus-quick.spec.ts`

**Interfaces:**
- Consumes: `PageFrame`, `List`/`Row`/`effortStep`, `EmptyState`.
- Produces: `<main>` in `app/focus/layout.tsx` — ohne das haben die Zähler
  keinen Wurzelknoten und `countBoxes` fällt auf `document.body` zurück.

- [ ] **Step 1: `/focus` in die Regel-Liste aufnehmen (der Test zuerst)**

```ts
export const MIGRATED_PAGES: string[] = ["/dashboard", "/tasks", "/focus"];
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts -g "/focus"`
Expected: FAIL — Kästen (acht Aufgabenbalken mit Fläche und Rahmen),
`keine [data-column] gefunden`, und je nach Theme mehrere Amber-Treffer.

- [ ] **Step 3: `<main>` und Rahmen**

In `app/focus/layout.tsx` das äußere `<div>` durch `<main>` ersetzen und die
Inline-Styles auf Klassen ziehen (`bg-[var(--ground)]`,
`text-[var(--ink)]`).

In `components/focus/focus-mode-view.tsx` den Inhalt in
`<PageFrame>` ohne `rail` setzen. Die acht Aufgabenbalken werden eine
`List` mit `Row`:

```tsx
      <List>
        {tasks.map((task) => (
          <Row
            key={task.id}
            testId="focus-row"
            effort={effortStep(task.estimatedMinutes)}
            title={task.title}
            eyebrow={topicTitle(task.topicId) ?? undefined}
            dotColor={topicColor(task.topicId)}
            trailing={task.estimatedMinutes ? `${task.estimatedMinutes} min` : undefined}
            lead={/* der bestehende Auswahl-Button, Klassen wie in TaskRow */}
          />
        ))}
      </List>
```

Die gewählte Aufgabe bleibt die Bühne: sie behält ihre große Darstellung und
ist das **eine** Fraunces-Element der Seite (`text-[clamp(1.75rem,4.1vw,2.85rem)]`,
`font-[family-name:var(--font-display)]`). Der Start-Button wird `Button
variant="primary"` und ist damit das eine Amber.

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

```bash
npx tsc --noEmit && npm run check:design && npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/focus-quick.spec.ts e2e/design-rules.spec.ts
```

Expected: grün; `check:design` meldet einen Rückgang, mit `--update`
festschreiben.

- [ ] **Step 5: Im Browser ansehen, dann Commit**

`/focus` bei 1440 px und 375 px, dark und light: keine Balken über die
gesamte Breite, eine Bühne, ein Licht.

```bash
git add app/focus components/focus e2e/helpers/design-count.ts scripts/design-baseline.json
git commit -m "feat(ui): /focus als Buehne — eine Liste, ein Licht, ein main"
```

---

### Task 10: `/topics` — Liste statt Raster, und der Wortumbruch

28 Verstöße in `topic-card.tsx`, 27 in `topics-grid.tsx`, ein 3-Spalten-
Raster für eine Karte, und ein Kartentitel, der mitten im Wort bricht
(„Steuererklärun g 2025").

**Files:**
- Modify: `app/(app)/topics/page.tsx`
- Modify: `components/topics/topics-grid.tsx`
- Modify: `components/topics/topic-card.tsx`
- Modify: `components/ui/list.tsx` (neues Prop `wrapTitle`)
- Modify: `e2e/helpers/design-count.ts`
- Modify: `e2e/topics.spec.ts`

**Interfaces:**
- Consumes: `PageFrame`, `List`/`Row`, `EmptyState`.
- Produces: nichts Neues.

- [ ] **Step 1: Die Tests schreiben**

`/topics` in `MIGRATED_PAGES` aufnehmen, und an `e2e/topics.spec.ts`
anfügen:

```ts
test("ein langer Themenname bricht nicht mitten im Wort", async ({ page, request }) => {
  const topic = await createTopic(request, "Steuererklärung 2025");
  await page.goto("/topics");
  const title = page.getByTestId("topic-row").filter({ hasText: "Steuererkl" }).first();
  const style = await title.evaluate((n) => {
    const c = getComputedStyle(n.querySelector("[data-row-title]") ?? n);
    return { wordBreak: c.wordBreak, overflowWrap: c.overflowWrap };
  });
  // word-break: break-word (der veraltete Alias) bricht innerhalb von
  // Wörtern, die auf die nächste Zeile gepasst hätten. overflow-wrap
  // break-word bricht nur, wenn ein Wort allein nicht in die Zeile passt.
  expect(style.wordBreak).not.toBe("break-word");
  expect(style.overflowWrap).toBe("break-word");
  await deleteTopic(request, topic.id);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/topics.spec.ts e2e/design-rules.spec.ts -g "topics|/topics"`
Expected: FAIL — `wordBreak` ist `break-word`
(`components/topics/topic-card.tsx:121-122` setzt beides gleichzeitig), und
die Regel-Tests melden Kästen sowie eine fehlende `[data-column]`.

- [ ] **Step 3: Aus der Karte wird eine Zeile**

`components/topics/topic-card.tsx` wird zur Zeile umgebaut: das
`<h3>`-Element samt `overflowWrap`/`wordBreak`-Inline-Style entfällt, der
Titel geht als `title` in `Row`, der Fortschritt („3/7") als `trailing` in
Mono, die Themenfarbe als `dotColor`. Die Karte behält keine Fläche und
keinen Rahmen; `card-hover` (Translate + Schatten) entfällt.

Der Wortumbruch wird damit in `components/ui/list.tsx` entschieden: `Row`s
Titel trägt `truncate`. Für Titel, die umbrechen sollen, bekommt `Row` ein
zusätzliches Prop:

```tsx
  /** Titel umbrechen statt abschneiden — für Namen, die man ganz lesen muss. */
  wrapTitle?: boolean;
```

und die Titel-Klasse wird

```tsx
              wrapTitle ? "break-words hyphens-auto" : "truncate",
```

`break-words` ist Tailwinds `overflow-wrap: break-word` — ohne
`word-break`, das den Fehler verursacht hat. `hyphens-auto` greift, weil
`app/layout.tsx` `lang={locale}` setzt.

`components/topics/topics-grid.tsx`: die beiden
`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` werden `List`; der
Leerzustand (`topics-grid.tsx:91`) wird `EmptyState`; `truncate` beim
archivierten Thema (`:407`) bleibt.

`app/(app)/topics/page.tsx` bekommt `PageFrame` mit Rand (Zähler: Anzahl
Themen, Anzahl offener Aufgaben) und `max-w-5xl` entfällt. Das
Untertitel-`<p>` mit `page_subtitle` wandert in den Rand — es ist ein
Zähler, nicht Inhalt.

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

```bash
npx tsc --noEmit && npm run check:design && npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/topics.spec.ts e2e/design-rules.spec.ts
```

- [ ] **Step 5: Im Browser ansehen, dann Commit**

Ein Thema mit langem Namen anlegen und prüfen, dass „Steuererklärung 2025"
ganz oder mit Silbentrennung bricht, nie mitten im Wort.

```bash
git add "app/(app)/topics/page.tsx" components/topics components/ui/list.tsx e2e/ scripts/design-baseline.json
git commit -m "feat(topics): Liste statt Raster, Titel bricht nicht mehr mitten im Wort"
```

---

### Task 11: `/progress` — und der leere Zustand ohne Kasten

Der gestrichelte Kasten mit dem grün gefüllten Button ist der Fall, den §6
ausdrücklich benennt. 99 Verstöße in `progress-tabs.tsx`.

**Files:**
- Modify: `app/(app)/progress/page.tsx`
- Modify: `components/progress/progress-tabs.tsx`
- Modify: `components/habits/habit-card.tsx`
- Modify: `e2e/helpers/design-count.ts`

**Interfaces:**
- Consumes: `PageFrame`, `List`/`Row`, `EmptyState`, `GroupHeading`.
- Produces: nichts Neues.

- [ ] **Step 1: `/progress` in die Regel-Liste, Test zuerst**

```ts
export const MIGRATED_PAGES: string[] = ["/dashboard", "/tasks", "/focus", "/topics", "/progress"];
```

An `e2e/progress.spec.ts` anfügen:

```ts
test("der leere Zustand ist kein gestrichelter Kasten mit grünem Knopf", async ({ page }) => {
  await page.goto("/progress");
  const dashed = await page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body;
    return Array.from(root.querySelectorAll("*")).filter((el) => {
      const c = getComputedStyle(el);
      return ["top", "right", "bottom", "left"].some(
        (s) => c.getPropertyValue(`border-${s}-style`) === "dashed",
      );
    }).length;
  });
  expect(dashed).toBe(0);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts e2e/design-rules.spec.ts -g "progress"`
Expected: FAIL — mindestens ein gestricheltes Element, Kästen, fehlende
`[data-column]`.

- [ ] **Step 3: Umbauen**

- `app/(app)/progress/page.tsx`: `PageFrame` mit Rand (Summen: Abschlüsse
  im Jahr, letzte 30 Tage, letzte 7 Tage — heute Kacheln in der Spalte).
  `max-w-4xl` entfällt.
- `components/progress/progress-tabs.tsx`: die Kennzahlen-Kacheln
  (`statTotalYear`, `statLast30`, `statLast7`, `statStreak`) wandern in den
  Rand, als Mono-Zeilen ohne Fläche. **Fehlende Kennzahl heißt nichts
  zeigen**: bei `statStreak === 0` entfällt die Zeile, nicht ersetzt durch
  `stat_streak_empty`. Der Key bleibt in den Locales stehen.
- Die Habit-Karten werden `List`/`Row`; die Heatmap (`contribution-grid`)
  behält ihr Raster — sie ist ein Diagramm, keine Liste, und ihre Zellen
  sind Daten, keine Kästen. Damit `countBoxes` sie nicht meldet, bekommt der
  Rasterknoten `data-affordance` **nicht** — stattdessen wird die Ausnahme
  explizit: in `countBoxes` ist bereits alles ausgenommen, was in
  `AFFORDANCE` oder `FLOATING` liegt; die Heatmap-Zellen sind `<button>`
  (klickbar) und fallen damit unter `AFFORDANCE`. Prüfen: sind sie es nicht,
  in `contribution-grid.tsx` auf `<button type="button">` umstellen — eine
  Zelle mit Tooltip ist ohnehin fokussierbar zu machen (Tastaturzugang).
- Der gestrichelte Leerzustand wird `EmptyState` mit `Button
  variant="quiet"` — kein grün gefüllter Knopf: `--done` heißt
  ausschließlich „erledigt".
- Das `faSeedling`-Icon in `--accent-green` (`progress-tabs.tsx:158`)
  entfällt; die Seitenüberschrift ist das eine Fraunces-Element.

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

```bash
npx tsc --noEmit && npm run check:design && npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts e2e/design-rules.spec.ts
```

- [ ] **Step 5: Im Browser ansehen, dann Commit**

Beide Tabs (`/progress` und `/progress?tab=habits`), 1440 px und 375 px,
dark und light. Die Heatmap-Tooltips müssen ein Datum zeigen (Task 6) und
die Konsole leer sein.

```bash
git add "app/(app)/progress/page.tsx" components/progress components/habits e2e/ scripts/design-baseline.json
git commit -m "feat(ui): /progress auf Maß und Liste, leerer Zustand ohne Kasten"
```

---

### Task 12: Phase-1-Abschluss — Review, Baseline, Dokumentation, PR

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `docs/design-system.md`
- Modify: `README.md` (Statustabelle, falls sie Seiten je Phase führt)
- Modify: `scripts/design-baseline.json`

- [ ] **Step 1: Die volle Prüfspur laufen lassen**

```bash
npx tsc --noEmit
npm run lint
npm test
npm run check:i18n
npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test
```

Alles muss grün sein. Nichts davon darf mit „bekanntes Problem" übersprungen
werden — wenn ein Test rot ist, ist die Phase nicht fertig.

- [ ] **Step 2: Chrome-Review, beide Themes, zwei Breiten**

Für jede der fünf Seiten (`/dashboard`, `/tasks`, `/focus`, `/topics`,
`/progress`) × dark/light × 1440 px/375 px:

| Prüfen | Erwartung |
|---|---|
| Amber | genau eine Stelle, als Text oder Wash — nie Fläche, nie Rahmen, nie im Rand |
| Fraunces | genau eine Stelle, groß |
| Kästen | keine; Kante nur an Eingabe, Button, Hover |
| Spalte | 640 px, Block zentriert, Rand rechts (bzw. darunter unter 1100 px) |
| Abstände | keine sichtbare Gleichverteilung — enge Gruppen, große Brüche |
| Leerzustände | eine Zeile, eine stille Handlung; fehlende Kennzahl = nichts |

Jeder gefundene Fehler wird in diesem Durchgang behoben, nicht notiert.
Grüne Tests sind kein Beleg dafür, dass ein Entwurf funktioniert — im Pilot
kamen fünf falsche Festlegungen durch saubere Reviews.

- [ ] **Step 3: Die Baseline auf den erreichten Stand senken**

```bash
npm run check:design -- --update
npm run check:design
```

Expected: eine Zahl **deutlich unter** dem Boden aus Task 2 (≈2219). Die
Spec nennt ~340 Verstöße für Phase 1; die verbindliche Größe ist die
Baseline, und sie darf nur fallen. Die erreichte Zahl gehört in den
CHANGELOG-Eintrag.

- [ ] **Step 4: CHANGELOG und Designdoku**

In `CHANGELOG.md` unter `## [Unreleased]` → `### Changed`:

```markdown
- **Lichtkegel Phase 1: `/tasks`, `/focus`, `/topics` und `/progress` liegen auf dem
  Token-System.** Neu ist ein Spaltenmaß, das auf jeder Seite gilt (640 px Lesespalte,
  208 px Randnotiz, 48 px dazwischen, als Block zentriert) — vorher hatte jede Seite ihr
  eigenes, von randlos bis 1024 px. Aus fünf getrennten Zeilen-Implementierungen ist eine
  geworden: Haarlinie statt Kasten, und die Metadaten einer Aufgabe brauchen keine Flächen
  mehr — die Dauer steckt in der Schriftgröße des Titels (die Minutenzahl steht als Text
  daneben, damit die Größe nicht die einzige Kodierung ist), die Priorität ist eine
  Gruppenüberschrift statt eines Abzeichens an jeder Zeile, und die frei gewählte
  Themenfarbe erscheint als 6-px-Punkt statt als Füllung mit Rahmen. `task-item.tsx`
  (803 Zeilen) ist dabei in Zeile, Aktionen und Wisch-Logik zerlegt.
- **Amber gilt jetzt über das ganze Dokument, nicht nur über den Inhalt.** Federlogo,
  Münzzähler und Level-Badge trugen Amber außerhalb von `main` — gleichzeitig mit dem
  einen erlaubten Amber im Inhalt waren damit auf jeder Seite drei Amber-Dinge sichtbar.
  Die Navigation ist jetzt ausschließlich Ink, und die globale Linkfarbe ist keine
  Lichtfarbe mehr, sondern eine Unterstreichung.
```

Unter `### Fixed` zusätzlich zu Task 7:

```markdown
- **Heatmap-Tooltips auf `/progress?tab=habits` warfen bei jedem Aufruf `FORMATTING_ERROR`.**
  Die drei Tooltip-Nachrichten wurden formatiert übergeben, obwohl der Empfänger die rohe
  Nachricht braucht — das Datum fehlte deshalb in jedem Tooltip.
- **Der Theme-Umschalter und der Münzzähler sprachen Englisch** („System theme — click to
  switch"), auch auf deutscher Oberfläche. Beide Texte liegen jetzt in allen sieben Locales.
- **Ein langer Themenname brach mitten im Wort** („Steuererklärun g 2025"): die Karte setzte
  gleichzeitig `word-break: break-word` und `overflow-wrap: break-word`; das erste bricht auch
  Wörter, die auf die nächste Zeile gepasst hätten.
- **Die Quest kam als Letztes an.** Der Lichtkegel begann seine Atmung bei 85 % und war erst
  nach etwa drei Sekunden auf voller Stärke, während die Quest zusätzlich aus der
  Durchsichtigkeit hochfuhr — auf der Seite, deren These „eine Lichtquelle" ist. Jetzt steht
  das Licht bei Ankunft, und nur die Peripherie beruhigt sich danach.
```

In `docs/design-system.md` die vier neuen Abschnitte ergänzen: Maß/Rand/
Rhythmus mit den drei Token und dem Umbruch bei 1100 px; Liste und Zeile mit
der Kodierungstabelle; die Farbtabelle aus §5 (was Amber, `--done`,
`--danger` und die Nutzerfarbe dürfen); die zwei Leerzustandsfälle. Kurz
halten und auf die Spec verlinken statt sie abzuschreiben.

- [ ] **Step 5: PR öffnen**

`main` ist branch-protected — die Arbeit geht per PR:

```bash
git add CHANGELOG.md docs/design-system.md README.md scripts/design-baseline.json
git commit -m "docs(ui): Lichtkegel Phase 1 dokumentiert, Baseline gesenkt"
git push -u origin design/lichtkegel-impl
gh pr create --title "Lichtkegel II: Maß, Liste, Farbregeln — Phase 0 und Phase 1" --body-file - <<'BODY'
Setzt `docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md` um,
Phase 0 und Phase 1, plus die vier mitgeführten Bugs.

## Was gilt jetzt statt auf dem Papier zu stehen

| Regel | Durchsetzung |
|---|---|
| Amber ≤ 1 pro Seite, dokumentweit | `e2e/design-rules.spec.ts`, erkennt `rgb()` **und** `color(srgb …/α)` |
| Fraunces genau 1 pro Seite | derselbe Test |
| 0 umrahmte Inhaltsflächen | derselbe Test |
| Spalte ≤ `--measure` | derselbe Test |
| Abstand nur aus der Achterskala | `npm run check:design`, vierte Kategorie `spacing` |

## Mitgeführte Bugs

- Heatmap-Tooltips warfen `FORMATTING_ERROR` bei jedem Aufruf von `/progress?tab=habits`
- Theme-Umschalter und Münzzähler sprachen Englisch auf deutscher Oberfläche
- Ein langer Themenname brach mitten im Wort
- **Die Versionsanzeige log:** live stand „Momo ist aktuell" über einer
  0.5.0-Instanz, während 0.6.0 seit einem Tag veröffentlicht war. Ursache
  waren zwei Cache-Schichten übereinander plus ein UI-Zweig, der
  „unbekannt" als „aktuell" rendert. `GET /api/health` gibt jetzt die
  laufende Version aus, und die Publish-Pipeline prüft den Rollout gegen
  diesen Endpunkt statt gegen Watchtowers HTTP 200.

## Offen und bewusst nicht hier drin

- Phasen 2–4 (`/stats`, `/wishlist`, Settings, Legal, Login, Onboarding) — eigener Plan
- Der Grund, warum Watchtower auf dem Live-Host den Container nicht tauscht: Host-Konfiguration, nicht Repository
BODY
```

---

## Nicht Teil dieser Arbeit

- Keine neuen Funktionen. Der Entwurf ordnet und streicht.
- Keine Änderung an Datenmodell, API oder Gamification-Logik.
- Kein Umbau der Navigation. Die Sidebar-Gruppierung bleibt.
- Keine neue Palette, keine neuen Schriften.
- **„Zahlen sind Mono" auf `/stats`** (Spec §5, letzter Absatz): 16
  Fraunces-Kennzahlen, wo eine erlaubt ist. `/stats` ist Phase 2 und wird
  dort umgestellt — der Fraunces-Zähler greift auf dieser Seite erst, wenn
  sie in `MIGRATED_PAGES` aufgenommen wird. Der Münzzähler in der
  Navigation geht in Task 3 auf Mono, weil er auf jeder Seite steht.
- Das Violett für Legendary-Achievements (`--rarity-legendary`) bleibt auf
  `/achievements` — Phase 2. In der Navigation entfällt es mit Task 3.
- Die zwei offenen Auth-Punkte aus dem Pilot (`PLAYWRIGHT_TEST_PASSWORD`,
  toter `test-credentials`-Provider) bleiben offen — Produktions-
  Authentifizierung gehört nicht in einen Design-Umbau.
- Playwright läuft weiterhin in keinem CI-Workflow. Sinnvoll, aber eine
  eigene Entscheidung: es braucht einen Dienst-Container und eine
  Migrationsstufe im Workflow.
- Der 6-px-Themenpunkt ist ein Kompromiss (Spec §12): ganz weglassen würde
  die Amber-Regel vollständig dicht machen, kostet Themen aber ihr
  Erkennungsmerkmal in Listen. Entschieden für den Punkt; **nach Phase 1 am
  laufenden Bild zu bewerten** — Task 12 Step 2 ist der Moment dafür.
