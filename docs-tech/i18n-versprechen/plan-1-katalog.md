# Schnitt 1: Der Errungenschaftskatalog — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Errungenschafts- und Level-Titel leben nur noch in `messages/*.json`; die Tabelle `achievements` hält ausschließlich den `key`.

**Architecture:** Migration droppt `achievements.title` und `.description`. `ACHIEVEMENT_DEFINITIONS` verliert dieselben Felder. Sechs Lesestellen liefern statt Text den `key`; jeder Renderer übersetzt selbst. `lib/export.ts` übersetzt zur Exportzeit aus `users.locale`.

**Tech Stack:** TypeScript strict, Drizzle ORM, next-intl 4.13.7, vitest, PostgreSQL 18

**Spec:** `docs-tech/i18n-versprechen/design.md`

## Global Constraints

- Sieben Locales, keine Ausnahme: `de`, `en`, `es`, `fr`, `nl`, `ru`, `zh`. Jeder Key muß in allen sieben stehen — `npm run check:i18n` erzwingt das.
- Kein `any`. Strict mode ist an.
- Alle DB-Zugriffe über Drizzle, kein rohes SQL im Anwendungscode. Migrationen sind die Ausnahme.
- Übersetzungstonfall: **Wirkung vor Wortlaut.** Ein Titel muß in seiner Sprache so klingen wie der deutsche auf Deutsch — kurz, spielerisch, belohnend. Beschreibungen bleiben wörtlich, sie tragen die Freischaltbedingung.
- Commit-Format: `<type>(<scope>): <beschreibung>`, Scopes hier: `gamification`, `db`, `i18n`.
- `main` ist branch-protected. Jeder Schnitt ist ein PR, kein Direkt-Push.
- Testlauf ist `npm test` (vitest), nicht jest.

---

### Task 1: Die Keys anlegen — `de` und `en`

**Files:**
- Modify: `messages/de.json` (Namespace `achievements`, 26 Keys vorhanden — die neuen nisten darunter)
- Modify: `messages/en.json`

**Interfaces:**
- Produces: Key-Familien `achievements.<key>.title` / `.description` (31 Einträge) und `achievements.levels.<n>` (10 Einträge). Task 2 und Task 6 lesen sie; Schnitt 2 prüft sie.

Der Namespace `achievements` existiert bereits mit `page_title`, `rarity_common`, `secret_title` und 23 weiteren flachen Keys. Die neuen Einträge sind **verschachtelte Objekte** unter demselben Namespace und kollidieren mit keinem vorhandenen flachen Key. `keyExists()` in `scripts/check-i18n.mjs` unterstützt Punkt-Notation für genau diesen Fall.

- [ ] **Step 1: `messages/de.json` — die 31 Errungenschaften eintragen**

Die Texte werden aus `lib/gamification.ts` **wörtlich übernommen**, nicht neu formuliert. Unter `"achievements"` ergänzen:

```json
"catalog": {
  "first_task":              { "title": "Erster Schritt",     "description": "Erste Aufgabe erledigt" },
  "daily_quest_complete":    { "title": "Tagessieger",        "description": "Daily Quest erledigt" },
  "first_topic":             { "title": "Themensetzer",       "description": "Erstes Topic erstellt" },
  "first_high_priority":     { "title": "Volles Risiko",      "description": "Erste Aufgabe mit hoher Priorität erledigt" },
  "first_wishlist_buy":      { "title": "Erster Wunsch",      "description": "Erstes Wunschlisten-Item gekauft" },
  "streak_3":                { "title": "Drei am Stück",      "description": "3-Tage-Streak erreicht" },
  "streak_7":                { "title": "Eine Woche",         "description": "7-Tage-Streak erreicht" },
  "streak_14":               { "title": "Zwei Wochen",        "description": "14-Tage-Streak erreicht" },
  "tasks_10":                { "title": "Fleißige Hände",     "description": "10 Aufgaben erledigt" },
  "tasks_50":                { "title": "Unaufhaltsam",       "description": "50 Aufgaben erledigt" },
  "coins_100":               { "title": "Hundert Münzen",     "description": "100 Coins gesammelt" },
  "level_5":                 { "title": "Zeitwächter",        "description": "Level 5 erreicht" },
  "quest_streak_7":          { "title": "Wochensieger",       "description": "7 Tage Daily Quest in Folge erledigt" },
  "energy_checkin_7":        { "title": "Im Gleichgewicht",   "description": "7 Tage in Folge Energie eingecheckt" },
  "streak_30":               { "title": "Ein Monat",          "description": "30-Tage-Streak erreicht" },
  "streak_60":               { "title": "Zwei Monate",        "description": "60-Tage-Streak erreicht" },
  "tasks_100":               { "title": "Zeitmeister",        "description": "100 Aufgaben erledigt" },
  "tasks_200":               { "title": "Beständig",          "description": "200 Aufgaben erledigt" },
  "coins_500":               { "title": "Halbtausend",        "description": "500 Coins gesammelt" },
  "level_10":                { "title": "Legendär",           "description": "Level 10 erreicht" },
  "topics_5":                { "title": "Themenmeister",      "description": "5 Topics erstellt" },
  "quest_streak_30":         { "title": "Monatssieger",       "description": "30 Tage Daily Quest in Folge erledigt" },
  "wishlist_10_bought":      { "title": "Wunscherfüller",     "description": "10 Wunschlisten-Items gekauft" },
  "streak_100":              { "title": "Unbeugsamkeit",      "description": "100-Tage-Streak erreicht" },
  "streak_365":              { "title": "Ein Jahr",           "description": "365-Tage-Streak erreicht" },
  "tasks_500":               { "title": "Ausdauerkämpfer",    "description": "500 Aufgaben erledigt" },
  "tasks_1000":              { "title": "Tausendster",        "description": "1000 Aufgaben erledigt" },
  "first_sequential_topic":  { "title": "Stratege",           "description": "Erstes sequenzielles Topic erstellt" },
  "night_owl":               { "title": "Nachtaktiv",         "description": "Eine Aufgabe nach 23 Uhr erledigt" },
  "early_bird":              { "title": "Frühaufsteher",      "description": "Eine Aufgabe vor 7 Uhr erledigt" },
  "double_shift":            { "title": "Doppelschicht",      "description": "Zwei Daily Quests an einem Tag erledigt" }
},
"levels": {
  "1":  "Zeitlehrling",
  "2":  "Aufgabenträger",
  "3":  "Alltagsmeister",
  "4":  "Beständiger",
  "5":  "Zeitwächter",
  "6":  "Gewohnheitsschmied",
  "7":  "Routinier",
  "8":  "Meister der Stunden",
  "9":  "Zeitlenker",
  "10": "Grauer-Herren-Besieger"
}
```

- [ ] **Step 2: `messages/en.json` — dieselben Keys, englisch**

`en` ist der Pivot für die restlichen fünf Sprachen: wer `ru` schreibt, liest `de` und `en`. Deshalb zuerst und mit Sorgfalt.

Tonfall: Wirkung vor Wortlaut. `"Tausendster"` ist kein Ordinalzahl-Rätsel, sondern der Titel für tausend erledigte Aufgaben — `"Thousandfold"`, nicht `"The Thousandth"`.

`levels.10` trägt den Michael-Ende-Bezug: die etablierte englische Übersetzung von *Momo* nennt die Grauen Herren **„the men in grey"**. Also `"Vanquisher of the Men in Grey"`, nicht `"Grey Gentlemen Defeater"`.

```json
"catalog": {
  "first_task":              { "title": "First Step",         "description": "Completed your first task" },
  "daily_quest_complete":    { "title": "Day Won",            "description": "Completed a Daily Quest" },
  "first_topic":             { "title": "Topic Setter",       "description": "Created your first topic" },
  "first_high_priority":     { "title": "All In",             "description": "Completed your first high-priority task" },
  "first_wishlist_buy":      { "title": "First Wish",         "description": "Bought your first wishlist item" },
  "streak_3":                { "title": "Three in a Row",     "description": "Reached a 3-day streak" },
  "streak_7":                { "title": "One Week",           "description": "Reached a 7-day streak" },
  "streak_14":               { "title": "Two Weeks",          "description": "Reached a 14-day streak" },
  "tasks_10":                { "title": "Busy Hands",         "description": "Completed 10 tasks" },
  "tasks_50":                { "title": "Unstoppable",        "description": "Completed 50 tasks" },
  "coins_100":               { "title": "A Hundred Coins",    "description": "Collected 100 coins" },
  "level_5":                 { "title": "Keeper of Hours",    "description": "Reached level 5" },
  "quest_streak_7":          { "title": "Week Won",           "description": "Completed the Daily Quest 7 days running" },
  "energy_checkin_7":        { "title": "In Balance",         "description": "Checked in your energy 7 days running" },
  "streak_30":               { "title": "One Month",          "description": "Reached a 30-day streak" },
  "streak_60":               { "title": "Two Months",         "description": "Reached a 60-day streak" },
  "tasks_100":               { "title": "Master of Time",     "description": "Completed 100 tasks" },
  "tasks_200":               { "title": "Steadfast",          "description": "Completed 200 tasks" },
  "coins_500":               { "title": "Half a Thousand",    "description": "Collected 500 coins" },
  "level_10":                { "title": "Legendary",          "description": "Reached level 10" },
  "topics_5":                { "title": "Topic Master",       "description": "Created 5 topics" },
  "quest_streak_30":         { "title": "Month Won",          "description": "Completed the Daily Quest 30 days running" },
  "wishlist_10_bought":      { "title": "Wish Granter",       "description": "Bought 10 wishlist items" },
  "streak_100":              { "title": "Unbending",          "description": "Reached a 100-day streak" },
  "streak_365":              { "title": "One Year",           "description": "Reached a 365-day streak" },
  "tasks_500":               { "title": "Long Hauler",        "description": "Completed 500 tasks" },
  "tasks_1000":              { "title": "Thousandfold",       "description": "Completed 1000 tasks" },
  "first_sequential_topic":  { "title": "Strategist",         "description": "Created your first sequential topic" },
  "night_owl":               { "title": "Night Owl",          "description": "Completed a task after 11 pm" },
  "early_bird":              { "title": "Early Bird",         "description": "Completed a task before 7 am" },
  "double_shift":            { "title": "Double Shift",       "description": "Completed two Daily Quests in one day" }
},
"levels": {
  "1":  "Time Apprentice",
  "2":  "Task Bearer",
  "3":  "Master of the Everyday",
  "4":  "The Steady One",
  "5":  "Keeper of Hours",
  "6":  "Habit Smith",
  "7":  "Old Hand",
  "8":  "Master of Hours",
  "9":  "Time Helmsman",
  "10": "Vanquisher of the Men in Grey"
}
```

- [ ] **Step 3: Beide Dateien auf gültiges JSON prüfen**

Run: `node -e "['de','en'].forEach(l=>{const a=require('./messages/'+l+'.json').achievements; console.log(l, Object.keys(a.catalog).length, Object.keys(a.levels).length)})"`
Expected: `de 31 10` und `en 31 10`

- [ ] **Step 4: Commit**

```bash
git add messages/de.json messages/en.json
git commit -m "i18n(i18n): Errungenschafts- und Level-Keys in de und en"
```

---

### Task 2: Die restlichen fünf Locales

**Files:**
- Modify: `messages/es.json`, `messages/fr.json`, `messages/nl.json`, `messages/ru.json`, `messages/zh.json`

**Interfaces:**
- Consumes: die Key-Struktur aus Task 1 (`achievements.catalog.<key>.title|.description`, `achievements.levels.<n>`)
- Produces: dieselbe Struktur in fünf weiteren Sprachen

Jede Datei bekommt **exakt dieselben 41 Keys**. Vorlage ist `de` (Bedeutung) plus `en` (Tonfall). Titel: Wirkung vor Wortlaut. Beschreibungen: wörtlich, sie tragen die Bedingung.

`levels.10` hält in jeder Sprache den Michael-Ende-Bezug — die *Momo*-Übersetzungen liefern die Entsprechung für die Grauen Herren (fr: *les hommes en gris*, es: *los hombres grises*, nl: *de grijze heren*, ru: *Серые господа*, zh: *灰先生*). Nicht wörtlich aus dem Deutschen übersetzen.

- [ ] **Step 1: `messages/fr.json`**

Alle 41 Keys unter `achievements` ergänzen, Struktur identisch zu Task 1 Step 1. `levels.10` = `"Vainqueur des hommes en gris"`.

- [ ] **Step 2: `messages/es.json`**

Alle 41 Keys. `levels.10` = `"Vencedor de los hombres grises"`.

- [ ] **Step 3: `messages/nl.json`**

Alle 41 Keys. `levels.10` = `"Overwinnaar van de grijze heren"`.

- [ ] **Step 4: `messages/ru.json`**

Alle 41 Keys. `levels.10` = `"Победитель Серых господ"`.

- [ ] **Step 5: `messages/zh.json`**

Alle 41 Keys. `levels.10` = `"灰先生的征服者"`.

- [ ] **Step 6: Vollständigkeit über alle sieben prüfen**

Run:
```bash
node -e "
const L=['de','en','es','fr','nl','ru','zh'];
const ref=Object.keys(require('./messages/de.json').achievements.catalog).sort();
let bad=0;
for(const l of L){
  const a=require('./messages/'+l+'.json').achievements;
  const c=Object.keys(a.catalog).sort(), v=Object.keys(a.levels).sort();
  const miss=ref.filter(k=>!c.includes(k));
  const noTitle=ref.filter(k=>!a.catalog[k]||!a.catalog[k].title||!a.catalog[k].description);
  if(miss.length||v.length!==10||noTitle.length){bad++;console.log(l,'FEHLT',{miss,levels:v.length,noTitle})}
  else console.log(l,'ok',c.length,'catalog,',v.length,'levels');
}
process.exit(bad?1:0)"
```
Expected: sieben Zeilen `ok 31 catalog, 10 levels`, Exit 0

- [ ] **Step 7: Commit**

```bash
git add messages/es.json messages/fr.json messages/nl.json messages/ru.json messages/zh.json
git commit -m "i18n(i18n): Errungenschafts- und Level-Keys in es, fr, nl, ru, zh"
```

---

### Task 3: `ACHIEVEMENT_DEFINITIONS` und `LEVELS` entschlacken

**Files:**
- Modify: `lib/gamification.ts:70-84` (`LEVELS`), `:128-387` (`ACHIEVEMENT_DEFINITIONS`), `:388-396` (`AchievementDefinition`), `:837-862` (`seedAchievements`)
- Test: `__tests__/gamification.test.ts`

**Interfaces:**
- Produces:
  - `AchievementDefinition = { key: string; icon: string; rarity: "common"|"rare"|"epic"|"legendary"; coinReward: number; secret?: boolean }` — **ohne** `title`, **ohne** `description`
  - `Level = { level: number; minCoins: number }` — **ohne** `title`
  - `seedAchievements(): Promise<void>` — Signatur unverändert, schreibt nur noch `key`, `icon`, `rarity`, `coinReward`, `secret`

- [ ] **Step 1: Failing test schreiben**

Neu in `__tests__/gamification.test.ts`:

```ts
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
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/gamification.test.ts -t "Katalog trägt keinen Anzeigetext"`
Expected: FAIL — `expected { key: 'first_task', title: 'Erster Schritt', … } not to have property "title"`

- [ ] **Step 3: `LEVELS` und den Typ kürzen**

```ts
export const LEVELS = [
  { level: 1, minCoins: 0 },
  { level: 2, minCoins: 50 },
  { level: 3, minCoins: 150 },
  { level: 4, minCoins: 300 },
  { level: 5, minCoins: 500 },
  { level: 6, minCoins: 800 },
  { level: 7, minCoins: 1200 },
  { level: 8, minCoins: 1700 },
  { level: 9, minCoins: 2300 },
  { level: 10, minCoins: 3000 },
] as const;
```

- [ ] **Step 4: `ACHIEVEMENT_DEFINITIONS` kürzen**

Aus jedem der 31 Einträge die Zeilen `title:` und `description:` entfernen. Die Blockkommentare (`// ── Common ──`) bleiben. Beispiel für den ersten Eintrag:

```ts
export const ACHIEVEMENT_DEFINITIONS = [
  // ── Common ────────────────────────────────────────────────────────────────
  {
    key: "first_task",
    icon: "🌱",
    rarity: "common" as const,
    coinReward: 10,
  },
```

- [ ] **Step 5: `AchievementDefinition` kürzen**

```ts
export type AchievementDefinition = {
  key: string;
  icon: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  coinReward: number;
  secret?: boolean;
};
```

- [ ] **Step 6: `seedAchievements()` anpassen**

`title` und `description` aus `values()` **und** aus `onConflictDoUpdate.set` entfernen:

```ts
export async function seedAchievements(): Promise<void> {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const d = def as AchievementDefinition;
    await db
      .insert(achievements)
      .values({
        key: d.key,
        icon: d.icon,
        rarity: d.rarity,
        coinReward: d.coinReward,
        secret: d.secret ?? false,
      })
      .onConflictDoUpdate({
        target: achievements.key,
        set: {
          icon: d.icon,
          rarity: d.rarity,
          coinReward: d.coinReward,
          secret: d.secret ?? false,
        },
      });
  }
}
```

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run __tests__/gamification.test.ts`
Expected: PASS. Schlagen andere Tests in derselben Datei fehl, weil sie `title` erwarten, gehören sie in diesen Commit — sie prüfen eine Eigenschaft, die es nicht mehr gibt.

- [ ] **Step 8: Commit**

```bash
git add lib/gamification.ts __tests__/gamification.test.ts
git commit -m "refactor(gamification): Katalog traegt keinen Anzeigetext mehr"
```

---

> **Zusammengelegt mit Task 3 (Ruling 2026-09-02).** Task 3 und Task 4 sind ein
> Task, nicht zwei. `achievements.title` ist `text NOT NULL` ohne Default, und
> `__tests__/helpers/setup.ts:17` ruft `seedAchievements()` im `beforeAll`
> **jeder** Testdatei. Nimmt Task 3 die Spalten aus dem `INSERT`, ohne dass die
> Migration existiert, verletzt jeder Seed die NOT-NULL-Bedingung und die
> **gesamte** Suite ist rot — Task 3 Step 7 „Expected: PASS" wäre unerreichbar.
> `global-setup.ts:69` fährt die Migration vor der Suite, sie muss also
> vorhanden sein, bevor irgendein Test läuft.
>
> Die ursprüngliche Begründung im Plan („erst Task 3, dann die Migration,
> sonst läuft ein `seedAchievements()` gegen NOT-NULL-Spalten ohne Wert")
> beschrieb das Deployment, nicht die Testsuite — und auch dort trägt sie nur
> bedingt: `scripts/migrate.mjs` läuft beim Start des **neuen** Containers, der
> den neuen Code enthält. Ein Restrisiko bleibt bei `replicas: 2` während eines
> Rolling Updates, wenn ein alter Pod nach der Migration noch einen Seed
> auslöst — `seedAchievements()` läuft aber nur beim Start und über
> `/api/admin/seed`, nicht pro Request.
>
> Reihenfolge innerhalb des zusammengelegten Tasks: Migration und Schema
> zuerst, dann der Code, dann die Tests.

### Task 4: Die Migration

**Files:**
- Create: `drizzle/0035_achievements_drop_display_text.sql`
- Modify: `lib/db/schema.ts:667-690` (`achievements`)
- Modify: `drizzle/CLAUDE.md` (Eintrag in der Migrationsliste)

**Interfaces:**
- Produces: `achievements` ohne `title`- und `description`-Spalte. Task 5 setzt darauf auf.

Reihenfolge ist Absicht: erst Task 3 (Code schreibt die Spalten nicht mehr), dann die Migration. Umgekehrt liefe zwischen Deploy und Migration ein `seedAchievements()` gegen `NOT NULL`-Spalten ohne Wert.

- [ ] **Step 1: Migration schreiben**

```sql
-- Achievements: Anzeigetext lebt in messages/*.json, nicht in der Datenbank.
--
-- title und description wurden von seedAchievements() aus ACHIEVEMENT_DEFINITIONS
-- gespiegelt und waren damit in jeder Instanz deutsch — auch fuer Nutzerinnen
-- mit locale = "fr". Die Spalten sind abgeleitete Daten ohne eigene Wahrheit;
-- ihr Verlust ist kein Datenverlust.
--
-- Der key bleibt die stabile Identitaet und ist bereits UNIQUE.
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "title";
ALTER TABLE "achievements" DROP COLUMN IF EXISTS "description";
```

- [ ] **Step 2: `lib/db/schema.ts` angleichen**

Die beiden Zeilen im `achievements`-`pgTable` entfernen:

```ts
export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** Unique machine-readable key (e.g. "first_task_completed") */
  key: text("key").notNull().unique(),

  /**
   * Anzeigetext lebt in messages/*.json unter achievements.catalog.<key>,
   * nicht hier: eine Spalte kann nur eine Sprache halten.
   */

  /** Emoji or icon identifier for display */
  icon: text("icon").notNull(),
```

- [ ] **Step 3: Migration gegen eine echte Datenbank fahren**

Run:
```bash
docker compose up -d db
DATABASE_URL=postgresql://momo:password@localhost:5432/momo_test node scripts/migrate.mjs
```

`scripts/migrate.mjs:56` liest `DATABASE_URL`, nicht `TEST_DATABASE_URL` — letzteres kennt nur `vitest.config`.
Expected: `0035_achievements_drop_display_text` angewandt, kein Fehler.

- [ ] **Step 4: Prüfen, daß die Spalten weg sind**

Run:
```bash
docker compose exec -T db psql -U momo -d momo_test -c "\d achievements" | grep -cE "^ (title|description) "
```
Expected: `0`

- [ ] **Step 5: `drizzle/CLAUDE.md` ergänzen**

Am Ende der Migrationsliste:

```markdown
- `0035_achievements_drop_display_text.sql` — Errungenschafts-Anzeigetext raus aus der DB: `achievements.title` und `achievements.description` entfernt. Beide wurden von `seedAchievements()` aus `ACHIEVEMENT_DEFINITIONS` gespiegelt und waren dadurch in jeder Instanz deutsch, auch für Nutzerinnen mit `locale = "fr"`. Anzeigetext liegt jetzt in `messages/*.json` unter `achievements.catalog.<key>`; der `key` bleibt die stabile Identität.
```

- [ ] **Step 6: Commit**

```bash
git add drizzle/0035_achievements_drop_display_text.sql lib/db/schema.ts drizzle/CLAUDE.md
git commit -m "db(db): achievements.title und .description entfernt"
```

---

### Task 5: Die sechs Lesestellen

**Files:**
- Modify: `lib/statistics.ts:768-780` (`AchievementWithProgress`), `:793-830`, `:260-261`, `:657-666`, `:804-805`
- Modify: `lib/export.ts:202-215`
- Modify: `lib/push.ts:1232`, `:1449`, `:1459`
- Modify: `lib/gamification.ts:20`, `:22-32`, `:688` — **die Brücke entfernen** (siehe unten)
- Modify: `lib/tasks.ts:151`, `:664` — Kaskade aus `UnlockedAchievement.title`
- Modify: `lib/db/schema.ts:695` — Kommentar der `secret`-Spalte nennt noch `title + description`
- Test: `__tests__/statistics.test.ts`

> **Nachgetragen 2026-09-02, nach dem Review von Task 3+4.** Task 3+4 hat in
> `lib/gamification.ts:20` einen statischen `import deMessages from
> "@/messages/de.json"` eingeführt, der `UnlockedAchievement.title`
> kompilierbar hält. Der Controller hatte geruled, „Task 5 löscht ihn" — diese
> Datei stand aber in **keiner** Task-Dateiliste. Das Review hat es gefunden:
> bliebe die Brücke stehen, lesen fr- und zh-Nutzerinnen dauerhaft deutsche
> Push-Titel, und `tsc`, `check:i18n` und die gesamte Suite sind grün dabei.
> Kein Test schlägt an ihrem Überleben fehl.
>
> **Task 5 besitzt sie jetzt ausdrücklich.** `UnlockedAchievement` verliert
> `title`; die Kaskade läuft über `lib/push.ts:1449` und `lib/tasks.ts:151`
> sowie `:664`. `lib/push.ts:1459` übersetzt ohnehin schon aus dem `key`
> (Step 6), womit der Titel dort nicht mehr gebraucht wird.

**Interfaces:**
- Consumes: `achievements` ohne `title`/`description` (Task 4)
- Produces: `AchievementWithProgress` **ohne** `title` und `description`, mit unverändertem `key: string`. Task 6 rendert daraus.

- [ ] **Step 1: Failing test schreiben**

In `__tests__/statistics.test.ts`:

```ts
import type { AchievementWithProgress } from "@/lib/statistics";

describe("AchievementWithProgress trägt keinen Anzeigetext", () => {
  it("hat key, aber weder title noch description", () => {
    const sample: AchievementWithProgress = {
      id: "00000000-0000-0000-0000-000000000000",
      key: "first_task",
      icon: "🌱",
      rarity: "common",
      coinReward: 10,
      secret: false,
      earnedAt: null,
    };
    expect(sample.key).toBe("first_task");
    expect(Object.keys(sample)).not.toContain("title");
    expect(Object.keys(sample)).not.toContain("description");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/statistics.test.ts -t "AchievementWithProgress trägt keinen"`
Expected: FAIL — TypeScript meldet fehlende Pflichtfelder `title` und `description`.

- [ ] **Step 3: `AchievementWithProgress` kürzen**

```ts
/** An achievement enriched with earned status, progress data, and rarity. */
export interface AchievementWithProgress {
  id: string;
  /** Stabile Identität; Anzeigetext kommt aus achievements.catalog.<key>. */
  key: string;
  icon: string;
  rarity: string;
  coinReward: number;
  secret: boolean;
  earnedAt: Date | null;
  /** Progress towards the unlock threshold, only provided for countable achievements. */
  progress?: { current: number; total: number };
}
```

- [ ] **Step 4: Die vier Selects in `lib/statistics.ts` bereinigen**

An allen vier Stellen (`:260-261`, `:657-666`, `:804-805` und der Select in `getAchievementsWithProgress`) die Zeilen `title: achievements.title,` und `description: achievements.description,` entfernen. Bei `:666` fällt `achievements.title` zusätzlich aus dem `.groupBy(...)` weg:

```ts
.groupBy(achievements.id, achievements.key, achievements.icon)
```

- [ ] **Step 5: `lib/export.ts` — zur Exportzeit übersetzen**

Der Select in `:121-137` holt sechzehn Nutzerfelder, `locale` ist **nicht** darunter. Erst ergänzen, sonst gibt es nichts zu übersetzen:

```ts
        theme: users.theme,
        locale: users.locale,
        createdAt: users.createdAt,
      })
```

Das Feld landet damit auch im Export selbst — für einen DSGVO-Export ist das richtig, es sind Nutzerdaten.

Dann `getTranslations` mit dieser Locale:

```ts
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/i18n/locales";

// … innerhalb der Export-Funktion. lib/export.ts:112 destrukturiert
// `userRows` aus einem Promise.all — ein Array, keine Zeile.
const t = await getTranslations({
  locale: userRows[0]?.locale ?? DEFAULT_LOCALE,
  namespace: "achievements",
});
```

Der Select liefert nur noch `key`; Titel und Beschreibung entstehen beim Mappen:

```ts
db
  .select({
    key: achievements.key,
    icon: achievements.icon,
    earnedAt: userAchievements.earnedAt,
  })
  .from(userAchievements)
  .innerJoin(
    achievements,
    eq(userAchievements.achievementId, achievements.id)
  )
  .where(eq(userAchievements.userId, userId)),
```

und beim Aufbau des Exportobjekts:

```ts
achievements: achievementRows.map((a) => ({
  key: a.key,
  title: t(`catalog.${a.key}.title`),
  description: t(`catalog.${a.key}.description`),
  icon: a.icon,
  earnedAt: a.earnedAt,
})),
```

- [ ] **Step 6: `lib/push.ts:1232` und `:1459` auf `key` umstellen**

Beide Stellen lesen heute `achievements.title`. Sie liefern nur noch den `key` weiter; die Übersetzung passiert in Schnitt 3, wenn die Builder eine Locale bekommen. Bis dahin bleibt der deutsche Text — aus `messages/de.json`, nicht aus der DB:

```ts
// :1232 — Select
key: achievements.key,
```

```ts
// :1459 — Payload.
//
// getTranslations mit explizitem DEFAULT_LOCALE, nicht mit einem statischen
// JSON-Import: der waere der erste im Projekt und zoege 64 KB messages/de.json
// ins Server-Bundle. Schnitt 3 tauscht hier nur DEFAULT_LOCALE gegen die
// Locale der Nutzerin — eine Zeile, kein Umbau.
const tAch = await getTranslations({
  locale: DEFAULT_LOCALE,
  namespace: "achievements",
});
// ...
body: `${achievement.icon} ${tAch(`catalog.${achievement.key}.title`)} (+${achievement.coinReward} Coins)`,
```

Imports am Kopf von `lib/push.ts` ergänzen:

```ts
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/i18n/locales";
```

Die Funktion, in der `:1459` sitzt, wird dadurch `async`, falls sie es nicht schon ist — `npx tsc --noEmit` in Step 7 benennt die Aufrufstelle.

- [ ] **Step 6b: Die Brücke entfernen**

`UnlockedAchievement` verliert `title`:

```ts
export interface UnlockedAchievement {
  key: string;
  icon: string;
  rarity: string;
  coinReward: number;
}
```

Dann fallen weg: der Import in `:20`, die `achievementTitlesDe`-Konstante in
`:22-32` und ihre Lesestelle in `:688`. Die Kaskade trifft `lib/push.ts:1449`
und `lib/tasks.ts:151`/`:664` — `tsc` benennt sie.

Gegenprobe, die diesen Task erst abschließt:

```bash
grep -n "messages/de.json" lib/ -r && echo "BRUECKE STEHT NOCH" || echo "ok"
```
Expected: `ok`

- [ ] **Step 6c: Den veralteten Schema-Kommentar berichtigen**

`lib/db/schema.ts:695` beschreibt bei der `secret`-Spalte noch „title +
description shown as '???'" — beide Spalten sind seit Migration `0035` weg.
Auf den Anzeigepfad umschreiben: `achievements.secret_title` /
`secret_description` in `messages/*.json`.

- [ ] **Step 7: Typecheck und volle Suite**

Run: `npx tsc --noEmit && npm test`
Expected: beides grün. `tsc` benennt jede vergessene Lesestelle namentlich.

- [ ] **Step 8: Commit**

```bash
git add lib/statistics.ts lib/export.ts lib/push.ts __tests__/statistics.test.ts
git commit -m "refactor(gamification): sechs Lesestellen liefern key statt Anzeigetext"
```

---

### Task 6: Die Renderer übersetzen

**Files:**
- Modify: `components/progress/tabs/achievements-tab.tsx:82`, `:88`
- Modify: `components/achievements/achievement-row.tsx:81`, `:83`
- Modify: `components/animations/achievement-toast.tsx:197`
- Test: `__tests__/achievements-i18n.test.ts` (anlegen; **kein** `.tsx` — `vitest.config` sammelt nur `*.test.ts`)

**Interfaces:**
- Consumes: `AchievementWithProgress` ohne Anzeigetext (Task 5), Keys aus Task 1/2

`achievements-tab.tsx` ist eine **Server**-Komponente (`async`, ruft `getAchievementsWithProgress` direkt) — dort `getTranslations`. `achievement-row.tsx` bindet bereits `useTranslations` (es ruft `t("secret_title")` in Zeile 81) — dort denselben Hook weiterbenutzen.

- [ ] **Step 1: Failing test schreiben — ohne DOM**

`@testing-library/react` und `jsdom` sind **nicht** installiert, und
`vitest.config` sammelt nur `__tests__/**/*.test.ts` — eine `.tsx`-Testdatei
liefe nie, auch nicht stumm rot. Es gibt null Komponententests im Repo.

Zwei neue devDependencies plus eine Config-Änderung, um eine Zeile zu prüfen,
sind Testinfrastruktur und nicht Teil dieser Migration. Das echte Risiko ist
ein fehlender Key oder eine vergessene Lesestelle — beides ist ohne DOM
prüfbar. Das Rendering deckt die vorhandene Playwright-Suite ab, plus der
Chrome-Blick in Step 7.

`__tests__/achievements-i18n.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { ACHIEVEMENT_DEFINITIONS, LEVELS } from "@/lib/gamification";

const LOCALES = ["de", "en", "es", "fr", "nl", "ru", "zh"] as const;

function messages(loc: string) {
  return JSON.parse(
    readFileSync(join(process.cwd(), `messages/${loc}.json`), "utf8")
  );
}

describe("Katalogtexte vollstaendig, Zeile liest sie nicht mehr", () => {
  it("jeder Katalog-key hat Titel und Beschreibung in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const catalog = messages(loc).achievements.catalog as Record<
        string,
        { title?: string; description?: string }
      >;
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        expect(catalog[def.key]?.title, `${loc}: title fehlt fuer ${def.key}`).toBeTruthy();
        expect(
          catalog[def.key]?.description,
          `${loc}: description fehlt fuer ${def.key}`
        ).toBeTruthy();
      }
    }
  });

  it("jedes Level hat einen Namen in allen sieben Locales", () => {
    for (const loc of LOCALES) {
      const levels = messages(loc).achievements.levels as Record<string, string>;
      for (const lvl of LEVELS) {
        expect(levels[String(lvl.level)], `${loc}: level ${lvl.level} fehlt`).toBeTruthy();
      }
    }
  });

  it("keine Komponente liest achievement.title oder .description", () => {
    for (const file of [
      "components/achievements/achievement-row.tsx",
      "components/animations/achievement-toast.tsx",
      "components/progress/tabs/achievements-tab.tsx",
    ]) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      expect(src, `${file} liest achievement.title`).not.toMatch(
        /achievement\.(title|description)/
      );
      expect(src, `${file} liest einen LevelDef-Titel`).not.toMatch(
        /LevelDef\.title/
      );
    }
  });

  it("kein Locale hat einen Katalog-Eintrag, den der Code nicht kennt", () => {
    const known = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d.key));
    for (const loc of LOCALES) {
      const extra = Object.keys(messages(loc).achievements.catalog).filter(
        (k) => !known.has(k)
      );
      expect(extra, `${loc} hat Katalog-Keys ohne Definition`).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestaetigen**

Run: `npx vitest run __tests__/achievements-i18n.test.ts`
Expected: FAIL im dritten Fall — die drei Komponenten lesen noch `achievement.title`.

- [ ] **Step 3: `achievement-row.tsx` umstellen**

Zeile 81 und 83; `t` ist bereits gebunden:

```tsx
{isSecret ? t("secret_title") : t(`catalog.${achievement.key}.title`)}
```
```tsx
{isSecret ? t("secret_description") : t(`catalog.${achievement.key}.description`)}
```

- [ ] **Step 4: `achievements-tab.tsx` umstellen**

Zeile 82 und 88 lesen `currentLevelDef.title` / `nextLevelDef.title`. Am Anfang der Komponente:

```tsx
const t = await getTranslations("achievements");
```

dann:

```tsx
<p className={RAIL_LINE}>{t(`levels.${currentLevelDef.level}`)}</p>
```
```tsx
title: t(`levels.${nextLevelDef.level}`),
```

Import ergänzen: `import { getTranslations } from "next-intl/server";`

- [ ] **Step 5: `achievement-toast.tsx:197` umstellen**

```tsx
{t(`catalog.${achievement.key}.title`)}
```

Bindet die Komponente noch kein `t`, oben ergänzen: `const t = useTranslations("achievements");`

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run __tests__/achievements-i18n.test.ts && npx tsc --noEmit`
Expected: beides grün

- [ ] **Step 7: In Chrome ansehen**

`npm run dev`, dann `/progress?tab=achievements` einmal mit `locale`-Cookie `de` und einmal mit `fr` öffnen. Erwartet: derselbe Katalog, zwei Sprachen, keine leeren Zellen und kein sichtbarer Rohkey.

Grüne Tests sind kein Beleg dafür, daß ein Layout mit längeren französischen Titeln nicht bricht — die Zeilen sind schmal. Umbrüche prüfen.

- [ ] **Step 8: Commit**

```bash
git add components/ __tests__/achievements-i18n.test.ts
git commit -m "feat(gamification): Errungenschaften und Level rendern in der Nutzersprache"
```

---

### Task 7: Doku und Abschluß

**Files:**
- Modify: `CHANGELOG.md` (`[Unreleased]`)
- Modify: `docs-site/features.md`

- [ ] **Step 1: `CHANGELOG.md` ergänzen**

Unter `## [Unreleased]` einen `### Changed`-Abschnitt:

```markdown
- **Errungenschaften und Level sprechen jetzt sieben Sprachen.** Die 31
  Errungenschaftstitel und die 10 Levelnamen standen als deutsche Literale in
  `lib/gamification.ts` und wurden von `seedAchievements()` per Upsert in die
  Datenbank jeder Instanz geschrieben. Gelesen wurden sie von dort — auch für
  Nutzerinnen mit `locale = "fr"`, die auf `/progress?tab=achievements`
  „Erstes Wunschlisten-Item gekauft" lasen. `achievements.title` und
  `.description` sind entfernt (Migration `0035`); Anzeigetext liegt in
  `messages/*.json`, die Tabelle hält den `key`. Der DSGVO-Export übersetzt
  zur Exportzeit aus `users.locale` und bleibt damit lesbar.
```

- [ ] **Step 2: `docs-site/features.md` prüfen**

Behauptet die Seite Mehrsprachigkeit an einer Stelle, die Errungenschaften nennt, ist sie jetzt wahr — dann keine Änderung. Nennt sie eine Einschränkung, streichen.

Run: `grep -niE "sprach|language|locale|errungenschaft|achievement" docs-site/features.md`

- [ ] **Step 3: `check:i18n` und volle Suite**

Run: `npm run check:i18n && npm test && npx tsc --noEmit && npm run lint`
Expected: alle vier grün

`check:i18n` meldet die neuen Keys in dieser Fassung **nicht** — es prüft nur *referenziert ⇒ vorhanden*, und `t(\`catalog.${key}.title\`)` ist ein dynamischer Key, den der Literal-Scan überspringt. Das ist erwartet und genau die Lücke, die Schnitt 2 schließt.

- [ ] **Step 4: Commit und PR**

```bash
git add CHANGELOG.md docs-site/features.md
git commit -m "docs(docs): Errungenschaften in sieben Sprachen im CHANGELOG"
git push -u origin HEAD
gh pr create --title "feat(gamification): Errungenschaften und Level in sieben Sprachen"
```
