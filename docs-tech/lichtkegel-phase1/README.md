# Lichtkegel Phase 1 — Arbeitsprotokoll

**Typ:** Referenz für die Wartung. Nicht veröffentlicht — GitHub Pages baut aus
`docs-site/`, dieses Verzeichnis kommt dort nicht vor.

Das Protokoll der zwölf Tasks vom 2026-08-22 bis 2026-08-28, die `/dashboard`,
`/tasks`, `/focus`, `/topics` und `/progress` auf das Designsystem umgestellt
haben. Der Plan selbst liegt in `docs/superpowers/plans/2026-08-22-lichtkegel-rollout.md`,
die Spec daneben unter `specs/`.

## Was hier liegt

| Datei | Inhalt |
|---|---|
| `ledger.md` | Der laufende Verlauf: jede Task, jede Fix-Runde, jedes Review — und **49 Rulings** mit Begründung und „Kosten falls falsch" |
| `deferred-minors.md` | Die 24 bewusst zurückgestellten Kleinigkeiten, mit Zeilenverweis ins Ledger |
| `task-N-report.md` | Bericht je Task: was geändert wurde, RED/GREEN-Belege, Messungen, Chrome-Prüfung, Selbstkritik |
| `carried-findings-report.md` | Drei Funde aus einem Review, die zwischen zwei Tasks fielen |
| `final-fix-wave-report.md` | Die Abschlusswelle nach dem „nicht mergefähig"-Verdikt, plus vier Doku-Korrekturen |
| `global-constraints.md` | Die Regeln, die jede Task binden |

**Nicht übernommen:** die `review-*.diff`-Pakete (~1,9 MB). Sie sind aus Git
jederzeit reproduzierbar — `git diff <base>..<head>` mit den SHAs, die im Ledger
neben jeder Runde stehen. Ebenso die Task-Briefs: sie sind Auszüge aus dem Plan.

## Was Phase 2 zuerst lesen sollte

`deferred-minors.md`, dann im Ledger die Zeilen mit `Ruling:`. Die vier
strukturellen Erbschaften stehen am Ende des Abschlussreviews:

1. **Zwei parallele Aufgabenzeilen.** `components/tasks/task-item.tsx` (803
   Zeilen, 73 Ratschen-Verstöße) lebt weiter und wird von `/quick` und
   `/topics/[id]` importiert; `components/tasks/task-row.tsx` ist eine zweite
   Zeile daneben, bewusst auf `/tasks` begrenzt. Fünf Verhaltensweisen haben
   damit zwei Implementierungen.
2. **Playwright läuft in keinem CI-Workflow.** Der PR-Gate fährt Typecheck,
   Lint, Build, `check:i18n` und `check:design` — die vier Designregel-Zähler
   laufen nur lokal. §8 der Spec heißt „Durchsetzung: Tests, nicht Review"; das
   ist bis dahin Anspruch, nicht Zustand.
3. **Die Ratsche hat einen blinden Fleck.** Ihre `inline`-Regel prüft wörtlich
   `/style=\{\{/g` und sieht 76 Stellen der Form `style={objekt}` nicht. Der Weg
   zum Schließen steht im Kopf von `scripts/check-design-tokens.mjs`: Regex
   erweitern, Baseline löschen, mit `--update` neu bodenlegen. Das ist eine
   Phasenentscheidung, keine nebenbei.
4. **Keine Designregel läuft bei 375 px.** Nur der Spaltentest setzt einen
   Viewport. Der Fehler, bei dem Aufgabentitel auf dem Telefon mit null Pixeln
   Breite rendern, war deshalb strukturell nicht zu fangen — gefunden hat ihn
   erst der Chrome-Durchgang.

## Zur Lesart

Das Ledger ist ein Arbeitsprotokoll, kein Ergebnisbericht: es hält auch fest,
was schiefging. Neun Kommentare sind in diesem Projekt ausgeliefert worden, die
etwas Falsches behaupteten — zwei davon entstanden beim Beheben eines früheren
falschen Kommentars, einer war eine aus einem Review abgeschriebene Messtabelle,
die in zwei Zellen nicht stimmte. Sechs Rulings korrigieren den Plan oder die
Spec, nicht die Arbeit daran.

Die wiederkehrende Lehre steht in mehreren Rulings und ist die Mühe wert: **eine
Obergrenze allein ist von null erfüllt.** `expect(amberCount).toBeLessThanOrEqual(1)`
war grün auf einer Seite, deren eine hervorgehobene Handlung ihre Farbe verloren
hatte. Jede „höchstens N"-Regel braucht eine Positivprobe daneben, sonst kann
sie „richtig" nicht von „weg" unterscheiden.
