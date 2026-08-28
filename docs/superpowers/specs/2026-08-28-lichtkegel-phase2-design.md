# Lichtkegel Phase 2 — Die Zahlen-Seiten

> Vorgänger, weiter gültig:
> [`2026-08-21-lichtkegel-design.md`](2026-08-21-lichtkegel-design.md) (Tokens, Farbregeln)
> und [`2026-08-22-lichtkegel-rollout-design.md`](2026-08-22-lichtkegel-rollout-design.md)
> (Maß, Listen-Primitive, Durchsetzung, Phasenordnung).
> Dieses Dokument ersetzt deren §9-Zeile für Phase 2 und begründet, warum.

---

## 1. Was gemessen wurde, und was dabei auffiel

Phase 2 heißt in der Vorgängerspec „`/stats`, `/wishlist`, `/achievements`,
`/quick`, `/review` — ca. 200 Verstöße". Drei dieser fünf sind heute keine
Seiten mehr, und die Zahl stimmt nicht.

| Spec-Name | Heutige Adresse | Verstöße |
| --- | --- | --- |
| `/wishlist` | `/wishlist` | **152** (card 59, view 29, budget-bar 25, form 18, loading 19, page 2) |
| `/stats` | `/stats` | **111** (page 68, energy-week-block 28, weekday-chart 9, sparkline 6) |
| `/achievements` | `/progress?tab=achievements` | ~**94** geteilt mit ↓, plus achievement-card 17 |
| `/review` | `/progress?tab=review` | ↑ `progress-tabs.tsx`, 597 Zeilen |
| `/quick` | `/quick` | **18** |

≈ **400**, nicht 200. Die Differenz ist keine Verschlechterung: die
Schätzung der Vorgängerspec zählte geteilte Komponenten nicht mit, und
`app/(app)/habits`, `/achievements`, `/review` sind Redirect-Stubs von 6–12
Zeilen, deren Inhalt in `components/progress/` liegt. Phase 1 war 340 —
dieselbe Größenordnung, ein PR.

### Der Fund: „migriert" galt für ein Drittel einer Route

`MIGRATED_PAGES` enthält `"/progress"`. Der Default-Tab ist `habits`.
`ProgressTabs` ist eine Server Component, die **nur den aktiven Tab
rendert**:

```ts
export async function ProgressTabs({ tab, userId }: ProgressTabsProps) {
  if (tab === "achievements") return <AchievementsTab userId={userId} />;
  return <ReviewTab userId={userId} />;
}
```

Die vier Playwright-Zähler betreten `/progress` und sehen deshalb **einen
von drei Tabs**. Die anderen zwei sind nicht nur unmigriert, sie sind
unmessbar. Konkret trägt der review-Tab `--accent-amber` an
`progress-tabs.tsx:501` und `:576`, und der achievements-Tab legt an `:372`
einen Amber-Radialverlauf darüber — drei Amber auf einer Ansicht, wo die
Regel eins erlaubt, und kein Test ist rot.

**Die Messeinheit ist die Ursache**, nicht die Nachlässigkeit: ein Zähler,
der Routen kennt, kann eine Route nicht in ihren Zuständen prüfen. §5 zieht
die Konsequenz.

---

## 2. `/stats` wird der vierte Tab

`/stats` ist von genau einer Stelle erreichbar — `user-menu.tsx:151`. Es
steht **nicht in der Sidebar**; `/progress` steht dort unter REWARD. Damit
ist `/stats` die teuerste Einzelseite dieser Phase und zugleich die am
schlechtesten auffindbare, und sie beansprucht dieselbe Rolle wie
`/progress`: Zahlen über dich.

`app/(app)/stats/page.tsx` wird deshalb ein Redirect-Stub auf
`/progress?tab=stats`, genau wie `/habits`, `/achievements` und `/review` es
schon sind. Der Inhalt zieht als `tabs/stats-tab.tsx` um.

**Das ist ein bewusster Bruch mit §11 der Vorgängerspec** („Kein Umbau der
Navigation. Die Sidebar-Gruppierung bleibt."). Die Begründung: der Satz
verbietet einen *Umbau*, und das hier ist keiner. Die Sidebar bleibt Zeile
für Zeile unverändert; es verschwindet eine Route, die in der Sidebar nie
stand. Nach dem Umzug gibt es **eine** Zahlen-Destination statt zwei, und
die neue liegt in der Navigation statt in einem Menü. Das ist die Richtung,
die die Roadmap „keine neuen Toplevel-Seiten" meint — hier eine weniger.

Kosten: `VALID_TABS` und die Tab-Leiste bekommen `stats`, ein `tab_stats`-Key
in sieben Locales, und `user-menu.tsx` zeigt auf den Tab. Im selben Griff
fällt der Redirect-Hop aus `user-menu.tsx:157` (`/review` statt
`/progress?tab=review`), der als „Kleinigkeit" in der Roadmap steht.

### Acht von neun Abschnitten ziehen um

| Abschnitt | Umzug |
| --- | --- |
| `overview`, `progress`, `weekdays`, `activity`, `energy`, `tasks_by_priority`, `tasks_by_type` | migriert |
| `streak_history` | **bleibt** — siehe unten |
| `wishlist` | entfällt, eine Zahl zieht nach `/wishlist` |

Zwei Korrekturen an der naheliegenden Annahme, beide gemessen statt
vermutet:

- **Der Sparkline-Streak ist nicht der Rail-Streak.** Der Rail des
  habits-Tabs zeigt `HabitStreak.current` (`lib/habits.ts`, Gewohnheiten
  über Perioden). `streak_history` zeigt `users.streakCurrent` über Zeit —
  den Aufgaben-Streak aus der Gamification. Zwei verschiedene Zahlen.
  `current_streak`/`best_streak` überleben in `overview`; der **Verlauf**
  existiert sonst nirgends, also bleibt die Sparkline.
- **Der `wishlist`-Abschnitt dupliziert `/wishlist` nur zu drei Vierteln.**
  bought/open/discarded sind dort als Listenlängen sichtbar (History-Sektion,
  eingeklappt). `totalSpent` **nicht**: `getBudgetSummary` liefert
  `spentThisMonth`, nur den laufenden Monat. `totalSpent` (alle Zeit) wandert
  deshalb als Zeile in die `BudgetBar` — dorthin, wo Ausgaben ohnehin stehen.
  Die drei Zählwerte entfallen.

---

## 3. Dateistruktur

`progress-tabs.tsx` sind heute 597 Zeilen für zwei Tabs; mit dem Stats-Tab
kämen ~250 dazu. Phase 1 hat `task-item.tsx` (803 Zeilen) aus genau diesem
Grund zerlegt — das Muster ist gesetzt, nicht erfunden.

```
components/progress/
  progress-tabs.tsx        Dispatcher, ~30 Zeilen
  tabs/habits-tab.tsx
  tabs/achievements-tab.tsx
  tabs/review-tab.tsx
  tabs/stats-tab.tsx       neu, aus app/(app)/stats/page.tsx
```

`wishlist-card.tsx` (667 Zeilen) wird dabei zerlegt: die Karte verschwindet
als Konzept, übrig bleiben Zeile, Kaufaktion und Wischgeste.

Verworfen wurden zwei Alternativen. **Vierte Branch in derselben Datei**:
kleinster Diff heute, ergibt eine ~850-Zeilen-Datei mit vier unabhängigen
Ansichten und schiebt das Zerlegen in Phase 3, wo es niemandes Aufgabe ist.
**Tabs als Route-Segmente** (`progress/[tab]/page.tsx`): sauberste Trennung
und echtes Code-Splitting, bricht aber jede bestehende `?tab=`-URL, alle drei
Redirect-Stubs und die Tab-Navigation gleichzeitig — ein Routing-Umbau mitten
in einer Designmigration.

---

## 4. Was die Regeln erzwingen

`Row` (`components/ui/list.tsx`) hat die Slots bereits:
`lead · title · eyebrow · trailing · actions · dotColor · dimmed · tone`.
Phase 2 füllt sie, sie erfindet nichts.

| Heute | Nachher | Regel |
| --- | --- | --- |
| Prioritäts-Chip, farbig und umrahmt | `eyebrow`, Mono-Versalien | Null umrahmte Inhaltsflächen |
| Preis groß in `--accent-amber` | `trailing`, Mono `tabular-nums` | Amber höchstens einmal je Seite — **N Karten waren N Amber** |
| Münz-Fortschrittsring: SVG, 🪙-Emoji, zwei Farben | Mono-Bruch im `eyebrow`: `34 / 50` | Zahlen sind Mono |
| 4er-KPI-Raster in umrahmten Kacheln | Zahl in Mono, Label als Eyebrow, kein Rahmen | Null umrahmte Inhaltsflächen |
| ~7 Fraunces-Vorkommen auf `/stats` | genau eins — die Tab-Kopfzeile, die `/progress` schon trägt | Fraunces genau einmal je Seite |
| Abschnitts-`h2` in `--font-ui`, versal | Mono-Eyebrow, `0.6875rem`, `tracking-[0.16em]`, `--ink-3` | Abschnittsüberschriften sind Eyebrows |
| Drei `--accent-amber` auf dem review-Tab | höchstens eins | Amber höchstens einmal je Seite |

Der Münzring ist die einzige Stelle, an der Information wirklich die Form
wechselt: ein Ring zeigt einen Anteil, ein Bruch zeigt beide Zahlen. Der
Bruch trägt mehr und kostet kein SVG, keine zweite Farbe und kein Emoji.

---

## 5. Die Messeinheit: Zustände statt Routen

`MIGRATED_PAGES` wird eine Liste von Zuständen:

```ts
export const MIGRATED_PAGES: string[] = [
  "/dashboard", "/tasks", "/focus", "/topics",
  "/progress",                      // = ?tab=habits, der Default
  "/progress?tab=achievements",
  "/progress?tab=review",
  "/progress?tab=stats",
  "/wishlist",
  "/quick",
];
```

Die Zähler navigieren bereits per `page.goto(path)`; ein Query-String
erfordert keine Änderung an `design-count.ts`. `WITH_LIGHT` und `CHROMELESS`
in `design-rules.spec.ts` müssen die neuen Einträge kennen, sonst schlägt
die benannte Lichtkegel-Erwartung dort fehl — das ist beabsichtigt, es ist
die Positivprobe.

Dazu eine **einmalige Nachprüfung der vier Phase-1-Seiten** auf denselben
blinden Fleck: Filterzustände auf `/tasks`, `/topics/[id]`, leere gegen
volle Liste. Gefundene Lücken werden **benannt**; behoben nur, wo sie in
Phase-2-Dateien liegen. Sonst wächst Phase 2 unkontrolliert, und der Fund
verschwindet wieder in einem PR, der ihn nicht erklärt.

---

## 6. Mitgeführte Bugs

| Fund | Ort |
| --- | --- |
| Datum hartkodiert `"de-DE"` bei sieben Locales | `app/(app)/stats/page.tsx:114` |
| Redirect-Hop im Benutzermenü (`/review` statt `/progress?tab=review`) | `components/layout/user-menu.tsx:157` |

**Ausdrücklich kein Bug:** 59 Stellen schreiben
`var(--font-display, 'Lora', serif)`. Lora ist seit dem Fraunces-Wechsel
nicht geladen — aber `--font-display` ist in `globals.css:247` immer
definiert, der Fallback feuert also nie. Toter Text, kein Defekt. Er
verschwindet als Nebenwirkung der Migration, weil es `style={{…}}` sind und
die Ratsche sie ohnehin zählt. Er bekommt keine eigene Aufgabe.

Die zwei weiteren `"de-DE"` in `admin/page.tsx:952` und `:1004` gehören zu
Phase 3 und werden hier nicht angefasst.

---

## 7. Nicht Teil dieser Arbeit

- **Phase-1-Reste**: `task-item.tsx` (73), geteilte Animationen (34).
- **Phase 3**: `components/settings` (574), `/admin` (127), `api-keys` (59).
- **Phase 4**: Legal (101), Login (24), Onboarding (100), `app/page.tsx` (57).
- **Der 6-px-Themenpunkt** aus §12 der Vorgängerspec. Dort steht „nach
  Phase 1 am laufenden Bild zu bewerten"; er wird nach **Phase 2**
  bewertet, am vollständigeren Bild, nicht jetzt auf halber Strecke.
- **Keine neuen Funktionen.** Insbesondere keine Insight-Sätze statt
  Charts („Dein stärkster Wochentag ist Dienstag"). Das ist Produktarbeit,
  sie gehört in einen eigenen Durchgang mit eigener Begründung, nicht in
  eine Designmigration.
- Keine Änderung an Datenmodell, API oder Gamification-Logik.

---

## 8. Abschluss der Phase

| Prüfung | Kriterium |
| --- | --- |
| `npm run check:design` | Baseline gefallen, mit `-- --update` festgeschrieben |
| `npm run check:i18n` | grün über sieben Locales (neu: `tab_stats`, `budget_total_spent`) |
| `e2e/design-rules.spec.ts` | grün auf allen **zehn** Zuständen, beide Themes |
| Chrome-Review | beide Themes, 1440 px und 375 px |
| README-Screenshots | `04-stats.png` und `05-wishlist.png` neu geschossen |

Der Chrome-Review ist kein Formalismus: grüne Tests sind kein Beleg dafür,
dass ein Entwurf funktioniert. Sie belegen, dass er keine Regel bricht.

Die Screenshots stehen hier, weil sie der Grund für die Reihenfolge sind.
`README.md:35–43` zeigt fünf Bilder; nach Phase 1 trugen zwei das neue
System und drei das alte. awesome-selfhosted wird am **22.09.2026**
eligible, und ein Listing schickt Besucher auf genau diese fünf Bilder.
Phase 2 macht sie zu einer Sprache statt zu einer halben Migration.

---

## 9. Offene Punkte

- **Der 6-px-Themenpunkt** (übernommen aus §12 der Vorgängerspec,
  Wiedervorlage nach Phase 2).
- **Der Verlust der drei Wunschlisten-Zählwerte** (bought/open/discarded)
  ist als „auf `/wishlist` sichtbar" begründet — sichtbar heißt dort
  *abzählbar in einer eingeklappten Liste*, nicht *als Zahl ausgewiesen*.
  Falls sich im Chrome-Review zeigt, dass das zu wenig ist, ist die
  Gegenmaßnahme eine Mono-Zeile in der History-Überschrift, kein
  zurückgeholter Abschnitt.
