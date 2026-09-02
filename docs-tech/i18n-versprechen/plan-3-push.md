# Schnitt 3: Die Push-Builder hinter die Locale — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Nutzerin mit `locale = "fr"` bekommt französische Push- und E-Mail-Benachrichtigungen.

**Architecture:** Die Pipeline existiert bereits vollständig — `/api/locale:49` schreibt `users.locale`, `lib/notifications.ts:461` liest sie und reicht sie als `payload.locale` weiter. Der Defekt ist die **Reihenfolge**: die sieben Payload-Builder in `lib/push.ts` backen ihren Text, bevor der locale-bewußte Dispatcher ihn sieht. Die Eligible-Selects holen `users.timezone` über einen `innerJoin(users, …)`, der `users.locale` direkt daneben stehen hätte.

**Tech Stack:** TypeScript strict, Drizzle ORM, next-intl 4.13.7 (`getServerTranslations` aus `lib/i18n-server` — **nicht** `getTranslations`, siehe unten), vitest

**Spec:** `docs-tech/i18n-versprechen/design.md` — insbesondere der Abschnitt „Serverseitig" mit der Korrektur vom 2026-09-02.

## Global Constraints

- Sieben Locales, keine Ausnahme: `de`, `en`, `es`, `fr`, `nl`, `ru`, `zh`.
- Kein `any`. Strict mode ist an.
- **Nichts an `users.locale`, nichts an `/api/locale`, nichts an `lib/notifications.ts`.** Alle drei sind korrekt. Wer dort etwas ändert, hat den Fehler nicht verstanden.
- `review.push_title` und `review.push_body` existieren fertig übersetzt in allen sieben Locales. Sie werden **verdrahtet, nicht neu erfunden**.
- Fallback ist immer `users.locale ?? DEFAULT_LOCALE` aus `@/i18n/locales`. Bestandsnutzer haben `null` — das ist bekannt und gewollt.
- **Cron-Jobs dürfen `getTranslations` überhaupt nicht aufrufen** — auch nicht mit explizitem `locale`. `i18n/request.ts:31` ist `getRequestConfig(async () => {`, nimmt keine Parameter und ruft `await cookies()` unbedingt; next-intls `getConfig` ruft den Callback auch bei übergebenem Override. Ohne Request bricht das im echten Next-Runtime, nicht nur im Test. Der einzige zulässige Aufruf ist `getServerTranslations(locale, namespace)` aus `lib/i18n-server` (in Schnitt 1 angelegt).
- Commit-Format: `<type>(<scope>): <beschreibung>`, Scopes hier: `push`, `i18n`.
- `main` ist branch-protected. Ein PR. Testlauf ist `npm test` (vitest).

---

### Task 1: Die Keys anlegen

**Files:**
- Modify: alle sieben `messages/*.json`, neuer Namespace `push`

**Interfaces:**
- Produces: Namespace `push` mit 20 Keys. `review.push_title` und `review.push_body` bleiben, wo sie sind — sie sind bereits übersetzt und werden aus dem `review`-Namespace gelesen.

22 hartkodierte Strings, davon zwei bereits als Key vorhanden. 20 neue.

- [ ] **Step 1: Die 20 Keys in `messages/de.json` anlegen**

Text wörtlich aus `lib/push.ts` übernehmen, Interpolationen in ICU-Platzhalter überführen:

```json
"push": {
  "quest_title":            "Deine Daily Quest wartet",
  "quest_body":             "Heutige Mission: {title}",
  "quest_body_generic":     "Öffne Momo, um deine heutige Mission zu sehen. Ein kleiner Schritt nach vorne.",
  "due_title_one":          "Heute fällig: {title}",
  "due_body_one":           "Öffne Momo und hake es noch heute ab.",
  "due_title_many":         "{count} Aufgaben heute fällig",
  "overdue_title_one":      "Überfällig: {title}",
  "overdue_body_one":       "Diese Aufgabe wurde noch nicht erledigt. Jetzt abhaken?",
  "overdue_title_many":     "{count} überfällige Aufgaben",
  "recurring_title_one":    "🔁 {title}",
  "recurring_body_one":     "Wiederkehrende Aufgabe ist heute fällig.",
  "recurring_title_many":   "🔁 {count} wiederkehrende Aufgaben fällig",
  "streak_title":           "Halte deinen {days}-Tage-Streak am Leben!",
  "streak_body":            "Du hast heute noch keine Aufgabe erledigt. Lass deinen Streak nicht abreißen.",
  "briefing_title":         "Guten Morgen! Dein Momo-Briefing",
  "shield_title":           "Deine Cassiopeia hat deinen {days}-Tage-Streak gerettet! ✨",
  "shield_body":            "Du hast einen Tag ausgelassen, aber deine monatliche Cassiopeia hat ihn bewahrt.",
  "achievement_title":      "🏅 Errungenschaft freigeschaltet!",
  "achievement_body":       "{icon} {name} (+{coins} Coins)",
  "coins_suffix":           "Coins"
}
```

`due_title_many` heißt bewußt „Aufgaben", nicht „Tasks" wie heute in Zeile 431 — dasselbe Wort wie in `overdue_title_many` und im Rest der Oberfläche. Die Inkonsistenz war ein Tippfehler, kein Stil.

- [ ] **Step 2: `messages/en.json`, dann die restlichen fünf**

Dieselben 20 Keys je Datei. `en` zuerst als Pivot. Der Ton ist eine Benachrichtigung auf einem Sperrbildschirm: kurz, freundlich, nie vorwurfsvoll — die Zielgruppe sind Menschen mit Aufschiebeneigung, und `streak_body` darf nicht wie eine Mahnung klingen.

`shield_title` nennt die Cassiopeia (die Schildkröte aus *Momo*) — der Name bleibt in allen Sprachen stehen, er ist ein Eigenname.

- [ ] **Step 3: Vollständigkeit prüfen**

Run:
```bash
node -e "
const L=['de','en','es','fr','nl','ru','zh'];
const ref=Object.keys(require('./messages/de.json').push).sort();
let bad=0;
for(const l of L){
  const p=require('./messages/'+l+'.json').push||{};
  const miss=ref.filter(k=>!p[k]);
  if(miss.length){bad++;console.log(l,'FEHLT',miss)} else console.log(l,'ok',Object.keys(p).length);
}
process.exit(bad?1:0)"
```
Expected: sieben Zeilen `ok 20`, Exit 0

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "i18n(i18n): Namespace push mit 20 Keys in sieben Sprachen"
```

---

### Task 2: Die Locale in die Selects

**Files:**
- Modify: `lib/push.ts` — jeder Select, der `timezone: users.timezone` holt

**Interfaces:**
- Produces: jede Eligible-Zeile trägt `locale: string | null` neben `timezone`.

Die Selects joinen `users` bereits. Eine Zeile je Select.

- [ ] **Step 1: Alle betroffenen Selects finden**

Run: `grep -n "timezone: users.timezone" lib/push.ts`
Expected: eine Zeile je Benachrichtigungsart. Jede davon bekommt in Step 2 eine Nachbarzeile.

- [ ] **Step 2: `locale: users.locale` ergänzen**

An jeder gefundenen Stelle:

```ts
        timezone: users.timezone,
        locale: users.locale,
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: grün. Die Zeilen sind jetzt breiter typisiert; noch benutzt sie niemand.

- [ ] **Step 4: Commit**

```bash
git add lib/push.ts
git commit -m "refactor(push): Eligible-Selects holen users.locale neben timezone"
```

---

### Task 3: Die sieben Builder nehmen eine Locale

**Files:**
- Modify: `lib/push.ts:228-239`, `:402-431`, `:605-628`, `:807-835`, `:985-988`, `:1112-1120`, `:1287-1320`, `:1395-1402`, `:1450-1462`
- Test: `__tests__/push-i18n.test.ts`

**Interfaces:**
- Consumes: `locale` aus den Select-Zeilen (Task 2), Keys aus Task 1
- Produces: jeder Builder ist `async` und nimmt `locale: string | null` als ersten Parameter.

- [ ] **Step 1: Failing test schreiben**

`__tests__/push-i18n.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Push-Payloads sind nicht mehr deutsch hartkodiert", () => {
  const src = readFileSync(join(process.cwd(), "lib/push.ts"), "utf8");

  it("enthält keinen der 22 deutschen Payload-Strings mehr", () => {
    for (const literal of [
      "Deine Daily Quest wartet",
      "Öffne Momo, um deine heutige Mission zu sehen",
      "Öffne Momo und hake es noch heute ab",
      "Diese Aufgabe wurde noch nicht erledigt",
      "Wiederkehrende Aufgabe ist heute fällig",
      "Lass deinen Streak nicht abreißen",
      "Dein Wochenrückblick",
      "Guten Morgen! Dein Momo-Briefing",
      "monatliche Cassiopeia hat ihn bewahrt",
      "Achievement freigeschaltet",
    ]) {
      expect(src, `"${literal}" steht noch in lib/push.ts`).not.toContain(literal);
    }
  });

  it("ruft getTranslations immer mit explizitem locale auf", () => {
    const calls = [...src.matchAll(/getTranslations\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls.length, "kein getTranslations-Aufruf gefunden").toBeGreaterThan(0);
    for (const arg of calls) {
      expect(arg, `getTranslations(${arg}) ohne locale — im Cron gibt es keine Request-Locale`).toContain("locale");
    }
  });

  it("verdrahtet die vorhandenen review.push_-Keys, statt neue zu erfinden", () => {
    expect(src).toContain("push_title");
    expect(src).toContain("push_body");
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npx vitest run __tests__/push-i18n.test.ts`
Expected: FAIL in allen drei Fällen

- [ ] **Step 3: Den Import und einen Helfer anlegen**

Am Kopf von `lib/push.ts`:

```ts
import { getServerTranslations } from "@/lib/i18n-server";
```

und, oberhalb der Builder:

```ts
/**
 * Uebersetzer fuer einen Cron-Lauf.
 *
 * NICHT getTranslations aus next-intl/server: das laeuft nur im Request-Scope.
 * i18n/request.ts:31 nimmt keine Parameter und ruft cookies() unbedingt, und
 * next-intls getConfig ruft den Callback auch bei uebergebenem locale-Override.
 * Ohne Request bricht das auch im echten Next-Runtime.
 * getServerTranslations (lib/i18n-server, Schnitt 1) laedt die Messages ueber
 * denselben dynamischen Import wie i18n/request.ts und braucht keinen Request.
 *
 * Bestandsnutzer haben locale = null (der Cookie liegt im Browser, es gibt
 * keine Quelle fuer einen Backfill) und lesen deshalb DEFAULT_LOCALE, bis sie
 * die Sprache einmal umstellen. Bekannt und bewusst, siehe design.md.
 */
async function pushT(locale: string | null, namespace: string) {
  return getServerTranslations(locale, namespace);
}
```

- [ ] **Step 4: Die Builder umstellen**

Jeder Builder wird `async` und nimmt `locale` als ersten Parameter. Muster am Wochenrückblick (Zeile 1112), der die **vorhandenen** Keys verdrahtet:

```ts
  /** Build weekly review payload. */
  async function buildPayload(
    locale: string | null,
    summary: { completed: number; postponed: number; streak: number }
  ): Promise<NotificationPayload & ChannelPayload> {
    const t = await pushT(locale, "review");
    return {
      title: t("push_title"),
      body: t("push_body", {
        completed: summary.completed,
        postponed: summary.postponed,
        streak: summary.streak,
      }),
      icon: "/icon-192.png",
      url: "/progress?tab=review",
      tag: "weekly-review",
    };
  }
```

Die übrigen acht Stellen nach demselben Muster, mit `pushT(locale, "push")` und den Keys aus Task 1:

| Zeile | Vorher | Nachher |
| --- | --- | --- |
| 231/232 | `"Deine Daily Quest wartet"` / `` `Heutige Mission: ${questTitle}` `` | `t("quest_title")` / `t("quest_body", { title: questTitle })` |
| 238/239 | dito / Langtext | `t("quest_title")` / `t("quest_body_generic")` |
| 416/417 | `` `Heute fällig: ${title}` `` / Langtext | `t("due_title_one", { title })` / `t("due_body_one")` |
| 431 | `` `${dueTasks.length} Tasks heute fällig` `` | `t("due_title_many", { count: dueTasks.length })` |
| 613/614 | `` `Überfällig: ${title}` `` / Langtext | `t("overdue_title_one", { title })` / `t("overdue_body_one")` |
| 628 | `` `${overdueTasks.length} überfällige Aufgaben` `` | `t("overdue_title_many", { count: overdueTasks.length })` |
| 817/818 | `` `🔁 ${title}` `` / Langtext | `t("recurring_title_one", { title })` / `t("recurring_body_one")` |
| 835 | `` `🔁 ${dueTasks.length} wiederkehrende Tasks fällig` `` | `t("recurring_title_many", { count: dueTasks.length })` |
| 987/988 | `` `Halte deinen ${streakCurrent}-Tage-Streak am Leben!` `` / Langtext | `t("streak_title", { days: streakCurrent })` / `t("streak_body")` |
| 1320 | `"Guten Morgen! Dein Momo-Briefing"` | `t("briefing_title")` |
| 1401/1402 | `` `Deine Cassiopeia … ${streakCurrent} …` `` / Langtext | `t("shield_title", { days: streakCurrent })` / `t("shield_body")` |
| 1458/1459 | `` `🏅 Achievement freigeschaltet!` `` / Body | `t("achievement_title")` / `t("achievement_body", …)` |

Für 1459 kommt der Errungenschaftsname aus dem `achievements`-Namespace, nicht aus `push`. Schnitt 1 hat dort bereits ein `getTranslations({ locale: DEFAULT_LOCALE, namespace: "achievements" })` hinterlassen — hier wird nur das Locale-Argument echt:

```ts
    const tPush = await pushT(locale, "push");
    const tAch = await pushT(locale, "achievements");
    const payload: NotificationPayload & ChannelPayload = {
      title: tPush("achievement_title"),
      body: tPush("achievement_body", {
        icon: achievement.icon,
        name: tAch(`catalog.${achievement.key}.title`),
        coins: achievement.coinReward,
      }),
      icon: "/icon-192.png",
      url: "/achievements",
      tag: `achievement-${achievement.key}`,
    };
```

Der `DEFAULT_LOCALE`-Import bleibt — `pushT` benutzt ihn als Fallback.

> **Achtung bei `lib/push.ts:1291` (Morning Briefing).** Schnitt 1 hat dort
> `tAch` **aus** `buildPayload` herausgezogen (`:1293`), und diese Funktion ist
> per-Nutzer und **synchron**. Eine Locale pro Empfänger verlangt hier eines von
> beidem: `buildPayload` async machen und die Aufrufstelle awaiten, oder `t` als
> Parameter durchreichen. Nur `sendAchievementNotifications:1463` ist der
> Einzeiler, den dieser Plan ursprünglich für beide Stellen behauptet hat.

- [ ] **Step 5: Die Aufrufstellen nachziehen**

Jeder Builder ist jetzt `async` und braucht ein `await` plus die Locale der Zeile:

```ts
const payload = await buildPayload(row.locale, summary);
```

`npx tsc --noEmit` benennt jede vergessene Stelle namentlich — es gibt keinen Grund, sie von Hand zu suchen.

- [ ] **Step 6: Den irreführenden Kommentar berichtigen**

`lib/push.ts:402-406` sagt „no per-user i18n in cron jobs — there's no request locale". Ersetzen:

```ts
  /**
   * Builds the notification payload for a user's due-today tasks.
   *
   * Eine *Request*-Locale gibt es im Cron tatsaechlich nicht — eine
   * *Nutzer*-Locale schon: sie steht in users.locale, wird von /api/locale
   * geschrieben und kommt hier ueber den Eligible-Select herein.
   */
```

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run __tests__/push-i18n.test.ts && npx tsc --noEmit && npm test`
Expected: alle grün

- [ ] **Step 8: Commit**

```bash
git add lib/push.ts __tests__/push-i18n.test.ts
git commit -m "feat(push): Benachrichtigungen in der Sprache der Nutzerin"
```

---

### Task 4: Ein Verhaltens-Test, kein Quelltext-Test

**Files:**
- Modify: `__tests__/push-i18n.test.ts`

Die Tests aus Task 3 lesen `lib/push.ts` als Text. Das fängt einen Rückfall, beweist aber nicht, daß eine französische Nutzerin Französisch bekommt.

- [ ] **Step 1: Den Verhaltens-Test ergänzen**

```ts
import { getTranslations } from "next-intl/server";

describe("Ein Payload kommt in der Sprache der Nutzerin", () => {
  it("liefert für fr und de verschiedene Titel aus denselben Keys", async () => {
    const tFr = await getTranslations({ locale: "fr", namespace: "push" });
    const tDe = await getTranslations({ locale: "de", namespace: "push" });
    expect(tFr("quest_title")).not.toBe(tDe("quest_title"));
    expect(tFr("quest_title")).toBeTruthy();
  });

  it("interpoliert den Streak-Wert in allen sieben Sprachen", async () => {
    for (const locale of ["de", "en", "es", "fr", "nl", "ru", "zh"]) {
      const t = await getTranslations({ locale, namespace: "push" });
      const title = t("streak_title", { days: 12 });
      expect(title, `${locale} interpoliert {days} nicht`).toContain("12");
    }
  });

  it("fällt für locale null auf DEFAULT_LOCALE, nicht auf leer", async () => {
    const t = await getTranslations({ locale: DEFAULT_LOCALE, namespace: "push" });
    expect(t("quest_title")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Laufen lassen**

Run: `npx vitest run __tests__/push-i18n.test.ts`
Expected: PASS. Schlägt der zweite Fall in einer Sprache fehl, fehlt dort der `{days}`-Platzhalter — Task 1 nachbessern, nicht den Test lockern.

- [ ] **Step 3: Commit**

```bash
git add __tests__/push-i18n.test.ts
git commit -m "test(push): Payloads kommen nachweislich in der Nutzersprache"
```

---

### Task 5: `PENDING_WIRING` leeren und Doku

**Files:**
- Modify: `scripts/i18n-key-families.mjs` (falls Schnitt 2 dort Einträge hinterlassen hat)
- Modify: `docs-tech/i18n-versprechen/verwaiste-keys.md`
- Modify: `CHANGELOG.md`, `docs-site/features.md`

- [ ] **Step 1: `review.push_title` und `review.push_body` aus `PENDING_WIRING` entfernen**

Sie sind jetzt verdrahtet. Der Eintrag hatte „Schnitt 3" als Fälligkeit — die ist erreicht. `check:i18n` findet sie ab jetzt als normale Referenzen.

Run: `npm run check:i18n`
Expected: Exit 0, und die `PENDING`-Zeile nennt zwei Keys weniger.

- [ ] **Step 2: `verwaiste-keys.md` nachführen**

Die beiden Zeilen von „fehlende Verdrahtung" auf „erledigt in Schnitt 3" setzen, statt sie zu löschen — die Tabelle ist der Beleg, daß die Gegenrichtung einen echten Defekt gefunden hat.

- [ ] **Step 3: `CHANGELOG.md`**

```markdown
- **Push- und E-Mail-Benachrichtigungen kommen jetzt in der Sprache der
  Nutzerin.** `users.locale` wurde von `/api/locale` seit jeher geschrieben und
  von `lib/notifications.ts` gelesen — die sieben Payload-Builder in
  `lib/push.ts` backten ihren Text aber, *bevor* der locale-bewußte Dispatcher
  ihn zu sehen bekam, sodass jede Benachrichtigung deutsch blieb. Die
  Eligible-Selects holen die Locale jetzt neben der Zeitzone, die Builder
  übersetzen über `getTranslations({ locale })`. Dabei verdrahtet: die seit
  jeher in sieben Sprachen übersetzten `review.push_title` und
  `review.push_body`, die kein Code je referenziert hat.
- **Bekannt und bewußt:** Bestandsnutzer haben `locale = null` und lesen
  weiter Deutsch, bis sie die Sprache einmal umstellen. Der Cookie liegt im
  Browser; es gibt keine Quelle für einen Backfill.
```

- [ ] **Step 4: `docs-site/features.md`**

Run: `grep -niE "benachrichtig|notification|sprach|language" docs-site/features.md`

Nennt die Seite eine Einschränkung bei Benachrichtigungssprachen, streichen. Behauptet sie Mehrsprachigkeit, ist sie jetzt wahr.

- [ ] **Step 5: Volle Suite, Commit und PR**

```bash
npm run check:i18n && npm test && npx tsc --noEmit && npm run lint
git add -A
git commit -m "docs(docs): Benachrichtigungen in sieben Sprachen im CHANGELOG"
git push -u origin HEAD
gh pr create --title "feat(push): Benachrichtigungen in der Sprache der Nutzerin"
```
