# Global Constraints — gelten für jede Task dieses Plans

- **Farbe nur über `var(--…)`.** Kein Hex, kein `rgb()`/`hsl()`, kein
  `white`/`black`, keine Tailwind-Palettenutility. Einzige Ausnahme: die frei
  gewählte Nutzer-Themenfarbe, und die ausschließlich als **6-px-Punkt**.
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
- **Conventional Commits** mit Scope aus der CLAUDE.md-Liste (`auth`, `tasks`,
  `topics`, `recurring`, `daily-quest`, `gamification`, `wishlist`, `push`,
  `pwa`, `ui`, `db`, `api`, `deploy`, `docs`, `config`). Nach jeder Task
  committen — auf dem aktuellen Branch `design/lichtkegel-impl`.
- **Niemals nach `main` committen, niemals pushen, niemals mergen.**
- **JSDoc** auf jeder exportierten Funktion und Komponente (CLAUDE.md-Pflicht).

## Testumgebung (vom Controller verifiziert, 2026-08-22)

- Dev-Server läuft bereits auf `http://localhost:3000` aus **diesem** Worktree.
  **Nicht neu starten, nicht killen.** Er kompiliert Änderungen automatisch.
- Postgres läuft auf `localhost:5432` (Container `momo-test-pg`).
- Playwright:
  `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test <datei>`
- `PLAYWRIGHT_TEST_PASSWORD` darf **nicht** gesetzt werden — sobald sie
  existiert, hängt `lib/auth.ts` den Credentials-Provider an, Auth.js verwirft
  die Konfiguration mit `UnsupportedStrategy`, und jede geschützte Route
  leitet auf `/login`. `e2e/global.setup.ts` legt die Session direkt in der DB an.
- Vitest: `npm test` (Node-Umgebung, DB-gestützt, nur `.test.ts`).
- Ausgangswerte: vitest 1728/1728 grün · `check:design` 1934 · `check:i18n` grün.
