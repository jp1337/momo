# Task 5 Report — Die Ankunft umkehren

## Changes per file

### `app/globals.css`
`@keyframes lichtkegel-atmen` inverted: was `0%,100% { opacity: 0.85 }` /
`50% { opacity: 1 }` (light arrives after 3s of a 6s cycle). Now
`0%,100% { opacity: 1 }` / `50% { opacity: 0.85 }` — full strength at
arrival, a slight dip mid-cycle. Comment added explaining the reversal, taken
verbatim from the brief.

### `components/dashboard/daily-quest-card.tsx`
- Removed the now-unused `import { motion } from "motion/react";` (line 40).
  Verified with `grep -n "motion\." components/dashboard/daily-quest-card.tsx`
  before the edit that `motion.div` was used only at the wrapper open
  (line 272) and its close (line 439) — no other usage in the file.
- Replaced the outer `<motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.35,ease:"easeOut"}} data-testid="quest-light" className="lichtkegel flex flex-col gap-4">` with a plain
  `<div data-testid="quest-light" className="lichtkegel flex flex-col gap-4">`,
  same testid and className, verbatim. Closing `</motion.div>` → `</div>`.
- Added the explanatory comment above the wrapper, verbatim from the brief.

### `components/dashboard/quick-wins-section.tsx`
- Extended the existing `motion/react` import with `useReducedMotion`
  (single import line, not a second one):
  `import { AnimatePresence, motion, useReducedMotion } from "motion/react";`
- Added `const reduceMotion = useReducedMotion();` inside the component body.
- Root `<section>` → `<motion.section initial={reduceMotion ? false : {opacity:0}} animate={{opacity:1}} transition={{duration:0.4,delay:0.1,ease:"easeOut"}}>`,
  closing `</section>` → `</motion.section>`.
- Left `as={motion.li}`, `tone="secondary"`, and the row `exit`/`transition`
  values untouched, as instructed.

### `e2e/dashboard.spec.ts`
Appended the `Die Ankunft` describe block from the brief verbatim (two
tests: keyframe-rule opacity at 0%, and no `opacity`/`translate` in the
quest wrapper's `style` attribute). Kept the brief's `?? ""` fallback for
the `style` read exactly as written (not "improved" to a truthiness check).

No changes were needed in `components/ui/list.tsx` — nothing in this task
required touching the shared primitive.

## RED (before implementation)

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts -g "Die Ankunft"

Running 3 tests using 1 worker
  ✓  1 [setup] › e2e/global.setup.ts:34:6 › authenticate (61ms)
  ✘  2 [chromium] › e2e/dashboard.spec.ts:176:7 › Die Ankunft › das Licht steht bei Ankunft auf voller Stärke (1.6s)
  ✘  3 [chromium] › e2e/dashboard.spec.ts:205:7 › Die Ankunft › die Quest fährt nicht ein (1.3s)

  1) ... Expected: "1"  Received: "0.85"
  2) ... Expected substring: not "opacity"
     Received string: "opacity:0;transform:translateY(16px)"

  2 failed, 1 passed (5.0s)
```

Matches the brief's expected failure exactly.

## GREEN (after implementation)

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts -g "Die Ankunft"

Running 3 tests using 1 worker
  ✓  1 [setup] › e2e/global.setup.ts:34:6 › authenticate (61ms)
  ✓  2 [chromium] › e2e/dashboard.spec.ts:176:7 › Die Ankunft › das Licht steht bei Ankunft auf voller Stärke (1.7s)
  ✓  3 [chromium] › e2e/dashboard.spec.ts:205:7 › Die Ankunft › die Quest fährt nicht ein (1.3s)

  3 passed (4.2s)
```

Full `dashboard.spec.ts` + `design-rules.spec.ts`:

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts e2e/design-rules.spec.ts

Running 23 tests using 1 worker
  ... (all 23 lines ✓, including both dark/light "trägt Amber höchstens
       einmal", "trägt Fraunces genau einmal", "keine umrahmte oder
       gefüllte Inhaltsfläche", "hält jede Inhaltsspalte auf dem Maß")
  23 passed (36.8s)
```

`design-tokens.spec.ts` (nearest gate, per task instructions):

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-tokens.spec.ts
  ... 38 passed (49.1s)
```

## Static checks

```
$ npx tsc --noEmit
(no output — clean)

$ npm run lint
✖ 11 problems (0 errors, 11 warnings)
```
All 11 warnings are pre-existing `react-hooks/set-state-in-effect` and one
`jsx-a11y` warning in unrelated files (`checkbox.tsx`, `task-form.tsx`,
`topic-form.tsx`, `wishlist-form.tsx`, `timezone-settings.tsx`, `push-*`).
Confirmed with `grep -E "daily-quest-card|quick-wins-section"` on the lint
output: zero hits — neither modified component introduced a warning.

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 2209 Verstoesse, keiner neu.
```
Ratchet unchanged at 2209, as required (never rise).

```
$ npm run check:i18n
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1022 translation key references across source files.
✓ All translation keys are present in every language file.
```

## Chrome verification

Reloaded `/dashboard` via the Chrome extension (existing shared dev server,
not started or stopped by me):

- **Dark mode**: quest headline ("Steuerprogramm kaufen") renders at full
  strength in the post-load screenshot; Quick Wins list ("Schnell erledigt —
  unter 15 Minuten") renders below it, fully visible, no layout shift.
- **Light mode**: same — cycled the navbar theme toggle to explicit light;
  quest and Quick Wins both render correctly, amber/ink tokens track the
  theme.
- **Reduced motion**: could not toggle Chrome DevTools' emulated media
  feature through the extension tools, so I drove a throwaway Playwright
  script (`chromium.newContext({ reducedMotion: "reduce" })`, reusing
  `e2e/.auth/user.json`, deleted after use — no file left in the tree)
  against the same running dev server:
  - `quest-light` element: `getAttribute("style")` → `null` — no inline
    style at all, confirming no entrance animation and no residual Motion
    styling.
  - Quick Wins `<section>`: computed `opacity` → `1`, static, immediately
    (verified after a 600ms wait, well past the un-reduced 0.1s delay +
    0.4s duration it would otherwise use).
  - Full-page screenshot (light theme, reduced motion) confirms the quest
    headline and the Quick Wins list are both fully rendered, static, no
    visual fade residue.

## Self-review

- The brief's DOM contract text says `quest-light` carries "nach dem Laden
  **keinen** Inline-`opacity`-Stil" — I achieved a stronger result (no style
  attribute at all), which is a superset of the requirement and matches the
  ambiguity resolution given ("`getAttribute('style')` returns `null`").
- I did not touch `components/ui/list.tsx` — nothing in this task required
  it, per the guidance to stop and report rather than modify it.
- I did not add a fade to the greeting/meta head group, per the stated
  resolution — only `QuickWinsSection` got the entry animation.
- One judgment call: Motion still writes `opacity: 1;` as an inline style
  on the Quick Wins `<section>` even under `initial={false}` — Framer
  Motion always stamps the `animate` target as inline style on a `motion.*`
  element, reduced motion or not. This is expected library behavior, not a
  DOM-contract violation (the contract in this task only constrains
  `quest-light`, not the Quick Wins section), and the page is visually and
  functionally static either way. Flagging it so reviewers know it was
  seen, not missed.
- I could not directly emulate `prefers-reduced-motion` via Chrome DevTools
  Rendering panel through the extension tool set available to me, so I used
  a throwaway Playwright script instead to get the equivalent guarantee.
  The script and its output PNG are not part of the working tree (deleted
  after use); only the `e2e/dashboard.spec.ts` test changes from the brief
  are committed.

## Fix round 1 — three comments made false by 0fe99c3

### Before/After comments

#### 1. `app/globals.css` (line 320)

**Before:**
```
 * Die Opazitaet atmet leicht (6s, 0.85 → 1) statt zu pulsieren — das Licht
 * soll wirken, als stuende es einfach da, nicht als bluepe es. Unter
 * prefers-reduced-motion bleibt das Licht selbst stehen, nur die Animation
 * faellt weg: der Kegel ist Inhalt (Beleuchtung), keine Bewegung.
```

**After:**
```
 * Die Opazitaet atmet leicht (6s, 1 → 0.85 in der Mitte) statt zu pulsieren —
 * das Licht steht bei Ankunft auf voller Staerke, nicht zuletzt (auf einer Seite,
 * deren These "ein Lichtkegel" ist, muss das Licht schon beim Laden wirken).
 * Unter prefers-reduced-motion bleibt das Licht selbst stehen, nur die Animation
 * faellt weg: der Kegel ist Inhalt (Beleuchtung), keine Bewegung.
```

#### 2. `components/dashboard/daily-quest-card.tsx` (line 32)

**Before:**
```
 * - Motion entrance animation (fade + slide up)
```

**After:**
```
 * - At full strength on arrival; only the surrounding sections settle in after
```

#### 3. `e2e/design-rules.spec.ts` (lines 24-26)

**Before:**
```
 * kommendes Task entfernt diese Animation ganz ("Die Ankunft umkehren");
 * bis dahin wartet dieser Helper auf das reale Ende, statt zu raten, wie
 * lange 0.35s plus Jitter brauchen.
```

**After:**
```
 * Die Eintrittsanimation ist weg (2026-08-22), also ist die Behauptung sofort
 * erfuellt; der Helper bleibt aber als Guard, falls eine Eintrittsanimation je
 * wiederkommt. Das `.lichtkegel`-Element selbst hat nie inline-opacity, und die
 * Atemanimation laeuft auf dem `::before` und erreicht nie 0.
```

### git diff output

```diff
diff --git a/app/globals.css b/app/globals.css
index 5ab629c..40e5788 100644
--- a/app/globals.css
+++ b/app/globals.css
@@ -317,9 +317,10 @@ body {
  * Container-Mitte als Anker bleibt sie bei Container-Mitte, egal wie breit
  * die Box ist.
  *
- * Die Opazitaet atmet leicht (6s, 0.85 → 1) statt zu pulsieren — das Licht
- * soll wirken, als stuende es einfach da, nicht als bluepe es. Unter
- * prefers-reduced-motion bleibt das Licht selbst stehen, nur die Animation
+ * Die Opazitaet atmet leicht (6s, 1 → 0.85 in der Mitte) statt zu pulsieren —
+ * das Licht steht bei Ankunft auf voller Staerke, nicht zuletzt (auf einer Seite,
+ * deren These "ein Lichtkegel" ist, muss das Licht schon beim Laden wirken).
+ * Unter prefers-reduced-motion bleibt das Licht selbst stehen, nur die Animation
  * faellt weg: der Kegel ist Inhalt (Beleuchtung), keine Bewegung.
  */
 .lichtkegel {
diff --git a/components/dashboard/daily-quest-card.tsx b/components/dashboard/daily-quest-card.tsx
index 7176df4..298b44b 100644
--- a/components/dashboard/daily-quest-card.tsx
+++ b/components/dashboard/daily-quest-card.tsx
@@ -29,7 +29,7 @@
  * - Empty state and celebration (completed) state — both still render the
  *   page's h1, in the empty state as the "no quest" text, in the completed
  *   state as the struck-through, dimmed title
- * - Motion entrance animation (fade + slide up)
+ * - At full strength on arrival; only the surrounding sections settle in after
  *
  * Receives all data as props — no direct data fetching.
  */
diff --git a/e2e/design-rules.spec.ts b/e2e/design-rules.spec.ts
index 5588575..c443e37 100644
--- a/e2e/design-rules.spec.ts
+++ b/e2e/design-rules.spec.ts
@@ -21,9 +21,10 @@ import {
  * "nicht da": beide Deckelungs-Regeln unten (`inside ≤ 2`, `outside ≤ …`)
  * werden von `0/0` genauso erfüllt wie von einer echten Messung, ohne dass
  * der Test das je bemerkt — genau der Fund der Task-3-Review. Ein
- * kommendes Task entfernt diese Animation ganz ("Die Ankunft umkehren");
- * bis dahin wartet dieser Helper auf das reale Ende, statt zu raten, wie
- * lange 0.35s plus Jitter brauchen.
+ * Die Eintrittsanimation ist weg (2026-08-22), also ist die Behauptung sofort
+ * erfuellt; der Helper bleibt aber als Guard, falls eine Eintrittsanimation je
+ * wiederkommt. Das `.lichtkegel`-Element selbst hat nie inline-opacity, und die
+ * Atemanimation laeuft auf dem `::before` und erreicht nie 0.
  */
 async function gotoSettled(page: Page, theme: "dark" | "light", path: string) {
   await gotoWithTheme(page, theme, path);
```

### Verification steps

#### TypeScript check (`npx tsc --noEmit`)
```
(no output — clean)
```

#### Design check (`npm run check:design`)
```
Design-Token-Ratsche in Ordnung — 2209 Verstoesse, keiner neu.
```

#### Playwright tests (dashboard + design rules)
```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts e2e/dashboard.spec.ts

Running 23 tests using 1 worker

  ✓   1 [setup] › e2e/global.setup.ts:34:6 › authenticate (64ms)
  ✓   2 [chromium] › e2e/dashboard.spec.ts:13:7 › Dashboard › loads without error (2.4s)
  ✓   3 [chromium] › e2e/dashboard.spec.ts:20:7 › Dashboard › zeigt keine Stat-Tiles mehr (1.3s)
  ✓   4 [chromium] › e2e/dashboard.spec.ts:26:7 › Dashboard › renders the Daily Quest section (1.6s)
  ✓   5 [chromium] › e2e/dashboard.spec.ts:34:7 › Dashboard › zeigt keine Quick-Links mehr (1.1s)
  ✓   6 [chromium] › e2e/dashboard.spec.ts:40:7 › Dashboard › Wochentag und Energie stehen in einer Metazeile (1.0s)
  ✓   7 [chromium] › e2e/dashboard.spec.ts:50:7 › Dashboard › Streak erscheint im Rand nur, wenn sie nicht null ist, nie in der Metazeile (1.9s)
  ✓   8 [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist (3.2s)
  ✓   9 [chromium] › e2e/dashboard.spec.ts:104:7 › Dashboard › page renders without JavaScript errors (1.6s)
  ✓  10 [chromium] › e2e/dashboard.spec.ts:115:7 › Aufwandsstufen › die Schriftgroesse folgt der geschaetzten Dauer (1.3s)
  ✓  11 [chromium] › e2e/dashboard.spec.ts:161:7 › Aufwandsstufen › die Liste hat keine Kaesten (1.1s)
  ✓  12 [chromium] › e2e/dashboard.spec.ts:176:7 › Die Ankunft › das Licht steht bei Ankunft auf voller Stärke (1.1s)
  ✓  13 [chromium] › e2e/dashboard.spec.ts:205:7 › Die Ankunft › die Quest fährt nicht ein (1.0s)
  ✓  14 [chromium] › e2e/design-rules.spec.ts:47:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (1.1s)
  ✓  15 [chromium] › e2e/design-rules.spec.ts:89:11 › /dashboard (dark) › Amber-Zähler ist nicht blind für Bildquellen (1.1s)
  ✓  16 [chromium] › e2e/design-rules.spec.ts:115:11 › /dashboard (dark) › trägt Fraunces genau einmal (1.1s)
  ✓  17 [chromium] › e2e/design-rules.spec.ts:124:11 › /dashboard (dark) › hat keine umrahmte oder gefüllte Inhaltsfläche (1.1s)
  ✓  18 [chromium] › e2e/design-rules.spec.ts:133:11 › /dashboard (dark) › hält jede Inhaltsspalte auf dem Maß (1.1s)
  ✓  19 [chromium] › e2e/design-rules.spec.ts:47:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (1.0s)
  ✓  20 [chromium] › e2e/design-rules.spec.ts:89:11 › /dashboard (light) › Amber-Zähler ist nicht blind für Bildquellen (1.0s)
  ✓  21 [chromium] › e2e/design-rules.spec.ts:115:11 › /dashboard (light) › trägt Fraunces genau einmal (1.0s)
  ✓  22 [chromium] › e2e/design-rules.spec.ts:124:11 › /dashboard (light) › hat keine umrahmte oder gefüllte Inhaltsfläche (1.0s)
  ✓  23 [chromium] › e2e/design-rules.spec.ts:133:11 › /dashboard (light) › hält jede Inhaltsspalte auf dem Maß (1.1s)

  23 passed (30.9s)
```

### Commit

```
7177f45 fix(ui): three comments made false by 0fe99c3's arrival inversion are now true
```
