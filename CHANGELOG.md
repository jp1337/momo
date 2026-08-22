# Changelog

All notable changes to Momo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

- **`npm run check:design`** — ein Ratschen-Test gegen hartkodierte Farben, Radien außerhalb der
  vier erlaubten Werte und neue Inline-Styles in `.tsx`. Läuft in CI (PR Gate); der Zähler darf nur
  fallen, aktuell 1947 Verstöße über die noch nicht umgestellten Seiten. Ergänzt um
  Playwright-Prüfungen (`e2e/design-tokens.spec.ts`), die den Flächenabstand zwischen Grund und
  angehobener Fläche als CIE-ΔL\* messen (statt WCAG-Kontrastverhältnis, das bei hoher Helligkeit
  komprimiert) und sicherstellen, dass die „leeren" Schatten-Tokens (`0 0 #0000`) als Listenglied
  in `box-shadow` gültig bleiben — als reines `none` verschwindet sonst die gesamte Deklaration.

### Changed

- **Neues visuelles Fundament („Lichtkegel"): zwei Flächenwerte statt Rahmen und Schatten überall.**
  Statt acht gleich gerahmten, gleich beschatteten Kästen liegt gewöhnlicher Inhalt jetzt direkt auf
  dem Hintergrund; eine sichtbare Fläche mit Kontur erscheint nur noch dort, wo sie eine echte
  Bedienmöglichkeit markiert — ein Eingabefeld, ein Button. Amber (die Akzentfarbe) ist auf den in
  diesem Schritt umgestellten Flächen — Dashboard und die Referenzseite `/design-system` — nur noch
  Licht: Textfarbe oder ein weicher Glanz, nirgends mehr eine gefüllte Fläche, und pro Seite
  höchstens einmal vorhanden. Dieser Schritt deckt bewusst nur die Schritte 1–3 des Lichtkegel-Plans
  ab (Tokens/Primitives, Durchsetzungstests, Dashboard als Pilot); Topics, Tasks, Wishlist, Progress,
  Habits und die übrigen Seiten sind noch NICHT umgestellt und zeigen bis zu ihrer eigenen Migration
  weiterhin die alte gefüllte Amber-Fläche — sichtbar z. B. im „+ New Topic"-Button auf
  `02-topics.png`. Die restlichen Seiten folgen in einem eigenständig geplanten, späteren Schritt
  (siehe `docs/superpowers/specs/2026-08-21-lichtkegel-design.md` §8). Radien sind auf den
  umgestellten Flächen auf vier Werte vereinheitlicht (vorher sechs unterschiedliche, dazu von
  Tailwind geerbte Defaults ohne eigene Definition).
- **Neue Schriften: Fraunces statt Lora, Instrument Sans statt DM Sans.** JetBrains Mono bleibt für
  Aufgabentext und Zahlen. Beide neuen Schriften sind variabel bzw. selbst gehostet über
  `next/font/google` — keine externen Requests zur Laufzeit.
- **Dashboard neu geordnet.** Die vier Stat-Kacheln (Münzen, Level, Streak, Erledigt) und die
  Schnellzugriffe auf „Alle Aufgaben"/„Alle Themen" sind entfernt — dieselben Zahlen stehen bereits
  in der Navigationsleiste bzw. der Seitenleiste, sie standen doppelt. Energie-Check-in und der
  „bester Tag"-Hinweis sind zu einer einzigen Metazeile über der Tagesaufgabe zusammengefasst. Die
  Tagesaufgabe selbst hat keinen Kasten mehr, sondern ist als große, warm beleuchtete Überschrift
  das einzig hervorgehobene Element der Seite.
- **Quick Wins auf dem Dashboard sind jetzt eine schlichte Liste statt drei Karten.** Der geschätzte
  Zeitaufwand zeigt sich in der Schriftgröße der Zeile — 5-Minuten-Aufgaben klein, 15/30-Minuten
  mittel — sodass der Aufwand sichtbar ist, bevor man den Titel liest.
- **Die Begrüßung auf dem Dashboard** setzt den Namen jetzt innerhalb des übersetzten Satzes ein,
  statt ihn mit einem festen „, " und "." aus dem Code anzuhängen. Das reparierte falsche
  Zeichensetzung in mehreren Sprachen (z. B. ein Komma nach einem Fragezeichen bei „Noch wach?").

- **Node.js 22 → 24 in App und CI**, und **Node.js 20 → 24 im Alexa-Lambda**. Node 20 ist seit
  2026-04-30 EOL, Node 24 läuft bis 2028-04-30 (Quelle: `nodejs/Release`). Betrifft
  `Dockerfile` (`node:24-alpine`), die drei `setup-node`-Schritte in `test.yml` und
  `build-and-publish.yml`, sowie das esbuild-Target und `engines` des Lambda. Verifiziert mit
  einem vollständigen Image-Build (`node -v` im Image: v24.19.0).
- **`framer-motion` → `motion`.** Das Paket wurde upstream umbenannt; der React-Einstiegspunkt ist
  jetzt `motion/react`. 25 Imports in 25 Komponenten, zusammen mit dem v13-Major. Zwei
  Präzisierungen: `framer-motion` trägt auf npm **kein** `deprecated`-Feld (der Hinweis kommt aus
  Renovates Replacement-Datensatz), und es verschwindet nicht aus `node_modules` — `motion@13.1.1`
  hängt selbst von `framer-motion@^13.1.1` ab und re-exportiert es.
- **CI-Tests laufen jetzt gegen Postgres 18** statt 16. `build-and-publish.yml` und
  `docker-compose.yml` waren längst auf 18-alpine; jeder Test validierte gegen einen Major, auf dem
  die App nicht läuft.
- **Docs-Build von Ruby 3.1 auf 4.0.** 3.1 ist seit März 2025 EOL. Der Sprung überspringt 3.4
  bewusst: Jekyll löst innerhalb von `~> 4.3` auf 4.4.1 auf, das `base64` und `csv` selbst als
  Runtime-Deps deklariert, also trifft die Default-Gem-Extraktion von Ruby 3.4 die Seite gar nicht.
  Verifiziert mit echtem Build in beiden Containern — `ruby:3.4` und `ruby:4.0.6` bauen die Seite
  gleichermaßen, und der `Gemfile.lock` fällt unter Ruby 4 **byte-identisch** aus.
- **`@types/node` von ^25 auf ^24** — bewusst ein Downgrade gegen Renovates Vorschlag ^26. Die
  Typen sollen die Runtime beschreiben, nicht ihr vorauslaufen; vorher stand ^25 über einem
  node:22-alpine-Image. Jetzt lesen beide Projekte gleich: Runtime 24, Typen ^24. In
  `renovate.json` mit `allowedVersions: "^24"` festgehalten.
- **ESLint 9 → 10** in beiden npm-Projekten. Möglich geworden durch eine Zeile Config statt eines
  Downgrades: `eslint-config-next` liefert `settings.react.version = "detect"` aus, was
  `eslint-plugin-react` dazu bringt, pro geprüfter Datei `context.getFilename()` aufzurufen — eine
  Methode, die ESLint 10 entfernt hat. `eslint.config.mjs` setzt die React-Version jetzt explizit
  (gelesen aus `react/package.json`), damit die Erkennung nie anläuft. Nebenbei schneller, weil das
  Dateisystem-Probe entfällt.
- **`ical-generator` 10 → 11**, **`npm-check-updates` 22 → 23**, **`source-map`-Override
  ^0.7 → ^0.8**, Lambda-**TypeScript 5 → 6**, plus Patch-Sweep und Lockfile-Maintenance in beiden
  npm-Projekten (`pg`, `@types/pg`, `vitest`, `next-intl`, `swagger-ui-react`, `eslint` 9.39.5,
  `serialize-javascript`, `workbox-build`, `esbuild` 0.28.2, `@types/aws-lambda`,
  `typescript-eslint` 8.67.0). Beide Projekte auditieren auf 0 Vulnerabilities.
- **`docs-site/Gemfile.lock` ist jetzt eingecheckt.** Der Docs-Build löste Gems bisher bei jedem
  Lauf neu auf — ein neues Jekyll-Release konnte den Deploy ohne Code-Änderung brechen. Der Lock
  pinnt jekyll 4.4.1 und deckt 19 Plattformen inkl. `x86_64-linux-gnu` ab.

### Removed

- **Die `Card`-Komponente.** Ersetzt durch `Surface`, die nur noch bei echten Bedienelementen
  (Eingabe, Button) und bei Dialogen/Popovers auftritt — gewöhnlicher Inhalt liegt direkt auf dem
  Hintergrund und braucht keine eigene Fläche.
- **Button-Varianten `secondary`, `ghost`, `outline`, `success`.** Es bleiben `primary` (die eine
  hervorgehobene Handlung pro Seite), `quiet` (Standard) und `danger`.
- **Die „I only have 5 minutes"-Banner-Fläche und die separate Focus-Mode-Kachel auf dem
  Dashboard.** Beide Wege bleiben erreichbar (5-Minuten-Modus über die Seitenleiste, Focus Mode
  über die Tagesaufgabe selbst), standen auf dem Dashboard aber doppelt zur Sidebar bzw.
  konkurrierten optisch mit der Tagesaufgabe.

### Fixed

- **Automerge lief ohne einen einzigen verpflichtenden Check.** Drei Dinge zusammen: `lint` und
  `next build` stehen in `build-and-publish.yml`, das nur auf `push: main` triggert — bei einem Pull
  Request liefen sie also **gar nicht**, sondern berichteten erst nach dem Merge. `main` hatte
  `required_status_checks: null`. Und `renovate.json` setzt `platformAutomerge: true`. Eine
  Renovate-Patch-PR konnte damit einziehen, ohne dass irgendetwas sie ansieht.
  Behoben: die beiden Jobs leben jetzt in `test.yml`, umbenannt zu **„PR Gate"**, das auf
  `pull_request` läuft; `lint`, `build` und `test` sind required status checks auf `main`
  (nicht-strict, `enforce_admins` bleibt an). Der Trigger durfte *nicht* an
  `build-and-publish.yml` — dessen `deploy`-Job läuft auf einem Self-hosted-Intranet-Runner in
  einem öffentlichen Repo, wo `pull_request` jede Fork-PR zu Codeausführung im Intranet machen
  würde. Dass `build` mit in der Liste steht und nicht nur `test`, hat einen konkreten Grund aus
  diesem Release: der `magic-string`-v1-Override ließ alle 1728 Tests grün und brach `next build`.

- **Zwei Webhook-Beispiele in der Doku waren kaputt ausgeliefert.** Liquid verarbeitet `{{ ... }}`
  auch in Code-Blöcken: das Home-Assistant-Beispiel rendete `title: ""` und `message: ""` (stumm —
  wer es kopierte, bekam eine leere Benachrichtigung), und die n8n-Zeile rendete „use `and` as
  inputs". Beide jetzt in `{% raw %}`.
- **`docs-site/CLAUDE.md` wurde öffentlich mitpubliziert**, weil es nicht in der `exclude`-Liste
  von `_config.yml` stand. Jetzt ausgeschlossen.
- Der Kommentar über `FROM` im Dockerfile behauptete „Node 22 LTS … supported until April 2027"
  über einem Node-24-Image.
- `alexa-skill/tsconfig.json` deklariert `types: ["node"]` explizit. TypeScript 6 hat den
  `types`-Default von `["*"]` auf `[]` geändert; ohne das fanden `console`, `process`, `fetch` und
  `RequestInit` keine Typen mehr (9 Fehler in 7 Dateien).

### Nicht übernommen

Zwei von Renovate angebotene Updates wurden getestet und liegen gelassen — Begründung und
Wiedervorlage-Bedingung stehen in `ROADMAP.md` bzw. in den `renovate.json`-Regeln:

- **`magic-string` v1**: bricht den PWA-Build (`MagicString is not a constructor`). Die Ursache ist
  nicht die Version, sondern das Modulformat: 1.x ist **ESM-only** (kein CommonJS-Build mehr), und
  es landet über zwei Rollup-Plugins von `workbox-build` im Build, die beide CommonJS sind und
  beide selbst `magic-string ^0.30` deklarieren. Ihr `require()` bekommt dadurch ein
  Namespace-Objekt statt der Klasse. Erwähnenswert ist, was der Override dabei tat: npm-`overrides`
  ignorieren die Ranges der Abhängigen, hier wurde also eine Version erzwungen, die **keiner der
  beiden Konsumenten für sich beansprucht**. **Alle 1728 Tests blieben grün** — nur `next build`
  fängt es. Major in `renovate.json` deaktiviert, mit der Wiedervorlage-Bedingung an den Plugins
  statt an magic-string.
- **TypeScript 7**: `tsc --noEmit` und `next build` laufen sauber, aber `typescript-eslint` bricht
  mit „does not support TS 7.0" ab und tötet `npm run lint`. Der Guard ist ein unbedingtes `throw`
  bei Major ≥ 7; es gibt kein `typescript-eslint` v9, und auch die Canary deklariert noch
  `typescript <6.1.0`. Der von Microsoft dokumentierte Side-by-side-Weg über
  `@typescript/typescript6` wurde probiert und funktioniert hier nicht: die acht betroffenen Pakete
  deklarieren `typescript` als *Peer*, npm-`overrides` erzeugen dafür keine verschachtelte
  Installation, und `require("typescript")` landet weiter auf TS 7. Verfolgt in
  `typescript-eslint` Issue #10940 (Support für TS >= 7.1).


## [0.6.0] - 2026-08-21

Härtungs-Release. Kein neues Feature — die Vereinfachungs-Phase hatte vorne poliert, während das
Fundament bröckelte: 19 aufgestaute Dependabot-PRs und 75 Security-Alerts. Dieses Release schließt
den Rest davon und stellt sicher, dass es nicht wiederkommt.

Zwei Dinge sind dabei erwähnenswert, weil sie die Arbeit ehrlicher beschreiben als eine Feature-Liste.
Erstens: **die Hälfte der hier behobenen Befunde stand nicht auf der Liste.** Rate-Limiting,
nodemailer, Renovate und die Passkey-Navigation waren geplant; die drei Mutation-Routen ohne
Readonly-Gate, der Calendar-Feed-Endpunkt, dessen Dokumentation seit jeher etwas anderes behauptete
als sein Code tat, und zwei ungeschützte Handler, die eine Datei-basierte Zählung verdeckt hatte,
kamen erst durch die Reviews der geplanten Arbeit ans Licht. Zweitens: **drei Defekte waren derselbe
Fehlertyp** — ein Dokument, das eine Sicherheitseigenschaft behauptet, die der Code nicht hat, und
das dadurch die nächste Prüfung abhält. Deshalb enthält dieses Release neben Code auch Korrekturen
an Kommentaren, JSDoc und Spec.

Minor statt Patch: Rate-Limiting führt auf 15 Routen ein 429 ein, der Calendar-Feed weist API-Keys
jetzt mit 403 ab. Das sind Änderungen am öffentlichen Vertrag.

**Breaking:** `POST` und `DELETE` auf `/api/settings/calendar-feed` akzeptieren keine API-Keys mehr.
Feed-Tokens lassen sich nur noch aus einer 2FA-verifizierten Browser-Session verwalten — was der
Docstring der Route schon immer behauptet hat. `GET` bleibt unverändert.

### Changed

- **Dependency-Konsolidierung: 19 offene Dependabot-PRs abgearbeitet** — Sieben PRs (GitHub Actions + `alexa-skill`) wurden einzeln gemergt; die zwölf konkurrierenden `package-lock.json`-PRs sind hier zu einem verifizierten Commit zusammengefasst, weil jeder Einzel-Merge die übrigen elf invalidiert hätte. Enthalten sind u. a. next 16.2.6 → 16.2.12, React 19.2.6 → 19.2.8, next-auth beta.31 → beta.32, sharp 0.34.5 → 0.35.3, swagger-ui-react 5.32.5 → 5.32.14, next-intl 4.11.1 → 4.13.7, pg 8.20 → 8.23, framer-motion 12.38 → 12.43, alle Radix- und FontAwesome-Primitives sowie die Security-Bumps von dompurify, fast-uri, brace-expansion, axios, form-data, js-yaml, immutable und vite.
- **GitHub Actions aktualisiert** — `actions/checkout` 6 → 7, `actions/setup-node` 6 → 7, `actions/cache` 5 → 6, `codecov/codecov-action` 6 → 7.
- **Dependabot durch Renovate ersetzt** — `.github/dependabot.yml` ist weg, `renovate.json` da. Nicht aus Geschmack: Renovate löst drei der vier Stau-Ursachen strukturell statt per einmalig richtig gesetzter Config. `alexa-skill/` hatte gar keinen Eintrag — Renovate findet Package-Files selbst, der Fehler ist damit nicht mehr möglich. Security-Updates umgingen die Gruppierung und erzeugten zwölf konkurrierende `package-lock.json`-PRs — Renovate behandelt Vulnerability-PRs mit denselben `packageRules` und Limits. Majors waren pauschal ignoriert (weshalb der nodemailer-Fix von Hand kommen musste) — Renovate trennt sie in eigene PRs und listet sie zusätzlich im Dependency Dashboard, wo ein hängender Major sichtbar ist statt abwesend. Dazu `lockFileMaintenance`, wofür es bei Dependabot keine Entsprechung gibt. Automerge-Politik: devDependencies mergen Patch und Minor selbst, Runtime-Dependencies nur Patches, Runtime-Minors und alle Majors bleiben Handarbeit. Postgres-Majors sind explizit gesperrt — ein Image-Tag-Sprung macht das Datadir unlesbar und braucht ein geplantes `pg_dump`/Restore. Neu abgedeckt sind außerdem `Dockerfile` und `docker-compose.yml`, die Dependabot hier nie angesehen hat.
- **nodemailer 8.0.7 → 9.0.5** — Räumt vier der fünf offenen Dependabot-Alerts auf einen Schlag ab (der HIGH zur `raw`-Option, die OAuth2-TLS-Validierung, CRLF-Injection in `List-*`-Headern und der `jsonTransport`-Bypass). **Keiner der vier Pfade war in Momo erreichbar**: es gibt genau einen `sendMail`-Aufruf (`lib/notifications.ts:314`), der ausschließlich `from`, `to`, `subject`, `text` und `html` setzt — kein `raw`, keine Attachments, kein `jsonTransport`, kein OAuth2, kein `List-*`-Header. Das hier ist Hygiene und Reputation vor der Verbreitungs-Phase, kein Sicherheits-Notfall. Wichtig war die doppelte Pinnung: `nodemailer` stand als Dependency *und* als `overrides`-Eintrag auf `^8.0.7` — nur eine der beiden zu heben, hätte der Override still zurückgezogen.

### Fixed

- **Read-only API-Keys sind jetzt wirklich read-only** — Fünf Mutation-Routen hatten überhaupt keinen
  Readonly-Check. Drei davon bekommen hier das fehlende `user.readonly`-Gate: `DELETE
  /api/user/api-keys/[id]`, `POST /api/settings/webhooks/[id]/test` und `POST
  /api/onboarding/complete`. Die erste ist die, die zählt: ein Read-only-Key konnte **API-Keys
  widerrufen** — während `POST /api/user/api-keys` auf derselben Ressource korrekt gegated war. Ein
  Credential, dessen ganzer Zweck es ist, gefahrlos weitergegeben werden zu können, konnte damit die
  Credentials um sich herum zerstören. Beim Webhook-Test-Endpunkt konnte ein Read-only-Key den Server
  zu ausgehenden HTTP-Requests veranlassen. Gefunden als Nebenbefund beim Rate-Limiting-Review, nicht
  durch einen Report von außen. Die übrigen zwei — `POST`/`DELETE /api/settings/calendar-feed` —
  hatten dieselbe Lücke, wurden aber anders geschlossen: siehe „Calendar-Feed-Mutationen sind jetzt
  wirklich Session-only" weiter unten, wo Bearer-Aufrufer für diese beiden Routen komplett
  zurückgewiesen werden statt nur auf `.readonly` geprüft.
- **Rate-Limiting auf allen erreichbaren Mutation-Routen — diesmal pro Handler gezählt, nicht pro Datei** — `CLAUDE.md` verlangt „rate limiting on all mutation API routes". Die letzte Zählung maß das auf Datei-Ebene (17 von 57 Dateien ohne Limit, 15 nachgezogen) und meldete danach Vollständigkeit — aber eine Datei mit zwei Exporten gilt in dieser Zählung schon als „gedeckt", sobald *einer* davon `checkRateLimit` aufruft. Die ehrliche Einheit ist der Handler, nicht die Datei: 70 Mutation-Handler über 57 Dateien, und zwei davon blieben ungeschützt, weil ihr Datei-Nachbar bereits ein Limit hatte — `DELETE /api/settings/webhooks/[id]` (Nachbar: `PATCH`) und `DELETE /api/tasks/[id]/snooze` (Nachbar: `POST`). Beide sind jetzt nachgezogen, jeweils im selben Bucket wie ihr Geschwister-Handler (Update/Delete bzw. Snooze/Unsnooze sind dieselbe Ressourcen-Operation aus zwei Richtungen — ein eigener Bucket hätte einem Aufrufer erlaubt, durch Abwechseln beider Endpunkte die doppelte Rate zu erreichen). Der Invariant-Test in `__tests__/api-rate-limits.test.ts` splittet jede Route-Datei jetzt an ihren `export async function`-Grenzen und prüft jeden Handler gegen seine eigene Textregion statt gegen die ganze Datei — ein gedeckter Nachbar kann einen ungeschützten Export darin nicht mehr verstecken. Ein zweiter Invariant-Test prüft nach demselben Muster, dass jeder über `resolveApiUser` authentifizierte Mutation-Handler auch `user.readonly` abfragt.
- **`/api/cron` und `/api/admin/seed` bleiben bewusst ohne Limit** — beide Ausnahmen sind jetzt im Quellcode begründet, damit die nächste Prüfung sie nicht erneut als Befund meldet: bei `/api/cron` gibt es keine User-Identität zum Keyen und der `CRON_SECRET`-Check weist alles andere vorher ab, bei `/api/admin/seed` greift außerhalb `NODE_ENV=development` schon vor Auth und DB ein 403.
- **OpenAPI: 429 bei zehn Operationen nachgetragen** — die Spec dokumentierte `TooManyRequests` bereits für elf Operationen, deren Code gar kein Limit hatte. Jetzt stimmen Spec und Code überein — `DELETE /api/tasks/{id}/snooze` eingeschlossen, dessen 429-Dokumentation bis zum obigen Handler-Fix ebenfalls ein Versprechen ohne Code war. Sieben weitere Operationen hatten von Anfang an gar keinen Spec-Eintrag und bekommen ihn hier zusammen mit dem Rate-Limit-Code neu. Drei zusätzliche kamen mit dem Handler-Fix dazu: `PATCH /api/settings/timezone`, `PATCH /api/settings/vacation-mode` und `GET /api/user/export` bekommen ihr fehlendes 429 — bei den ersten beiden hing dort bereits ein `$ref` auf eine nie existierende `RateLimited`-Komponente statt auf `TooManyRequests`, ein zweiter, unabhängiger Grund, warum das 429 dort nie ankam, und einer, den nichts im Projekt automatisch erkannt hätte, weil kein Test die Spec importiert. Außerdem bekommt `POST /api/onboarding/complete` sein fehlendes 403 (read-only-Key) nachgetragen.
- **`readonlyKeyResponse()` liefert jetzt `code: "READONLY_KEY"`** — bisher nur `{ error, message }`, während die Nachbar-Helfer `RATE_LIMITED` bzw. `BEARER_SESSION_REQUIRED` immer schon einen `code` mitgaben. Ausgerechnet die Antwort auf „read-only Key darf nicht schreiben" — das Flaggschiff-Fix dieses Releases — war damit die eine 403, die ein Client nicht programmatisch erkennen konnte. Elf Handler in acht Dateien (`push/devices/[id]` ×2, `push/subscribe` ×3, `settings/login-notification`, `settings/quest`, `settings/timezone`, `user/profile`, `auth/sessions/[id]`, `auth/sessions/revoke-others`), die den Helper bisher umgingen und stattdessen von Hand einen 403-Body in drei verschiedenen Formen bauten, rufen jetzt einheitlich `readonlyKeyResponse()`.
- **Passkey-Login navigiert clientseitig statt per Full Reload** — `eslint-config-next` 16.3.1 brachte die Regel `@next/next/no-location-assign-relative-destination` mit und markierte zwei vorbestehende `window.location.href`-Navigationen in `passkey-login-button.tsx` und `passkey-second-factor-button.tsx`. Der Full Reload war dort allerdings Absicht: das `fetch` davor setzt ein neues Session-Cookie, und `/dashboard` wird serverseitig daraus gerendert. Ein blankes `router.push()` hätte aus dem Router-Cache bedient werden können — also ein Dashboard mit der Session *vor* dem Login, was den Nutzer direkt zurück auf die Login-Seite wirft. Der Fix ist deshalb `router.refresh()` vor `router.push()`: der Cache wird invalidiert, die Absicht bleibt. Nebenbei entfernt: ein `<span hidden>{router ? "" : ""}</span>`, das nur existierte, um eine Lint-Warnung über den ungenutzten `router` stumm zu schalten.
- **Flaky Webhook-Delivery-Test entschärft** — Der Test „aborts fetch via AbortController when delivery takes longer than timeout" hat gegen den absichtlich nicht `await`-eten `db.insert` in `lib/webhooks.ts` gerannt: lokal verlor er das Rennen zuverlässig, in CI gewann er es meistens. Der Test wartet den Insert jetzt mit einem 2-s-Polling ab, statt ihn zu erwischen. Produktionscode unverändert — fire-and-forget beim Delivery-Log ist gewollt, damit ein langsames Log keine Webhook-Auslieferung aufhält.
- **`npm audit`-Fläche reduziert** — Die transitiven Security-Advisories (dompurify, brace-expansion, form-data, axios, js-yaml, fast-uri, vite) sind durch den konsolidierten Lockfile-Sweep geschlossen.
- **Calendar-Feed-Mutationen sind jetzt wirklich Session-only** — Der Docstring von `POST`/`DELETE /api/settings/calendar-feed` behauptete schon immer, Bearer-/API-Key-Aufrufer würden abgelehnt; tatsächlich nutzte die Route `resolveVerifiedApiUser`, das Bearer-Tokens explizit von der 2FA-Prüfung befreit statt sie abzulehnen. Damit konnte jeder API-Key des jeweiligen Kontos — auch ein read-only-Key, da diese Route gar keine `readonly`-Prüfung hatte — das iCal-Feed-Token rotieren oder widerrufen und so an lesenden Zugriff auf alle Task-Metadaten kommen, ohne die 2FA-Hürde zu nehmen, die für die gleichwertig sensible API-Key-Erstellung gilt. Neuer Resolver `resolveSessionOnlyApiUser` in `lib/api-auth.ts` weist Bearer-Aufrufer jetzt vor jedem Key-Lookup explizit mit 403 `BEARER_SESSION_REQUIRED` zurück (`GET` bleibt unverändert Bearer-fähig, da es nie das Token zurückgibt). **Breaking Change für jedes Skript, das diese Mutationen bisher per API-Key ausgelöst hat** — das war laut eigener Dokumentation nie vorgesehen und schließt eine reale Rechte-Lücke.
- **Deterministisch rot laufender `updateQuestStreak`-Test korrigiert** — „increments the streak when last date was yesterday" (`__tests__/gamification-extras.test.ts`) leitete „gestern" aus dem UTC-Datum ab, während `updateQuestStreak` „heute" aus `getLocalDateString(TZ)` in Europe/Berlin bestimmt. Zwischen 00:00 und 02:00 Berliner Zeit liegt das UTC-Datum noch auf dem Vortag, wodurch der Test in Wahrheit ein Datum zwei Tage zurück statt eines Tages zurück einsetzte — `updateQuestStreak` wertete das korrekt als „mehr als einen Tag her" und setzte den Streak auf 1 zurück, während der Test 4 erwartete. Kein Flake, sondern ein deterministisches Zwei-Stunden-Fenster pro Nacht (22:00–24:00 UTC in CI). Der Fix leitet „gestern" jetzt wie alle Nachbar-Tests aus `getLocalDateString(TZ)` plus UTC-Arithmetik auf den Datumskomponenten ab, statt aus der Systemzeit direkt. Produktionscode (`lib/gamification.ts`, `lib/date-utils.ts`) unverändert — der war korrekt.

## [0.5.0] - 2026-05-10

### Added

- **Onboarding: Abschluss-Moment** — Nach dem Notifications-Schritt erscheint ein fünfter „Complete"-Step mit doppeltem Konfetti-Burst, animiertem Amber-Glow-Kreis, Lora-italic-Begrüßung und einer 3-s-Fortschrittsbar die automatisch zum Dashboard weiterleitet. Alle 4 Fortschritts-Punkte wechseln auf grün. Der API-Call läuft parallel zur Transition (non-blocking).
- **Wishlist: Coin-Progress-Ring** — Jede Wunschlisten-Karte mit `coinUnlockThreshold` zeigt jetzt einen 52px SVG-Kreis-Ring (gold = gesperrt, grün = entsperrbar) plus einen goldenen linearen Fortschrittsbalken mit „X Coins noch" / „Entsperrbar!" — aspirational statt blockierend.
- **Wishlist-Karten visuell aufgewertet** — Größeres Padding (`p-5`), Titel auf 0.9375rem, Preis auf 1.625rem, `card-hover` auf Desktop. FA-Icon-Buttons (`faPen`/`faXmark`) ersetzen Unicode-Glyphen. Erledigt-Sektion splittet in Gekauft-Galerie (grüner linker Rand) + Abgelegt-Sub-Sektion mit Eyebrow-Label.
- **Skeleton Loading States** — `loading.tsx` für Dashboard, Aufgaben, Themen und Wunschliste. Verwendet `animate-pulse` mit `var(--bg-elevated)`-Platzhaltern; keine Cumulative Layout Shifts beim ersten Render auf langsamen Verbindungen.
- **Focus Mode als Tempel** — `TempleHalos`-Komponente mit zwei überlagerten Radial-Gradienten (Amber 12/20% Zentrum, Forest Green 6/10% unten). `intense=true` bei Work- und Done-Phase. Task-Card bekommt Amber-22%-Rand + äußeren Glow-Ring. SelectionPhase mit `scale(0.98)→1`-Entry + Amber-Eyebrow-Label über dem Lora-Heading.

### Changed

- **Typografie: Lora italic in Human-Moments** — `fontStyle: "italic"` auf Lora-Display-Headings überall wo Momo „spricht": Task-Empty-State (zeitbasiert: Guten Morgen!/Perfekt!), Wunschliste-Empty, Themen-Empty, 5-Min-„Alles erledigt" und „Keine 5-Min-Aufgaben". Strukturelle Headings (Settings, Navigation) bleiben nicht-kursiv.
- **Unicode-Glyphen durch FontAwesome ersetzt** — `✎` → `faPen`, `✕` → `faXmark`, `▶` → `faChevronRight` in `topic-card.tsx`, `topic-detail-actions.tsx`, `topics-grid.tsx`, `wishlist-view.tsx`. Verbessert Accessibility (Screenreader) und konsistentes Icon-Rendering.

- **Russisch und Chinesisch (vereinfacht) als neue UI-Sprachen** — Momo spricht jetzt 7 Sprachen. Alle 1030 Übersetzungsschlüssel sind in `ru.json` und `zh.json` gepflegt (kyrillisch für RU, 简体中文 für ZH). E-Mail-Templates unterstützen die neuen Locales, Language-Switcher zeigt 🇷🇺 Русский und 🇨🇳 中文. Russische Pluralformen (one/few/many/other) korrekt umgesetzt; Chinesisch nutzt erwartungsgemäß nur `other`. Initial AI-assistierte Übersetzungen — Native-Speaker-PRs willkommen.
- **Admin-Panel: Top 10 zeigt auch Nutzer ohne Abschlüsse** — Die Top-10-Tabelle benutzt jetzt `LEFT JOIN` statt `INNER JOIN`. Sortierung weiterhin nach Completions absteigend, bei Gleichstand nach Coins. Frische Accounts erscheinen jetzt mit `0` statt komplett ausgeblendet zu werden.
- **Radix UI Primitives für Accessibility** — Fünf Radix-Primitives integriert, ohne Momos Design-System anzutasten. Alle Wrapper liegen unter `components/ui/` und nutzen ausschließlich die bestehenden CSS-Variablen (kein neues Design-Token-System):
  - **Dialog** (`@radix-ui/react-dialog`) — alle 5 Modals (TaskBreakdownModal, WishlistForm, TopicForm, TemplatePicker, QuickAddModal). Bringt Focus-Trap, Body-Scroll-Lock, Esc-Handling und korrekte ARIA-Semantik out of the box.
  - **DropdownMenu** (`@radix-ui/react-dropdown-menu`) — UserMenu (Avatar-Menü), BulkActionBar (Topic- + Priority-Picker), Task-Snooze-Menü. Pfeiltasten-Navigation und Type-Ahead inklusive.
  - **Popover** (`@radix-ui/react-popover`) — IconPicker (vorher gar keine Keyboard-Nav).
  - **Tooltip** (`@radix-ui/react-tooltip`) — ersetzt native `title=`-Attribute auf Icon-Buttons (TopicCard, TopicDetailActions, TopicsGrid, ThemeToggle). Erscheint jetzt auch bei Tab-Fokus und ist im Dark-Mode korrekt gestyled. TooltipProvider mit 300ms Delay einmalig im Root-Layout.
  - **ToggleGroup** (`@radix-ui/react-toggle-group`) — Segmentierte Controls (LanguageSwitcher, QuestSettings Postpone-Limit, TopicForm Energy-Picker). Roving-Tabindex (eine Tab-Stelle pro Group statt N), Pfeiltasten-Navigation, automatische `aria-checked`-Semantik.

### Changed

- **TaskForm radikal vereinfacht (Progressive Disclosure)** — Statt 13 Felder gleichzeitig zeigt das Formular jetzt nur noch die Essentials (Titel groß, Thema, Priorität-Chips, Datum). „Wiederkehrend machen" und „Mehr Optionen" liegen hinter Disclosure-Toggles und klappen mit Framer-Motion-Animation aus. Edit-Modus expandiert beide Sektionen automatisch wenn die Aufgabe schon Werte enthält. Die Type-Auswahl ist verschwunden — sie wird jetzt durch den Recurring-Toggle gesteuert. Alle Chip-Gruppen (Priorität, Energy, Zeit, Wochentage, Recurrence-Type) nutzen Radix ToggleGroup für Pfeiltasten-Navigation.
- **Atmosphärische Backgrounds** — Body bekommt zwei dezente Radial-Halos (gedämpftes Grün oben, warmes Amber unten-rechts, je 6–8% Opazität, fixed-attached). Liest sich als Atmosphäre, nicht als Dekoration.
- **Card-Hover-Lift** — Neue `.card-hover` Utility (translateY(-2px) + shadow-md, 180ms ease-out, deaktiviert bei prefers-reduced-motion). Auf TopicCard angewendet.
- **Empty States mit Persönlichkeit** — `/tasks`, `/wishlist`, `/topics` haben jetzt großzügigere Empty-States: 6xl Emoji, Lora-Display-Headline, max-width Sub-Text, weicher Halo-Glow im Akzent. Tasks-Empty zeigt zusätzlich den `N`-Keyboard-Hint.
- **Gestaffelte TopicsGrid-Animation** — Jede Topic-Karte fadet/sliced auf bei Mount mit 40ms Staffelung. Cap bei 12 Karten damit lange Listen nicht zäh wirken.
- **Focus-Indikator mit Glow-Halo** — `:focus-visible` bekommt zusätzlich zur Outline einen weichen 6px Box-Shadow-Halo (22% Amber). Smoother 120ms-Übergang. Deaktiviert bei `prefers-reduced-motion`.
- **DailyQuestCard mit mehr Hero-Präsenz** — Eyebrow-Label „Heutige Quest" über dem Topic-Tag (Small Caps, Amber, 0.18em Tracking). Task-Titel von `text-xl` auf `text-2xl`/`text-3xl` (sm+) — die Daily Quest soll wie eine Headline lesen, nicht wie ein Listeneintrag.
- **WishlistForm vereinfacht (Progressive Disclosure)** — Nur noch Titel sichtbar. Preis, Priorität, URL, Coin-Sperre liegen hinter „Mehr Optionen". Priorität ist jetzt ein Chip-Toggle-Group statt Dropdown. Edit-Modus expandiert automatisch wenn Werte gesetzt sind.
- **TopicForm vereinfacht (Progressive Disclosure)** — Sichtbar: Titel + Icon + Farbe (visuelle Identität). Hinter „Mehr Optionen": Priorität, Default-Energy, Sequenziell, Beschreibung.
- **Sequentielle Task-Gruppen mit visuellem Stepper** — Statt nur opaker Locked-Tasks gibt es jetzt eine linke Stepper-Schiene (Amber-Linie) mit nummerierten Index-Badges. Aktive Stufe ist Amber-gefüllt, gesperrte Stufen tragen ein Lock-Icon. Header bekommt einen „SCHRITT FÜR SCHRITT"-Eyebrow + Schritt-Zähler.
- **Onboarding-Polish** — Welcome-Concept-Cards mit `.card-hover`-Lift, Title-Inputs in Onboarding-Schritten auf 17px JetBrains Mono vergrößert (matching Forms), Submit-Button im Topic-Step nutzt `Wird angelegt …` statt `...`-Platzhalter.
- **Settings-Pages: einheitliche `SettingsSection`-Komponente** — Wiederholtes Card-Wrapper-Markup (4 settings-Pages × bis zu 5 Sektionen) durch eine zentrale `<SettingsSection title= hint= eyebrow=>`-Komponente ersetzt. Headlines jetzt in Lora Display 18px statt DM Sans 16px — wirkt stärker als Page-Hierarchie.
- **Dark Mode entsättigt** — Neue Palette „Wald nach dem Regen": Backgrounds um ~30% entsättigt, Borders und text-muted gehen Richtung warmes Steingrau. Forest-Identität bleibt durch subtile Grün-Note erhalten, aber die Akzente (Amber/Grün/Rot) leuchten jetzt richtig statt mit der Wand zu konkurrieren. Light Mode unangetastet.
- **Sequentielle Task-Gruppen mit Stepper-Visual** — Statt nur opaker Locked-Tasks: linke Amber-Schiene mit nummerierten Index-Badges (aktive Stufe Amber-gefüllt, gesperrte mit Lock-Icon), Eyebrow-Header „SCHRITT FÜR SCHRITT" + „Schritt N von M"-Zähler.
- **Onboarding-Wizard polished** — Welcome-Concept-Cards mit `.card-hover`, größere Title-Inputs (17px JetBrains Mono) in Topic- und Tasks-Steps, echte Loading-Labels statt „...".
- **API-Keys-Page neuer Look** — Karten auf rounded-2xl, Empty-State im Halo-Pattern wie /tasks /wishlist /topics, Form-Header in Lora Display 18px.
- **Polish-Runde 3: Detail-Seiten** — Topic-Detail-Empty-State im einheitlichen Halo-Pattern (Halo-Farbe nimmt Topic-Akzent auf), Stats-Page-Karten alle auf `rounded-2xl`, Top-4-Metric-Karten in Stats und Dashboard mit `.card-hover`.
- **Progress-Page polished** — Habits/Achievements/Review-Tabs auf gleichem Visual-Standard wie Stats/Dashboard. 9 Karten auf `rounded-2xl`, 5 Stat-Tiles und Topic-Activity-Rows mit `.card-hover`. Habits-Empty-State im Halo-Pattern.

### Fixed

- **Mobile: Tap-Targets, Content-Padding, Navbar-Gap** — Main-Content hat jetzt `pb-24` damit der letzte Task nicht hinter der MobileNav verschwindet. Mobile-Padding auf `px-4` (statt `px-6`) für mehr Atemraum. Dialog-Close-Button, TopicDetailActions-Buttons (✎/✕) und BulkActionBar-Close auf 44px-Tap-Target erweitert. Navbar-Gap auf Mobile von `gap-3` auf `gap-1.5` reduziert um Overflow auf 320–375px-Geräten zu vermeiden.
- **A11y-Hygiene auf Toggle-Buttons** — Button-basierte Toggles, die vorher als generische Buttons angekündigt wurden, haben jetzt korrekte Switch- bzw. Radio-Semantik. EmotionalClosure-Settings sind jetzt eine `radiogroup` mit `role=radio`/`aria-checked`, der Push-Device Bell/Bell-Slash-Toggle hat `role=switch`/`aria-checked`. Screenreader sagen jetzt „Schalter, ein/aus" statt „Schaltfläche".

### Fixed

- *(keine in dieser Periode)*

---

## [0.4.0] - 2026-04-29

### Added

- **Dashboard: Empty State für neue Nutzer** — Nach dem Onboarding landen neue Nutzer (keine Topics, keine Completions) nicht mehr auf einer leeren Seite. Ein 🌱-Card erklärt den nächsten Schritt und verlinkt direkt auf `/topics`.
- **Dashboard: Best-Day Insight** — Ab 10 abgeschlossenen Aufgaben erscheint ein Amber-Chip mit dem stärksten Wochentag des Nutzers, berechnet aus der tatsächlichen Completion-Historie (`GROUP BY ISODOW`). Macht bestehende Daten ohne neue Seite nützlicher.
- **E-Mail-Templates mehrsprachig** — E-Mail-Benachrichtigungen (CTA-Button, Footer, Settings-Link) werden jetzt in der Sprache des Empfängers gerendert (DE/EN/FR/ES/NL). Die Locale wird in `users.locale` persistiert, wenn die Sprache in den Einstellungen gewechselt wird — kein Request-Kontext zur Laufzeit nötig.
- **Automatische DB-Backups (opt-in)** — Neuer `backup`-Service in `docker-compose.yml` (Docker Compose Profile `backup`). Aktivierung via `BACKUP_ENABLED=true`. Schreibt täglich ein `pg_dump`-Archiv nach `./backups/` als `.sql.gz`, bereinigt Dumps älter als 30 Tage automatisch. Restore-Anleitung steht als Kommentar im Service.
- **Quick Wins direkt abhaken** — Tasks im Quick-Wins-Bereich auf dem Dashboard können jetzt direkt dort als erledigt markiert werden (Kreis-Button links). Konfetti, Münzen, Level-Up und Achievement-Toast wie überall sonst. Task verschwindet mit Framer-Motion-Animation aus der Liste.
- **Task-Gruppen mit sequenziellem Blocking** — Aufgaben innerhalb eines Themas können einer benannten Gruppe zugewiesen werden. Nur die Aufgabe mit dem niedrigsten `sortOrder` in der Gruppe ist aktiv — alle nachfolgenden erscheinen gesperrt (🔒). Gilt im Topic-View, in der Daily-Quest-Auswahl und bei den Quick Wins auf dem Dashboard.
- **Topic-View: Gruppierung nach Thema** — Auf der `/tasks`-Seite kann per Button zwischen Datums-Gruppen und Themen-Gruppen gewechselt werden. Im Themen-Modus erscheinen gesperrte Aufgaben gedimmt mit `pointer-events: none`.
- **Erledigte Aufgaben kollabiert** — Die „Erledigt"-Sektion auf `/tasks` startet eingeklappt (Chevron zum Aufklappen), wie die Snoozed-Sektion. Verhindert, dass die Liste bei vielen Completions unübersichtlich wird.
- **i18n CI-Audit** — `scripts/check-i18n.mjs` prüft alle `useTranslations`/`getTranslations`-Aufrufe gegen alle 5 Sprachdateien. Läuft als eigener Schritt in `.github/workflows/test.yml` vor dem Test-Run. Erkennt fehlende Keys wie `topics.picker_close` und die ntfy-Emoji-Regression automatisch.
- **Test-Suite erweitert: 1 683 Tests** — Neue Integrationstests für `touchSessionMetadata`, Gamification-Achievements, Statistik-Queries, Topic-Archivierung, `retroactivelyGrantAchievements`. Neue E2E-Tests für kritische User Journeys (Task-Lifecycle, Quest-Ansicht, N-Shortcut-Flow, Topic-Detail). `__tests__/email-template.test.ts` deckt jetzt alle 5 Locales ab.
- **Umfassende Test-Suite (1 294 → 1 683)** — WebAuthn/Passkey-Logik, Auth-2FA-Routen, Calendar-Feed, Sessions-Throttling, Webhook-Delivery, Update-Checker, Cron-Dispatcher, Push-Notifications, sämtliche API-Routen und alle Lib-Funktionen.
- **Quick Add Modal (N-Shortcut)** — Neue Aufgaben mit `N` oder `/` global erstellen.
- **Progress-Seite** — Habits, Errungenschaften und Wochenrückblick unter `/progress` mit Tab-Navigation zusammengeführt.
- **ConfirmButton-Komponente** — Ersetzt alle `window.confirm()`-Dialoge durch Inline-Bestätigung.

### Changed

- **Dashboard aufgeräumt** — 5-Min-CTA-Dopplung entfernt (war redundant mit dem interaktiven Quick-Wins-Bereich). Focus-Mode-CTA bleibt als einziger sekundärer CTA.
- **Achievements aus Stats-Seite entfernt** — Achievements leben ausschließlich auf `/progress?tab=achievements`, nicht mehr zusätzlich auf `/stats`. Vermeidet Duplizierung.
- **ntfy-Kanal: JSON-Body statt HTTP-Header** — Behebt `ByteString`-Fehler bei Emoji-Titeln (HTTP-Header sind Latin-1-beschränkt, JSON ist UTF-8). Payload wird jetzt als `{ topic, title, message, click?, tags? }` JSON-Body an den Server-Root gesendet.
- **Topic-Archivierung** — Topics können archiviert werden; ausklappbare „Archiviert"-Sektion am Seitenende.
- **Vorlage-Flow integriert** — Template-Picker direkt im „Neues Thema"-Button.
- **Energie-Heatmap (90 Tage)** — GitHub-Style-Heatmap auf der Stats-Seite.
- **Aufgaben-Gruppen (Task Groups)** — Sequenzielles Blocking via Gruppen-Name und `sortOrder`.
- **Settings: strukturierte Unter-Seiten** — 6 thematische Unter-Seiten mit persistenter Sub-Navigation.
- **CONTRIBUTING.md** — Neue Datei mit Entwicklungs-Setup, Qualitätsgates, Commit-Konvention und Good-First-Issues-Tabelle.

### Fixed

- **Doppelte Aufgaben-Erledigung verhindert** — Race Condition in `TaskItem` mit `isCompletingRef`-Guard behoben.
- **`handleNotToday` las Response-Body zweimal** — Body wird jetzt einmalig vor dem `ok`-Check geparst.
- **Topic-Detail fehlende Task-Felder** — `energyLevel`, `postponeCount`, `taskGroup`, `sortOrder`, `snoozedUntil` im `serializedTasks`-Mapping ergänzt.
- **Aktive Sessions: englische Zeitangaben** — `Intl.RelativeTimeFormat` statt hartkodierten englischen Strings.
- **Errungenschaften-Seite zeigte „0 von 0"** — `scripts/migrate.mjs` seeded jetzt alle Achievement-Definitionen idempotent.
- **`tasks.view_by_topic` als Literal-Text** — Fehlende i18n-Keys wurden nicht committet; CI-Audit verhindert zukünftig solche Regressionen.
- **`topics.picker_close` fehlte in allen 5 Sprachen** — Vom neuen i18n-Audit entdeckt und behoben.

## [0.3.3] - 2026-04-22

### Added

- **SEO: JSON-LD Structured Data** — Zwei Schema.org-Schemas inline auf der Landing Page: `SoftwareApplication` (Name, Beschreibung, 12-Punkte-Feature-Liste, kostenlos, MIT-Lizenz) und `WebSite` mit `SearchAction` (Sitelinks Searchbox). Gibt Google maschinenlesbare Metadaten für Rich Results.
- **SEO: Open Graph & Twitter Card vollständig** — `og:locale: de_DE` mit Alternates `en_US`, `fr_FR`. Twitter Card `summary_large_image`. OG-Image 1200×630 vorhanden und korrekt verlinkt.
- **SEO: Erweiterte Keywords** — 22 Keywords (deutsch primär, englisch sekundär) in `app/layout.tsx`. Zielgruppe: "Prokrastination App", "ADHS Aufgaben", "self-hosted todo", "open source productivity".
- **SEO: Keyword-reiche Hero-Subline** — Hero-Subtext von generischem Text auf `"> Aufgaben-App für Prokrastination & ADHS — kostenlos, open source"` umgestellt. Als `<h2>` gerendert (statt `<p>`) für stärkeres Crawl-Signal.
- **SEO: 6 Feature-Cards** — Landing Page von 3 auf 6 Feature-Cards erweitert (+ Habit Tracker, Fokus-Modus, Self-Hostable), inkl. Übersetzungen in DE/EN/FR/ES/NL.
- **SEO: SEO-Text-Block** — Keyword-reichter Absatz am Seitenende für Long-Tail-Suchbegriffe, in allen 5 Sprachen übersetzt.
- **SEO: Google Search Console** — Domain `momotask.app` aktiviert, Sitemap eingereicht, Indexierung für `https://momotask.app/` beantragt.

### Changed

- **SEO: Sitemap bereinigt** — `/login` aus der Sitemap entfernt. Einziger Eintrag: `/` (Canonical, Priority 1.0, weekly). Verhindert Crawl-Budget-Verschwendung auf einer Seite ohne indexierbaren Inhalt.
- **SEO: Meta Title & Description (DE)** — Title auf Deutsch umgestellt ("Momo – Aufgabenverwaltung für Menschen mit Prokrastination"), Description keyword-reich und auf die Zielgruppe ausgerichtet.
- **Kubernetes Ingress: www → non-www 301 Redirect** — `deploy/examples/ingress.yaml` enthält jetzt eine zweite `Ingress`-Ressource (`momo-www-redirect`), die `www.<domain>` dauerhaft auf die Nicht-www-Canonical-URL umleitet.
- **Nginx: www → non-www 301 Redirect (momotask.app)** — Der produktive nginx-vhost in `wdk-ansible` wurde aufgeteilt: `www.momotask.app` liefert jetzt einen permanenten 301-Redirect auf `https://momotask.app$request_uri`. Behebt den Google-Canonical-Konflikt, der die Indexierung blockiert hat (Google hatte `www.` als Canonical gewählt, obwohl die App `momotask.app` deklariert).
- **Accessibility: `<main>`-Landmark** — Landing Page hat jetzt ein semantisches `<main>`-Element, das alle Content-Sektionen umschließt. Behebt den Lighthouse-Audit "Document does not have a main landmark".
- **Accessibility: Kontrastverhältnisse verbessert** — Vier Farbwerte auf der Landing Page angehoben um WCAG AA zu erfüllen: SEO-Text (`#4a5e4c` → `#7a9a7e`), Footer-Links (`#6b7c6d` → `#8aaa8c`), Footer-Tagline (`#3d4f3e` → `#5a706a`), Zitat-Quellenangabe (`#6b7c6d` → `#8a9e8b`). `user-scalable=no` im Viewport bleibt bewusst gesetzt (PWA-Swipe-Gesten auf iOS erfordern dies).

## [0.3.2] - 2026-04-22

### Security

- **DOMPurify 3.3.3 → 3.4.0** — Behebt eine moderate Sicherheitslücke in der Client-seitigen HTML-Sanitisierung.
- **CI: Explizite Workflow-Permissions** — Der `cleanup-registries`-Job hat jetzt `permissions: {}` statt implizit ererbter Rechte. Behebt CodeQL Code-Scanning-Alerts #1 und #2 (excessive workflow token permissions).

### Changed

- Abhängigkeiten aktualisiert: `tailwindcss`, `@types/node`, `typescript`, `actions/upload-pages-artifact` (4 → 5).

## [0.3.1] - 2026-04-22

### Added

- **Cassiopeia** — Das "Streak Shield" Feature wurde vollständig zu **Cassiopeia** umbenannt (Idee der Schwester). Alle UI-Labels, Onboarding-Texte, Push-Notifications und Übersetzungen (DE/EN/FR/ES/NL) verwenden jetzt den Namen "Cassiopeia" mit dem Emoji ✨. Interne Code- und DB-Namen bleiben unverändert (`streakShieldAvailable`, `streakShieldUsedMonth`).

- **Integrationstests vollständig: 29 → 491 Tests** — Die Test-Suite deckt jetzt die gesamte `lib/`-Schicht ab (28 Test-Dateien). Phase 1–5 abgeschlossen: Daily Quest Lifecycle, Task CRUD/Mutations, Habit Streaks, Vacation Mode, Gamification, TOTP/2FA (inkl. Backup-Code Single-Use-Garantie), DSGVO-Export, Email-Templates, Rate-Limiter, Outbound Webhooks, Notification-Log-Cleanup, reine Timezone-Arithmetik. Laufzeit ~25 Sekunden, vollständige Isolation zwischen Test-Dateien, Fixtures für User/Topic/Task/WishlistItem/ApiKey.

### Fixed

- **Daily Quest: Briefing und App zeigen unterschiedliche Quest** — Das Morning Briefing übergab die User-Timezone korrekt an `selectDailyQuest`, das Dashboard jedoch nicht (UTC-Fallback). Fix: Das Dashboard liest die gespeicherte User-Timezone vor der Quest-Auswahl und übergibt sie an `selectDailyQuest`.

## [0.3.0] - 2026-04-18

### Added

- **Outbound Webhook System** — User-configurable HTTP POST endpoints for automation integrations (Zapier, Make, n8n, custom backends). Four task lifecycle events: `task.created`, `task.completed`, `task.deleted`, `task.updated`. Payload includes full task metadata as a stable JSON envelope. Optional HMAC-SHA256 request signing (`X-Momo-Signature` header). Secrets stored encrypted at rest (AES-256-GCM, reusing `TOTP_ENCRYPTION_KEY`). Up to 10 endpoints per user, per-endpoint event subscriptions (or subscribe to all). Delivery is fire-and-forget with a 5-second timeout. Delivery history (last 50 attempts per endpoint) with HTTP status, duration, and error messages. 30-day log retention via daily cron job. New DB tables: `webhook_endpoints` and `webhook_deliveries` (migration `0031_bumpy_star_brand.sql`). New API routes: `GET/POST /api/settings/webhooks`, `PATCH/DELETE/GET /api/settings/webhooks/:id`, `POST /api/settings/webhooks/:id/test`. New Settings section with full UI. All translation keys added to de/en/fr/es/nl.

- **Automatisierte Integrationstests (Vitest)** — 29 Integrationstests für die drei kritischsten Business-Logic-Funktionen `completeTask`, `selectDailyQuest` und `updateStreak`. Tests laufen gegen eine echte PostgreSQL-Test-Datenbank (`momo_test`) ohne Mocks. Setup: `docker compose up db -d && npm test`. Dokumentation in `docs/testing.md`. Test-Infrastruktur: globaler Setup mit Auto-Migration, per-Test DB-Reset, Fixture-Helpers für User/Topic/Task.

- **i18n: Spanish (es) and Dutch (nl)** — Two new UI languages added. Spanish and Dutch translations cover all 21 namespaces (tasks, topics, habits, achievements, settings, auth, onboarding, …). Language switcher in Settings now shows 🇪🇸 Español and 🇳🇱 Nederlands alongside the existing German, English, and French options.

- **Per-Reminder-Type Notification Times** — Each opt-in reminder now has its own configurable notification time, independent of the global `notificationTime`. New time pickers appear in Settings under each enabled toggle:
  - "Due today" reminder: `dueTodayReminderTime` (default `08:00`)
  - Recurring-due reminder: `recurringDueReminderTime` (default `08:00`)
  - Overdue reminder: `overdueReminderTime` (default `08:00`)
  - Weekly review (Sundays): `weeklyReviewTime` (default `18:00`, previously hardcoded)
  All four fields are accepted by `PATCH /api/push/subscribe`. Migration `0030_broken_xorn.sql` adds the four `time` columns to `users`.

### Fixed

- **Daily Quest: Verschobene Quest wurde sofort wieder ausgewählt** — Beim Klick auf „Nicht heute" wurde die Quest zwar abgewählt, aber nicht als gesperrt markiert. Die Auswahllogik (`pickBestTask`) wählte dieselbe HIGH-Priority-Aufgabe sofort wieder als neue Quest aus, weil Priority-2 keinen Fälligkeits-Filter hat. Fix: `postponeDailyQuest` setzt jetzt zusätzlich `snoozedUntil = morgen`, sodass alle vier Prioritätsstufen die Aufgabe für den Rest des Tages ignorieren. Die Aufgabe erscheint morgen automatisch wieder.

- **Topic-Fortschrittsbalken aktualisiert sich jetzt live** — Der Fortschrittsbalken im Topic-Detail wurde nur beim Seiten-Laden berechnet und zeigte nach dem Erledigen von Aufgaben veraltete Werte bis zum Reload. Balken und Zähler (X/Y) werden jetzt im Client-State gepflegt und aktualisieren sich beim Erledigen oder Rückgängigmachen sofort ohne Neuladen.

- **Build-Fix: `rateLimitResponse` TypeScript-Fehler behoben** — `rateLimitResponse()` in `lib/rate-limit.ts` gab `Response` zurück, obwohl alle 82 API-Routen `NextResponse` erwarten (`TS2739`). Das brach den Docker-Build. Fix: Rückgabetyp auf `NextResponse` geändert, zentral für alle Call-Sites.

- **Vacation Mode: `enabled` → `active` umbenannt** — `PATCH /api/settings/vacation-mode` akzeptiert jetzt `active` statt `enabled` im Request-Body, passend zum `active`-Feld in der GET-Antwort. Frontend-Komponente und Validator aktualisiert.
- **OpenAPI Spec: fehlender `requestBody` bei Postpone** — `POST /api/daily-quest/postpone` erfordert `{ taskId: UUID, timezone?: string }`, was bisher nicht dokumentiert war. API-Konsumenten bekamen 422 ohne Erklärung.
- **OpenAPI Spec: `requestBody` für Task Complete dokumentiert** — `POST /api/tasks/{id}/complete` akzeptiert optionalen `{ timezone?: string }` Body für korrekte Streak-Berechnung, jetzt im Spec erfasst.
- **Streak-Reminder feuerte bei jedem Container-Neustart** — der Idempotenz-Guard war nur in-memory und wurde bei jedem Watchtower-Deployment zurückgesetzt. Außerdem fehlte eine Uhrzeit-Prüfung, weshalb der Reminder beim UTC-Mitternachts-Reset (= 02:00 CEST) und nach jedem Neustart sofort feuerte. Fix: `sendStreakReminders` verwendet jetzt denselben SQL-Zeitfenster-Filter wie alle anderen Notification-Funktionen (`notificationTime` 5-Minuten-Bucket in der User-Zeitzone). Cron-Guard geändert von `daily` (in-memory) auf `5min-bucket` (SQL-gesteuert). Morning-Briefing-User werden jetzt korrekt ausgeschlossen (erhalten Streak-Info bereits im Digest).
- **Push-Benachrichtigungen vollständig auf Deutsch** — Daily-Quest-Fallback, Fällig-heute-Body, Streak-Reminder und Streak-Schutzschild-Meldungen waren teilweise auf Englisch; alle Texte sind jetzt einheitlich auf Deutsch.
- **SSRF-Lücke im Webhook-Kanal geschlossen** — Der Webhook-Validator akzeptierte bisher auch `http://`-URLs (inkl. `http://localhost`, `http://192.168.x.x`), was Server-Side Request Forgery ermöglichte. Validator-Schema (`WebhookConfigSchema`) und Runtime-Check (`WebhookChannel.send()`) erzwingen jetzt HTTPS als einziges erlaubtes Protokoll.
- **422-Fehlerformat vereinheitlicht** — Alle öffentlichen API-Routen liefern bei Validierungsfehlern jetzt konsistent `{ error: "Validation failed", details: { field: [...] } }` statt dem vollständigen Zod-Flatten-Objekt mit `formErrors`-Anteil. API-Clients können damit direkt auf die relevanten Feldnamen zugreifen.
- **IDOR: Task-Topic-Zuweisung ohne Ownership-Check** — `createTask`, `updateTask` und `bulkUpdateTasks (changeTopic)` akzeptierten beliebige `topicId`-Werte ohne Prüfung, ob das Topic dem authentifizierten User gehört. Ein Angreifer konnte eigene Tasks einem fremden Topic zuordnen, was durch den FK `onDelete: set null` zu stiller Datenkorruption führte. Alle drei Stellen prüfen nun Ownership via `eq(topics.userId, userId)`. API-Routen geben korrekt 404 zurück.
- **Privilege Escalation: Read-only API-Keys konnten neue Keys anlegen** — `POST /api/user/api-keys` fehlte der `readonly`-Check. Ein read-only Key konnte sich damit selbst zu einem vollwertigen Key eskalieren. Fix: Readonly-Keys erhalten jetzt 403 auf diesem Endpoint.
- **Rate Limit auf `PATCH /api/settings/quest` ergänzt** — alle anderen Settings-Mutationen waren bereits limitiert (10/min), quest-Settings fehlte. Nun einheitlich.
- **OpenAPI Spec: Response-Schemas korrigiert** — mehrere Endpunkte hatten falsche oder unvollständige Response-Definitionen:
  - `DailyQuest`-Schema: Feld `task` → `quest` (entspricht tatsächlicher API-Antwort)
  - `POST /api/tasks/{id}/complete`: `coinsAwarded`/`newBalance` → `coinsEarned`/`newLevel`/`unlockedAchievements`/`streakCurrent` + fehlender 409-Status dokumentiert
  - `POST /api/daily-quest/postpone`: Spec zeigte fälschlicherweise `DailyQuest`; korrektes Schema `{ ok, postponesToday, postponeLimit }` + fehlende 404/422-Statuscodes ergänzt
  - `POST /api/energy-checkin`: Spec zeigte `DailyQuest`; korrektes Schema `{ quest, swapped, previousQuestId?, previousQuestTitle? }` dokumentiert
  - `POST /api/daily-quest` (Force-Reselect): Endpoint war komplett undokumentiert — nachgetragen

### Added

- **Überfällig-Erinnerung** — neuer opt-in Notification-Typ: täglicher Push/Channel-Reminder für Aufgaben, die ihr Fälligkeitsdatum überschritten haben (bis zu 30 Tage zurück). Sendet eine Einzel-Benachrichtigung bei einer überfälligen Aufgabe oder eine Zusammenfassung bei mehreren. Silent on empty — kein Ping, wenn nichts überfällig ist. Unterdrückt für Morgen-Briefing-Nutzer. Neuer Cron-Job `overdue-reminder`, Toggle in den Notification-Settings, neues DB-Feld `overdue_reminder_enabled` (Migration `0030`). Alle konfigurierten Kanäle (Web Push, ntfy, Pushover, Telegram, E-Mail, Webhook) unterstützt.
- **Webhook-Benachrichtigungskanal** — neuer generischer Outbound-Webhook-Kanal in den Notification-Settings. Sendet einen HTTP-POST mit JSON-Payload (`event`, `title`, `body`, `url`, `tag`, `timestamp`) an eine beliebige URL. Optionale HMAC-SHA256-Signierung via `X-Momo-Signature`-Header. Nützlich für Integrationen mit Home Assistant, n8n, Zapier, Make oder eigenen Servern. Kein Schema-Migration nötig — `config` ist bereits JSONB.
- **GET /api/user** — liefert jetzt Gamification-Stats (`coins`, `level`, `streakCurrent`, `streakShieldAvailable`); bisher war nur DELETE dokumentiert.
- **GET /api/user/profile** — liefert `name`, `email`, `image`; bisher fehlte der lesende Endpunkt.
- **GET /api/settings/quest** — liefert aktuelle Quest-Einstellungen (`postponeLimit`, `emotionalClosureEnabled`); bisher nur PATCH vorhanden.
- **GET + PATCH /api/settings/login-notification** — GET liefert den aktuellen Toggle-Wert; PATCH war bisher vollständig undokumentiert im OpenAPI-Spec.
- **OpenAPI-Spec** — 7 fehlende Endpunkte nachgetragen: `POST /api/tasks/{id}/breakdown`, `POST /api/tasks/{id}/promote-to-topic`, `POST /api/daily-quest/restore`, `POST/PATCH/DELETE /api/push/subscribe`, `POST /api/push/test`, `GET+PATCH /api/settings/login-notification`.

## [0.2.0] - 2026-04-12

### Added

- **Update-Checker** — das Admin-Panel zeigt jetzt einen Banner, wenn eine neuere Momo-Version auf GitHub verfügbar ist. Die Prüfung erfolgt einmal alle 24 Stunden via GitHub Releases API (In-Memory-Cache, kein Redis). Für Air-Gap-Installationen ohne Internet-Zugang kann die Prüfung per `DISABLE_UPDATE_CHECK=true` deaktiviert werden. Neue Env-Var in `.env.example` und `docs/environment-variables.md` dokumentiert.

## [0.1.0] - 2026-04-12

### Added

- **Login-Benachrichtigung bei neuem Gerät** — opt-in Sicherheits-Feature in den Settings: Erhalte eine Benachrichtigung auf allen konfigurierten Kanälen (Web Push, ntfy, Pushover, Telegram, Email), wenn eine Anmeldung von einem bisher unbekannten Gerät erkannt wird. Die Erkennung basiert auf einem SHA-256-Fingerprint aus User-Agent + IP-Adresse; existierende Sessions werden als Vergleichsbasis herangezogen. Beim allerersten Login (keine Vergleichsdaten) wird keine Benachrichtigung ausgelöst. Der Check feuert nur beim ersten authentifizierten Request nach einer neuen Session (First-Touch-Mechanismus in `touchSessionMetadata`) — nie mehr als einmal pro Session. Neuer Toggle im Settings-Bereich „Aktive Sitzungen". Neuer Endpoint `PATCH /api/settings/login-notification` (Rate-Limit 10/min). DB: neue Spalte `users.login_notification_new_device` (boolean, default false, Migration `0029`). i18n in de/en/fr.

- **Erweiterte Wiederholungsregeln** — Recurring Tasks unterstützen jetzt vier Regeltypen: **Intervall** (weiterhin N Tage rollend, bisheriges Verhalten), **Wochentag** (z. B. jeden Montag + Mittwoch), **Monatlich** (jeden Monat am gleichen Tag) und **Jährlich** (jedes Jahr am gleichen Datum). Wochentag-Tasks werden in der Habit-Statistik als Wochenstreaks (statt rollende Tagesperioden) ausgewertet; Monatlich/Jährlich entsprechend als Monats-/Jahresstreaks. Zusätzlicher **Fester Kalendertermin**-Toggle für Monatlich/Jährlich: bei aktiviertem Toggle wird `nextDueDate` immer vom geplanten Fälligkeitsdatum aus vorgerückt (gleicher Tag unabhängig vom Erledigungszeitpunkt); deaktiviert verhält sich der Typ rollend ab Erledigungsdatum. iCal-Export generiert jetzt typgerechte RRULEs (`FREQ=WEEKLY;BYDAY=MO,WE`, `FREQ=MONTHLY;BYMONTHDAY=N`, `FREQ=YEARLY;BYMONTH=M;BYMONTHDAY=D`). DB: neues Enum `recurrence_type` (INTERVAL/WEEKDAY/MONTHLY/YEARLY), neue Spalten `recurrence_weekdays` (JSON-Array) und `recurrence_fixed` (boolean) auf `tasks` (Migration `0027`). i18n in de/en/fr.

- **Achievements & Gamification ausgebaut** — 31 Achievements (vorher 13) mit Rarity-System (Common/Rare/Epic/Legendary), Coin-Belohnungen bei Freischaltung (10/25/50/100 Coins je Tier) und 3 geheimen Achievements (Nachtaktiv 🦉, Frühaufsteher 🐦, Doppelschicht ⚡). Neue dedizierte `/achievements`-Galerie mit Rarity-Sektionen (Legendary zuerst), Fortschrittsbalken für alle zählbaren Achievements, Secret-Masking bis zur Freischaltung und Gesamtübersichts-Balken. Achievement-Coins werden nach dem Task-Abschluss atomar in den Coin-Saldo gebucht. Push-Benachrichtigung bei Freischaltung über alle konfigurierten Kanäle (max. 3 pro Batch). Neue Achievement-Trigger: nach Topic-Erstellung (`first_topic`, `topics_5`, `first_sequential_topic`), Wishlist-Kauf (`first_wishlist_buy`, `wishlist_10_bought`) und Energy-Checkin (`energy_checkin_7`). Neues Quest-Streak-Tracking (`quest_streak_7`, `quest_streak_30`) auf `users`. Neue `getEnergyCheckinStreak()`-Funktion. DB: `rarity`, `coin_reward`, `secret` auf `achievements`; `quest_streak_current`, `quest_streak_last_date` auf `users` (Migration `0026_magical_havok`). Neue CSS-Variable `--rarity-legendary` (Violett). i18n in de/en/fr.

- **Session-Übersicht ("Aktive Geräte")** — neue Sicherheits-Sektion in den Settings: alle aktiven Login-Sessions werden mit Gerät/Browser, Betriebssystem, IP-Adresse, Login-Zeitpunkt und letzter Aktivität angezeigt. Einzelne Sessions können per Klick widerrufen werden (= sofortiger Logout auf dem betreffenden Gerät); „Alle anderen abmelden" entfernt alle Sessions außer der aktuellen in einem Schritt. Die aktuelle Session ist grün markiert und nicht widerrufbar (kein Self-Lockout). Session-Tokens werden nie an den Client exponiert — ein getrunkter SHA-256-Hash dient als öffentlicher Identifier. Geräteinformationen (User-Agent, IP) werden beim Login (Passkey) bzw. beim ersten authentifizierten Request (OAuth, verzögert via 1h-Throttle in `resolveApiUser`) erfasst. Legacy-Sessions ohne Metadaten zeigen „Unbekanntes Gerät". Drei neue API-Endpunkte: `GET /api/auth/sessions` (30/min), `DELETE /api/auth/sessions/:id` (10/min, blockiert aktuelle Session), `POST /api/auth/sessions/revoke-others` (5/min). DB: vier neue Spalten auf `sessions` (`created_at`, `last_active_at`, `user_agent`, `ip_address` — alle nullable, Migration `0026`). Kein neues npm-Paket — User-Agent-Parsing via einfache Regex. i18n in de/en/fr.
- **Recurring Fälligkeits-Benachrichtigung** — dedizierter, opt-in Push-Reminder für wiederkehrende Aufgaben die heute fällig sind. Sendet **individuelle Benachrichtigungen pro Task** (bei ≤3) oder eine gebündelte Zusammenfassung (bei >3) — so bekommt jeder Recurring Task seine eigene Aufmerksamkeit, unabhängig von der Daily Quest und dem allgemeinen „Fällig heute"-Reminder. Eigener Cron-Job `recurring-due` (5-Min-Bucket), unterdrückt bei aktiviertem Morgen-Briefing. Neuer Toggle in den Settings unter Web Push / Channels. DB: `recurring_due_reminder_enabled` auf `users` (Migration `0025`). i18n in de/en/fr.
- **Zeitzone in den Settings** — User kann seine IANA-Zeitzone jetzt explizit in den Einstellungen setzen statt sich auf die implizite Browser-Erkennung zu verlassen. Neue Settings-Sektion „Zeitzone" (nach Sprache) mit gruppiertem Dropdown aller IANA-Zeitzonen, automatischer Browser-Erkennung und „Browser-Zeitzone verwenden"-Button zum Zurücksetzen. Auto-Save bei Änderung. Relevant für User, die per VPN unterwegs sind oder auf Reisen — alle server-seitigen Cron-Jobs (Morning Briefing, Due-Today, Daily Quest, Weekly Review) verwenden `COALESCE(users.timezone, 'UTC')` und profitieren sofort. Neuer Endpoint `GET/PATCH /api/settings/timezone` (10/min Rate-Limit, IANA-Validierung via `Intl.DateTimeFormat`). Keine DB-Migration nötig — die Spalte `users.timezone` existiert seit Migration `0006`. i18n in de/en/fr.
- **Urlaubsmodus (Vacation Mode)** — pausiert alle wiederkehrenden Aufgaben für einen festgelegten Zeitraum. Verhindert, dass Urlaub oder Krankheit den Habit-Streak zerstört oder die Statistik verzerrt. In den Settings unter „Urlaubsmodus" aktivieren mit Enddatum — alle RECURRING Tasks erhalten `pausedAt`/`pausedUntil` und sind von Daily Quest, Fällig-heute-Benachrichtigungen und iCal-Feed ausgeblendet. Der Streak-Algorithmus (`computeHabitStreak`) überspringt pausierte Perioden. Beim Deaktivieren (manuell oder automatisch via täglichem Cron-Job `vacation-mode-auto-end`) wird `nextDueDate` pro Task um die tatsächliche Pausendauer verschoben. Vorzeitiges Beenden verschiebt nur um die tatsächlich pausierten Tage. Neuer Endpoint `GET/PATCH /api/settings/vacation-mode` (10/min Rate-Limit). Guard in `completeTask()` verhindert Abschluss pausierter Tasks. Habit-Card zeigt `faPause`-Badge mit Enddatum. DB: `paused_at` + `paused_until` auf `tasks`, `vacation_end_date` auf `users` (Migration `0024`). i18n in de/en/fr.
- **Morgen-Briefing (Daily Digest)** — opt-in tägliche Zusammenfassung statt einzelner Push-Nachrichten: Quest des Tages, fällige Tasks, aktueller Streak und neu freigeschaltete Achievements — alles in einer kompakten Nachricht. Eigene Briefing-Uhrzeit (Default: 08:00), unabhängig von der regulären Benachrichtigungszeit. Ersetzt bei aktivierten Usern die einzelnen Quest- und Fällig-heute-Erinnerungen automatisch. Settings-Toggle sichtbar sobald ein Kanal konfiguriert ist. Immer-senden-Prinzip: auch an ruhigen Tagen kommt eine motivierende Nachricht. Neuer Cron-Job `morning-briefing` (5-Min-Bucket). DB: `morning_briefing_enabled` + `morning_briefing_time` auf `users` (Migration `0023`). i18n in de/en/fr.
- **Benachrichtigungshistorie** — neue Settings-Sektion zeigt die letzten 50 gesendeten Benachrichtigungen mit Zeitstempel, Kanal (Web Push / ntfy / Pushover / Telegram / Email), Titel und Zustellstatus (Gesendet / Fehlgeschlagen). Bei fehlgeschlagenen Einträgen ist die Fehlermeldung per Klick aufklappbar. Primärnutzen: Debugging wenn Notifications nicht ankommen. Jeder individuelle Kanalversuch wird als eigene Zeile in die neue `notification_log`-Tabelle geschrieben (fire-and-forget — Logging blockiert niemals die Zustellung). Einträge älter als 30 Tage werden automatisch vom neuen `notification-log-cleanup` Cron-Job gelöscht. Neuer Endpoint `GET /api/settings/notification-history` (Auth: Session oder API Key). DB: neue Tabelle `notification_log` (Migration `0022`). GDPR-Export um Notification-Log erweitert. i18n in de/en/fr.
- **Onboarding-Flow für neue Nutzer** — geführter 4-Schritt-Wizard nach erster Anmeldung: (1) Konzepte kennenlernen (Tagesquest, Energie, Münzen, Streaks als animierte Karten), (2) erstes Topic anlegen (Inline-Formular mit Icon-Picker + Farbwahl), (3) erste Aufgaben hinzufügen (Quick-Add mit Enter-Shortcut), (4) Push-Benachrichtigungen aktivieren + Timezone-Erkennung. Jeder Schritt überspringbar, Wizard einmalig pro User. Gate in `app/(app)/layout.tsx` leitet neue User automatisch auf `/onboarding` um — eigenes Layout außerhalb der `(app)`-Routengruppe (analog `/setup/2fa`), kein Sidebar/Navbar. Bestehende User per Backfill-Migration (`UPDATE users SET onboarding_completed = true`) nicht betroffen. Framer-Motion-Step-Transitions (Slide + Spring), 4-Dot-Fortschrittsanzeige, staggered Concept-Card-Entrance. DB: neue Spalte `users.onboarding_completed` (boolean, default false, Migration `0021`). Neuer Endpoint `POST /api/onboarding/complete` (Rate-Limit 10/min). Business-Logic in `lib/onboarding.ts`. Komponenten unter `components/onboarding/` (Wizard-Shell, Progress, 4 Step-Komponenten). i18n-Keys `onboarding.*` in de/en/fr.
- **Bulk-Aktionen auf Tasks** — Mehrfachauswahl per Checkbox auf der Aufgabenliste. Aktionsleiste am unteren Bildschirmrand erscheint sobald ≥1 Task ausgewählt: Löschen, Topic wechseln, Priorität setzen, alle erledigen. Neuer `PATCH /api/tasks/bulk`-Endpoint mit Zod-validierter discriminated union. Bulk-Complete überspringt Gamification (Coins, Streak, Achievements) bewusst — das Feature ist ein Cleanup/Triage-Tool. Wiederkehrende Tasks werden beim Bulk-Erledigen ignoriert. Max 100 Tasks pro Aktion, Rate-Limit 10/min.

### Fixed

- **Migration 0025 fehlte im Journal** — `drizzle/meta/_journal.json` enthielt keinen Eintrag für `0025_recurring_due_reminder` (SQL-Datei existierte, Journal sprang von idx 24 direkt zu idx 25 mit dem Tag `0026_active_sessions`). Drizzle's `migrate()` liest ausschließlich das Journal — die Migration wurde daher nie angewendet, die Spalte `users.recurring_due_reminder_enabled` fehlte in der DB und verhinderte jede Anmeldung (`42703 errorMissingColumn`). Fix: Journal-Eintrag für idx 25 nachgetragen, folgende Einträge auf idx 26–28 verschoben.

- **Migration-Runner: Frühzeitiger Break bei pending Migration behoben** — `scripts/migrate.mjs` unterbrach die Reconciliation-Schleife beim ersten genuinen pending-Migration-Eintrag und überprüfte nachfolgende Migrationen nicht mehr. War eine spätere Migration bereits in der DB vorhanden (z. B. durch einen manuellen `ALTER TABLE` oder einen partiellen früheren Lauf), wurde sie nicht als „applied" geseedet, und `migrate()` versuchte sie erneut anzuwenden — das schlug mit „column already exists" fehl und verhinderte den Container-Start in einer Crash-Loop. Fix: Die Schleife läuft nun vollständig durch; `!tracked && appliedInDb`-Einträge werden auch nach einer pending Migration korrekt geseedet.

- **Migration-Runner: Out-of-order Migrationen werden jetzt direkt angewendet** — Drizzle's `migrate()` verwendet intern einen Timestamp-Watermark: Es werden nur Migrationen angewendet, deren `folderMillis` **größer** als der `MAX(created_at)`-Wert in der Tracking-Tabelle ist. Migrationen, die nachträglich in die Mitte einer bestehenden Sequenz eingefügt werden (z. B. ein fehlender Journal-Eintrag der später ergänzt wird), werden von `migrate()` **still ignoriert**, weil ihr Timestamp unterhalb des Watermarks liegt. `scripts/migrate.mjs` hat sich bisher auf `migrate()` verlassen, was diese Migrationen dauerhaft auslässt — Ergebnis: fehlende Spalten trotz „All migrations applied successfully". Fix: Vor der Reconciliation-Schleife wird der aktuelle Watermark (`MAX(created_at)`) eingelesen. Einträge mit `!tracked && !appliedInDb && entry.when ≤ watermark` gelten als Out-of-order und werden direkt über den Pool-Client mit Statement-by-Statement-Ausführung angewendet; „already exists"-Fehler (42701, 42P07, 42P06, 42710) werden toleriert um idempotente Wiederholbarkeit zu gewährleisten. Anschließend wird der Eintrag geseedet. Nur in-order Migrationen (`entry.when > watermark`) werden weiterhin `migrate()` überlassen.

- **Login-Seite: Fehlermeldung bei Auth.js-Fehlern** — bei einem Fehler (z. B. `SessionTokenError`, `AccessDenied`) leitete Auth.js zur Login-Seite mit `?error=`-Parameter weiter, ohne dass der User eine Rückmeldung erhielt. Die Login-Seite zeigt jetzt einen roten Fehler-Banner mit einer lokalisierten Meldung (`de`/`en`/`fr`). Bekannte Fehlercodes: `SessionTokenError` → „Sitzung konnte nicht geladen werden", `AccessDenied`, `Configuration`, Fallback für alle anderen.

- **Impressum und Datenschutzerklärung nicht länger indexierbar oder archivierbar** — beide Seiten tragen den Klarnamen und die Postadresse des Betreibers; aus Datenschutzgründen dürfen sie weder bei Google erscheinen noch im Internet Archive (archive.org / Wayback Machine) gespiegelt werden. Vorher waren sie explizit via `robots: { index: true, follow: true }` indexiert und sowohl in der `sitemap.xml` als auch im `allow`-Block von `robots.txt` gelistet. Fix: Beide Page-Komponenten in `app/(legal)/*/page.tsx` setzen jetzt `robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true }` (inkl. identischem `googleBot`-Block). Die Routen sind aus `app/sitemap.ts` entfernt und in `app/robots.ts` in die `disallow`-Liste verschoben. Zusätzlich setzt `robots.ts` für die bekannten Archiv-Crawler (`ia_archiver`, `archive.org_bot`, `Wayback Machine`) eine explizite `Disallow: /`-Regel als Best-Effort-Layer — der Internet Archive ignoriert robots.txt zwar offiziell seit 2017, respektiert aber den `noarchive`-Meta-Tag, der die primäre Verteidigung bildet. Die Seiten bleiben über Direktaufruf erreichbar (Pflicht laut § 5 DDG / DSGVO), werden aber nicht mehr gecrawlt.
- **Favicon zeigt nicht länger das Next.js-Logo** — `app/favicon.ico` war seit dem initialen `create-next-app`-Commit die Next.js-Default-Favicon und wurde nie durch die Momo-Feder ersetzt. Google Search Console, Browser-Tabs und jeder legacy-Client, der explizit `/favicon.ico` anfordert, haben deshalb weiterhin das Next.js-Symbol geliefert bekommen, obwohl `app/icon.svg` und `app/apple-icon.svg` bereits das Momo-Logo trugen. Neu: `app/favicon.ico` ist jetzt ein 2378-Byte Multi-Size-ICO (16/32/48 px, PNG-embedded), das direkt aus `app/icon.svg` via `sharp` gerendert wird. Die veralteten Next.js-Demo-Assets `public/{next,vercel,file,globe,window}.svg` wurden ebenfalls entfernt.
- **NEXT_PUBLIC_APP_URL in SEO-Output steht nicht mehr auf `localhost:3000`** — `sitemap.xml`, `robots.txt`, Open-Graph-Tags, JSON-LD und die iCal-Feed-Absolut-URLs zeigten in der Live-Version auf `http://localhost:3000`, weil der Dockerfile-Build-Stage `NEXT_PUBLIC_APP_URL="http://localhost:3000"` als inline-Platzhalter gesetzt hat. Next.js inlined `NEXT_PUBLIC_*`-Variablen zur **Build-Zeit** statisch in das Client-Bundle und in alle statisch gerenderten HTML-Seiten — eine Runtime-Override via `docker run -e` oder docker-compose ist wirkungslos. Behoben auf mehreren Ebenen:
  - `Dockerfile` verwendet jetzt `ARG NEXT_PUBLIC_APP_URL=http://localhost:3000` mit `ENV`-Durchreichung. Der Build-Arg wird von `docker-compose.yml` aus dem gleichnamigen Env weitergereicht, so dass `docker compose build` den Wert aus `.env` oder der Shell übernimmt.
  - Die GitHub-Actions-Pipeline `build-and-publish.yml` reicht `NEXT_PUBLIC_APP_URL` als Build-Arg durch, mit Default `https://momotask.app` (oder Override via Repo-Variable `vars.NEXT_PUBLIC_APP_URL`). Die publizierten `ghcr.io/jp1337/momo`-Images tragen damit die korrekte öffentliche URL im HTML.
  - `app/sitemap.ts` und `app/robots.ts` sind zusätzlich auf `export const dynamic = "force-dynamic"` gesetzt — als Safety-Net, falls ein Self-Hoster das Image mit dem Default-URL-Build-Arg pullt aber zur Runtime trotzdem einen anderen Wert im Env hat. Damit lesen diese beiden Routen immer den aktuellen Runtime-Wert.
  - `app/page.tsx::buildSoftwareAppJsonLd()` normalisiert die URL (trailing-slash-Stripping) und ergänzt `logo: /icon.svg` und `image: /og-image.png` als absolute URLs, damit Google Rich Results, Bing und Mastodon-Previews das Momo-Logo statt eines Fallbacks zeigen.
  - `public/og-image.png` (1200×630, 45 KB, Momo-Feder + „Steal your time back" in Lora-Italic auf Waldgrün-Gradient) wird jetzt mitgeliefert — vorher war die Referenz in `app/layout.tsx:86` ein 404.
  - Dokumentiert in `docs/seo.md` (inklusive Vergleichstabelle „welche Surface respektiert Runtime-Env, welche nicht") und in `docs-site/deployment.md`. Die K8s-`secret.example.yaml` erklärt die Limitation explizit, inklusive Handlungsanweisung für Self-Hoster.

### Added

- **Stats-Seite ausgebaut** — drei neue Auswertungen auf `/stats`: (1) **Completion-Rate pro Topic** — Topics werden jetzt nach Completion-Rate aufsteigend sortiert (vermiedene Topics zuerst), mit Farbkodierung (rot < 25%, grün > 75%) und neuer „Abschlüsse letzte 30 Tage"-Metrik pro Topic. (2) **Beste Wochentage** — neues 7-Spalten-Balkenchart zeigt, an welchen Wochentagen der User am produktivsten ist; bester Tag wird hervorgehoben. (3) **Streak-Verlauf als Sparkline** — SVG-Sparkline der letzten 90 Tage zeigt den Streak-Verlauf mit aktuellem Wert und Peak. Zusätzlich: alle ~50 Labels der Stats-Seite wurden von hardcoded Deutsch auf i18n (`stats.*`-Namespace) migriert — die Seite funktioniert jetzt vollständig in de/en/fr. Keine Schema-Änderung, keine neue API-Route — reine Auswertungs- und Render-Arbeit auf Basis bestehender `task_completions`-Daten. Neue Komponenten: `WeekdayChart`, `StreakSparkline`. Neue Funktion: `computeStreakHistory()` in `lib/statistics.ts`.
- **Wunschliste mit Coins freischalten** — Wishlist-Items mit einem `coinUnlockThreshold` erfordern jetzt eine ausreichende Münz-Balance vor dem Kauf. Beim Klick auf „Gekauft" werden die Coins atomar in einer DB-Transaction abgezogen; der CoinCounter in der Navbar aktualisiert sich sofort. Der Buy-Button zeigt die Coin-Kosten (z.B. „🪙 Kaufen (50 Münzen)") und ist deaktiviert wenn der User nicht genug Coins hat — ein Lock-Indikator zeigt wie viele Coins noch fehlen, ein „Freischaltbar"-Badge erscheint sobald das Guthaben reicht. Rückgängigmachen eines Kaufs refunded die Coins atomar. Items ohne Threshold funktionieren wie bisher. Swipe-to-buy auf Mobile wird ebenfalls blockiert wenn Coins fehlen. API: `POST /api/wishlist/:id/buy` gibt jetzt `{ item, coinsSpent }` zurück und liefert `422 INSUFFICIENT_COINS` bei zu wenig Guthaben; `DELETE` gibt `{ item, coinsRefunded }` zurück. Keine Schema-Änderung — `coinUnlockThreshold` existierte bereits. Schließt den Gamification-Loop: Coins sind jetzt echte Währung für Wünsche, nicht nur Punkte.
- **Streak Shield** — einmal pro Kalendermonat schützt ein automatisches Schild den Streak bei exakt einem verpassten Tag. Statt eines Resets auf 0 bleibt der Streak erhalten und der User wird per Push/Notification informiert („Dein Schild hat deinen Streak gerettet 🛡️"). Kein Opt-in nötig — das Shield ist immer aktiv. Auf dem Dashboard zeigt ein 🛡️-Indikator neben dem Streak an, ob das Shield diesen Monat noch verfügbar ist. DB: neue Spalte `streak_shield_used_month` auf `users` (Migration `0020`). Bei Gaps von 2+ Tagen greift das Shield nicht — nur ein einzelner verpasster Tag wird geschützt.
- **Per-Habit-Streak auf `/habits`** — jede wiederkehrende Aufgabe bekommt eine eigene Streak-Zählung, unabhängig vom globalen User-Streak. Neue Flammen-Pill (🔥 in `--accent-amber`) auf jeder `HabitCard` zeigt die laufende Serie in der passenden Einheit zur Recurrence („8 Wochen in Folge" für ein 7-Tages-Intervall, „5 Tage in Folge" für ein tägliches Habit) plus den All-Time-Bestwert als dezentes Sub-Label. Hat der User gerade einen neuen Rekord aufgestellt, zeigt das Label „Neuer Rekord" statt der Zahl. Algorithmus: eine *Periode* ist ein rollierendes Fenster von `recurrenceInterval ?? 1` Tagen, die laufende Periode erhält eine Grace (ein wöchentliches Habit setzt nicht sofort zurück, nur weil der Montag begonnen hat), mehrfach-Abschlüsse in einer Periode zählen als einer. Implementierung: neue reine Funktion `computeHabitStreak()` in `lib/habits.ts` (vollständig getestet mit 10 Edge-Case-Szenarien), `HabitWithHistory` um ein `streak`-Feld erweitert, `getHabitsWithHistory()` lädt zusätzlich *alle* Completion-Daten des Users (eine zweite unbegrenzte Query, ein Scan — keine Schema-Änderung), `HabitCard` um die Streak-Pill ergänzt, neue i18n-Keys `habits.stat_streak`, `habits.stat_streak_empty`, `habits.stat_streak_best`, `habits.stat_streak_best_current` und `habits.streak_unit_{days,weeks,biweeks,months,generic}` mit ICU-Plurals in de/en/fr. Dokumentierte Limitation: bei sehr langen Intervallen (Monat/Jahr) drifted das rollierende Fenster gegenüber dem Kalender — der Roadmap-Punkt „Erweiterte Wiederholungsregeln" (WEEKDAY/MONTHLY/YEARLY) behebt das an der Quelle, bis dahin sind 1- und 7-Tages-Intervalle die verlässlichen Fälle.
- **Timezone-Durchschleifung auf `/habits`** — mitgefixter latenter Bug: das Grid-Bucketing in `getHabitsWithHistory` lief bislang auf Server-Lokalzeit, weil die Habits-Page die Funktion ohne `timezone`-Argument aufgerufen hat. User in UTC+2, die eine Aufgabe um 23:50 lokal abschließen, hätten das Quadrat am *nächsten* UTC-Tag grün gesehen. Fix: `app/(app)/habits/page.tsx` lädt jetzt `users.timezone` analog zu `/review` und reicht den Wert durch. Der Code in `lib/habits.ts` akzeptierte den Parameter bereits, er wurde nur nie gesetzt.
- **Haushalt-Vorlage im TemplatePicker** — vierte kuratierte Topic-Vorlage mit sechs wiederkehrenden Haushaltsroutinen und sinnvollen Standardintervallen: Wäsche waschen (7 Tage), Staubsaugen (7 Tage), Küche reinigen (3 Tage), Bad putzen (14 Tage), Fenster putzen (30 Tage), Bettwäsche wechseln (14 Tage). Alle Aufgaben werden als `RECURRING` importiert und erscheinen sofort im `/habits`-Tracker sowie im Daily-Quest-Pool. Da die bisherigen Templates nur `ONE_TIME`-Tasks erzeugt haben, wurde `TemplateTask` in `lib/templates.ts` um die optionalen Felder `type` und `recurrenceInterval` erweitert (abwärtskompatibel — ohne Angabe bleibt es ONE_TIME); `importTopicFromTemplate()` zieht jetzt die IANA-Timezone des Users und setzt `nextDueDate = getLocalDateString(tz)` für RECURRING-Tasks, exakt wie `createTask()` in `lib/tasks.ts`. Keine Schema-Änderung, keine neue API-Route, keine neuen Env-Vars — ein neuer Eintrag in `TEMPLATES`, ein Eintrag in `CLIENT_TEMPLATES` der `TemplatePicker`-Komponente und ein `templates.household.*`-Block in `messages/{de,en,fr}.json`. Icon: `broom`, Farbe: `#5c8ab8` (gedämpftes Blau zur Abgrenzung vom orangen Umzugs-Template).
- **"Fällig heute"-Reminder (Due-Today Reminder)** — neuer opt-in Cron-Job `due-today` in `lib/cron.ts`, der zur gleichen Uhrzeit wie die Daily-Quest-Benachrichtigung feuert und alle Tasks auflistet, deren `due_date` (bzw. `next_due_date` bei RECURRING) heute in der Timezone des Users liegt. **Silent on empty** — an Tagen ohne fällige Aufgaben wird *nichts* verschickt, was „leere" Reminder verhindert, die User daran gewöhnen wegzuwischen. Snoozed Tasks sind ausgeschlossen. Die Benachrichtigung fasst bei einer einzelnen fälligen Aufgabe den Titel direkt in den Notification-Title; bei mehreren wird ein Count-Titel mit Preview der ersten drei Titel im Body gezeigt. Implementierung: neue `users.due_today_reminder_enabled`-Spalte (default false, Migration `drizzle/0019_low_mattie_franklin.sql`), neuer Handler `sendDueTodayNotifications()` in `lib/push.ts` (folgt 1:1 dem `sendDailyQuestNotifications`-Muster inkl. 5-Min-Bucket-SQL in User-TZ, Pro-User-Cache, parallele Web-Push- und Channel-Fan-outs), Registrierung im `CRON_JOBS`-Array **vor** `daily-quest` damit beide Pings nicht kollidieren, neue Checkbox + Hint in `NotificationSettings` (sichtbar, sobald Web Push aktiv ist *oder* mindestens ein Notification-Channel konfiguriert ist — dafür nimmt die Komponente neue Props `initialDueTodayEnabled` und `hasAnyChannel` entgegen), erweiterte `PATCH /api/push/subscribe`-Route (alle Felder optional, mindestens eines Pflicht). Reines Add-on — keine neuen API-Routen, keine neuen Env-Vars, keine neuen Dependencies. Doku in `docs/api.md`, `docs/database.md`, `docs-site/features.md`. i18n-Keys `notif_due_today`/`notif_due_today_hint`/`notif_due_today_saved` in de/en/fr.
- **Gewohnheits-Tracker (Habit-Tracker)** — neue Seite `/habits`, die jede wiederkehrende Aufgabe (`type = 'RECURRING'`) mit einem GitHub-Style Jahres-Raster visualisiert (53 Wochen × 7 Tage, montags beginnend, ISO-Wochen). Jede Zelle wird anhand der Anzahl der Abschlüsse an diesem lokalen Kalendertag eingefärbt (4 Stufen via `color-mix` auf `var(--accent-green)` — funktioniert in Light und Dark Mode ohne Theme-Switch). Pro Habit werden drei Zähl-Pills angezeigt (dieses Jahr, letzte 30 Tage, letzte 7 Tage) sowie Topic-Icon + Recurrence-Intervall als Subtitle. Ein Jahres-Selector oberhalb der Liste erlaubt es, zurückliegende Jahre zu durchstöbern — der Range wird dynamisch aus der frühesten Completion des Users abgeleitet, sodass niemand durch leere Pre-Account-Jahre scrollen muss. **Keine Schema-Änderung und keine Migration** — die Tabelle `task_completions` wird bereits heute von `completeTask()` für jede (inklusive recurring) Completion befüllt; dieses Feature ist ein reines Read-Path-Addon. Implementierung: neues Modul `lib/habits.ts` (`getHabitsWithHistory`, `getEarliestCompletion`, `buildYearOptions` — eine einzige Completion-Query deckt alle drei Zeitfenster ab, Timezone-Handling analog zu `lib/date-utils.ts`), neue Route `app/(app)/habits/page.tsx` (SSR, `?year=`-Query), drei neue Komponenten unter `components/habits/` (`contribution-grid.tsx` — reines CSS-Grid ohne Charting-Lib, `habit-card.tsx`, `year-selector.tsx`), neuer Sidebar-Eintrag „Gewohnheiten" (`faSeedling`) zwischen Themen und Wunschliste. i18n-Keys `habits.*` in de/en/fr (inklusive lokalisierter Monats- und Wochentags-Kürzel). Keine neuen API-Routen, keine neuen Env-Vars.
- **iCal-Export (Kalender-Abonnement)** — User können ihre Momo-Aufgaben als privaten iCalendar-Feed in Google Calendar, Apple Calendar, Outlook oder Thunderbird abonnieren. In den Settings unter „Kalender-Abonnement“ generiert ein Klick auf „Feed-URL erstellen“ einen 256-Bit-Token, die resultierende URL (`/api/calendar/<token>.ics`) wird einmalig angezeigt und kopiert — der Server persistiert nur den SHA-256-Hash. Der Feed enthält alle nicht erledigten Aufgaben mit `due_date` oder (bei `RECURRING`) `next_due_date` als Ganztages-`VEVENT`s; wiederkehrende Aufgaben bekommen ein offenes `RRULE:FREQ=DAILY;INTERVAL=<recurrenceInterval>` und erscheinen als Serie. UIDs sind stabil (`task-<id>@momo`), sodass Updates bei jedem Poll sauber gemerged werden. Snoozed und sequenziell-blockierte Aufgaben sind bewusst enthalten — der Kalender zeigt den Plan, nicht die Aktionsliste. Der Feed-Endpunkt ist öffentlich; die Auth ist allein der Token im Pfad (Calendar-Clients können keine Custom-Header schicken), ungültige Tokens liefern **404** (nicht 401), um keine Existenz-Leaks zu erzeugen. Rotate und Revoke sind 2FA-pflichtig (analog zu API-Keys). Implementierung: neue Spalte `users.calendar_feed_token_hash` + `calendar_feed_token_created_at` (Migration `drizzle/0018_smiling_lester.sql`), neues Modul `lib/calendar.ts` (Token-Gen nach dem `api-keys`-Muster + `buildIcsForUser()` über `ical-generator@10.1.0`), neue Routen `GET /api/calendar/[token]` und `GET/POST/DELETE /api/settings/calendar-feed`, neue Komponente `components/settings/calendar-feed-section.tsx` mit One-Time-URL-Display und Kopier-Button. OpenAPI in `lib/openapi.ts` ergänzt, Doku in `docs/api.md` + `docs/database.md`, i18n-Keys `calendar_feed_*` in de/en/fr.
- **Aufgaben-Vorlagen (Topic Templates)** — One-Click-Import für kuratierte Topic-Vorlagen. Auf der Topics-Seite gibt es neben „+ Neues Thema" einen zweiten Button „📋 Aus Vorlage" der einen Modal mit drei Vorlagen öffnet: **Umzug** (10 Aufgaben, sequenziell), **Steuererklärung** (6 Aufgaben, sequenziell) und **Sport-Routine** (7 Aufgaben, parallel). Klick auf „Importieren" legt in einer einzigen Drizzle-Transaction ein vollständiges Topic mit allen Subtasks an — inklusive Icon, Farbe, `defaultEnergyLevel`, optionalen Priority/Energy/EstimatedMinutes-Overrides pro Subtask und korrekter `sortOrder`. Titel und Beschreibungen werden beim Import in der aktuellen UI-Sprache (de/en/fr) über `next-intl` aufgelöst und als Plain Text gespeichert — der importierte Content ist danach entkoppelt von der i18n-Schicht und frei editierbar. Implementierung: neue Datei `lib/templates.ts` (Template-Katalog + `importTopicFromTemplate()` nach dem Muster von `breakdownTask`), neue Route `POST /api/topics/import-template` (Rate-Limit 10/min, Readonly-API-Keys geblockt), neuer `ImportTemplateInputSchema` in `lib/validators/index.ts`, neue Komponente `components/topics/template-picker.tsx`, Integration in `components/topics/topics-grid.tsx`. OpenAPI-Schema in `lib/openapi.ts` registriert, Doku in `docs/api.md`. i18n-Keys `templates.*` + `topics.from_template` in de/en/fr. Keine DB-Migration nötig — Templates sind Code, keine User-Daten.
- **Sequenzielle Topics** — Topics lassen sich per Toggle im Topic-Form als *sequenziell* markieren. In einem sequenziellen Topic ist bei der Daily-Quest-Auswahl nur die erste noch offene Aufgabe (niedrigste `sortOrder`, nicht gesnoozed) wählbar; alle dahinter liegenden Aufgaben sind implizit blockiert, bis die vorherige erledigt ist. Die bestehende Drag-&-Drop-Reihenfolge (`SortableTaskList` + `/api/topics/[id]/reorder`) ist die Eingabe — keine expliziten Task-Dependencies nötig. Snoozen einer Aufgabe rückt die Kette auf (bewusst, damit ein Snooze die Kette nicht einfriert). Implementierung: neue Spalte `topics.sequential` (boolean, default false, Migration `drizzle/0017_hard_boomer.sql`), blockierte Task-IDs werden in `pickBestTask()` (`lib/daily-quest.ts`) einmal pro Aufruf berechnet und via `notInArray(tasks.id, blockedTaskIds)` aus allen vier Tiers (Overdue, High-Priority, Recurring, Random Pool) herausgefiltert — ein einziger Touchpoint, greift automatisch auch bei `forceSelectDailyQuest` und `reselectQuestForEnergy`. UI: Toggle im `TopicForm`, neuer `faListOl`-Badge auf der `TopicCard`, dezenter Hinweisstreifen in `TopicDetailView` oberhalb der Task-Liste. OpenAPI-Schema und i18n (de/en/fr) mit ergänzt. Doku in `docs/database.md`, `docs/api.md`, `docs-site/features.md`.
- **Energie-Feature: Redesign mit Auto-Re-Roll, Verlauf, Topic-Defaults und Stats** — der Energie-Check-in war zwei strukturelle Bugs lang praktisch unsichtbar (`!quest`-Kopplung in `daily-quest-card.tsx`, UTC↔Local-Vergleich in `dashboard/page.tsx`) und hat selbst nach erfolgreichem Check-in nichts Sichtbares getan. Komplett überarbeitet:
  - **Inline-Karte oben am Dashboard** (`components/dashboard/energy-checkin-card.tsx`): permanent sichtbar, kollabiert nach Check-in zu einer Statusleiste mit „Ändern"-Button. Wechsel-Window: jederzeit, solange die Quest noch nicht erledigt ist.
  - **Auto-Re-Roll der Daily Quest**: neue Funktion `reselectQuestForEnergy()` in `lib/daily-quest.ts` — wenn die aktuelle Quest energetisch nicht zum Check-in passt und ein besserer Kandidat existiert, tauscht Momo automatisch und zeigt einen kleinen „Quest auf deine Energie angepasst"-Banner mit Undo-Link. Idempotent in allen anderen Fällen (untagged Quest, schon passend, schon erledigt). Undo via neuer `POST /api/daily-quest/restore`-Route.
  - **Bugfix Bug A** — `EnergyCheckinCard` ist vom Quest-Zustand entkoppelt und erscheint für jeden User mit oder ohne Quest.
  - **Bugfix Bug B** — der „heute schon eingecheckt?"-Vergleich passiert jetzt im Browser gegen `new Date().toLocaleDateString("en-CA")` statt server-seitig gegen einen UTC-String. Damit verlieren User östlich/westlich von UTC ihren Check-in nicht mehr um Mitternacht.
  - **Historischer Verlauf**: neue Tabelle `energy_checkins(user_id, date, energy_level, created_at)` mit Index `(user_id, date)`. Mehrere Einträge pro Tag erlaubt — Re-Check-ins (morgens HIGH, abends LOW) werden voll persistiert. Die alte `users.energyLevel`/`energyLevelDate` bleibt als Cache.
  - **Topic-Default-Energie**: neue Spalte `topics.default_energy_level`. Tasks im Topic erben den Wert beim Erstellen, wenn der User keinen expliziten Wert wählt (`undefined` → Inheritance, expliziter `null` → "egal" gewinnt). Picker im Topic-Form, dezenter Hinweis im Task-Form wenn ein Default greifen würde.
  - **Quick Wins (Dashboard) & 5-Min-Mode** sortieren energie-bewusst: Tasks mit passender oder leerer Energie zuerst, Mismatches zuletzt. Reine Sortierung, kein Hard-Filter.
  - **Stats-Block "Energie diese Woche"** auf `/stats` — drei Zähler-Pillen + 14-Tage-Mini-Chart aus den `energy_checkins`-Daten. Empty-State-Hinweis wenn der User noch nie eingecheckt hat.
  - **Migration** `drizzle/0016_melted_black_cat.sql` (CREATE TABLE + ALTER TABLE).
  - **API**: `POST /api/energy-checkin` antwortet jetzt zusätzlich mit `{ swapped, previousQuestId, previousQuestTitle }`. Neuer `POST /api/daily-quest/restore`-Endpoint für den Undo-Pfad.
  - **i18n**: neue Keys `energy_card_*`, `form_label_default_energy`, `form_default_energy_*`, `form_energy_topic_default_hint` in DE/EN/FR.
- **SEO für die öffentliche Momo-Instanz** — vollständige Suchmaschinen- und Social-Preview-Unterstützung für `momotask.app` und jede selfhostete Instanz. `app/layout.tsx` setzt jetzt `metadataBase` (aus `NEXT_PUBLIC_APP_URL`), `alternates.canonical`, eine Robots-Direktive, ein erweitertes `openGraph`-Objekt (siteName, locale, image) und Twitter Cards (`summary_large_image`). Neu: `app/robots.ts` (typed `MetadataRoute.Robots` — erlaubt `/`, `/login`, `/impressum`, `/datenschutz`, blockt das gesamte App-Shell, `/api/*` und `/api-docs`) und `app/sitemap.ts` (typed `MetadataRoute.Sitemap` mit den vier öffentlichen Routen, eine Entry pro Route, kein Locale-Fan-Out weil next-intl cookie-basiert läuft). Auf der Landing (`app/page.tsx`) liegt ein `SoftwareApplication`-JSON-LD-Schema im `<head>` für Google Rich Results. Pro-Route-Metadaten ergänzt: `/login` und `/api-docs` sind `noindex`, `/impressum` und `/datenschutz` haben jetzt eigene `description` + `canonical`. Doku in `docs/seo.md`. **Hinweis:** `public/og-image.png` (1200×630) ist noch nicht committed — bis dahin fallen Link-Previews auf das Standard-Icon zurück.
- **Passkeys (WebAuthn)** — passwortloser Primary-Login *und* methodenagnostischer zweiter Faktor. Registrierung in den Settings unter der 2FA-Sektion; `/login` zeigt oberhalb der OAuth-Buttons einen prominenten „Mit Passkey anmelden"-Eintrag; `/login/2fa` bietet Passkey als Alternative zum TOTP-Code (oder einzige Option, wenn der User keinen TOTP eingerichtet hat). Implementiert auf Basis von `@simplewebauthn/server` + `@simplewebauthn/browser` v13, **ohne** den Auth.js-Passkey-Provider (der `session: "jwt"` erzwingen würde) — stattdessen eigene Endpoints unter `/api/auth/passkey/*` (register/login/second-factor/[id]: 7 Routen) die Auth.js-Datenbanksessions direkt erzeugen, sodass der DrizzleAdapter sie beim nächsten Request transparent aufgreift. Neue Tabelle `authenticators` (Auth.js-kompatibel + Momo-Displaylabel), neues Business-Logic-Modul `lib/webauthn.ts`, neue Env-Vars `WEBAUTHN_RP_ID` (Default: Hostname aus `NEXT_PUBLIC_APP_URL`) und `WEBAUTHN_RP_NAME`. Challenges werden in einem kurzlebigen signierten httpOnly-Cookie gespeichert (5-Min-TTL, HMAC-SHA256 über `AUTH_SECRET`, purpose-tag `reg`/`login`/`sf` gegen Cross-Flow-Replay). `userHasSecondFactor()` wurde um den Passkey-Check erweitert — eine einzige Touchpoint, alle Gates (Layout, Settings, API-Auth) profitieren automatisch. Sessions aus dem passwordless Login werden mit `second_factor_verified_at = now()` angelegt, da ein Passkey inhärent MFA ist. Neue UI-Komponenten `PasskeysSection`, `PasskeyLoginButton`, `PasskeySecondFactorButton`. i18n-Keys in de/en/fr. Siehe `docs/two-factor-auth.md` + `docs/api.md` + neue User-Doc `docs-site/passkeys.md`.
- **DB-Rename `sessions.totp_verified_at` → `sessions.second_factor_verified_at`** — die Spalte ist jetzt methodenagnostisch. Helper-Funktionen entsprechend umbenannt (`markSessionTotpVerified` → `markSessionSecondFactorVerified`, `isSessionTotpVerified` → `isSessionSecondFactorVerified`). Migration `drizzle/0015_passkeys.sql` nutzt `ALTER TABLE … RENAME COLUMN`, keine Datenverluste für in-flight Sessions.

- **Zwei-Faktor-Authentifizierung (TOTP)** — neuer optionaler zweiter Faktor zusätzlich zum OAuth-Login. Funktioniert mit jeder RFC-6238-Authenticator-App (Aegis, 2FAS, Google Authenticator, Authy, 1Password, …). Setup-Wizard mit QR-Code in den Settings, 10 einmalig nutzbare Backup-Codes, Login-Challenge unter `/login/2fa`, Re-Verifikation für Disable und Backup-Code-Regenerate. TOTP-Secrets werden mit AES-256-GCM verschlüsselt (`TOTP_ENCRYPTION_KEY`-Env-Var), Backup-Codes mit SHA-256 gehasht. Personal Access Tokens (API-Keys) sind bewusst von der 2FA-Pflicht ausgenommen — sie gelten als eigener Faktor. Implementierung in `lib/totp.ts`, fünf neue Routen unter `/api/auth/2fa/*`, neue Settings-Sektion und i18n in de/en/fr.
- **Admin-Enforcement: `REQUIRE_2FA=true`** — neue Env-Var, die alle Konten zwingt, vor dem Zugriff auf irgendeine geschützte Route einen zweiten Faktor einzurichten. Hard-Lock auf `/setup/2fa` (eigenes Layout außerhalb des `(app)`-Trees, kein Redirect-Loop). Bestehende User ohne 2FA werden beim nächsten Login direkt gegated. Disable-Endpoint blockt mit `403 TOTP_REQUIRED_BY_ADMIN`. Methoden-agnostischer Gate via `userHasSecondFactor()` — vorbereitet auf das zukünftige Passkey-Feature ohne weitere Codeänderungen.

### Security

- **nodemailer auf 8.0.4 angehoben** — adressiert [GHSA-c7w3-x93f-qmm8](https://github.com/advisories/GHSA-c7w3-x93f-qmm8) (low severity, SMTP command injection via unsanitized `envelope.size`-Parameter in nodemailer < 8.0.4). In Momo nicht ausnutzbar (wir setzen das `envelope`-Option in `transporter.sendMail` nirgendwo, und next-auths Email-Provider ist nicht aktiviert), aber der Bump schließt den Dependabot-Alert. Da next-auth einen `peerOptional`-Pin auf nodemailer ^7 hat, wird der v8-Bump per `npm overrides` durchgesetzt.

- **HTML-Attribut-Escaping in TelegramChannel vervollständigt** — CodeQL [`js/incomplete-html-attribute-sanitization`](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-html-attribute-sanitization/) (medium). Die `escapeHtml`-Helper-Funktion in `lib/notifications.ts` escaped jetzt zusätzlich `"` und `'`, sodass Payload-URLs in `<a href="...">` sicher sind, falls jemals ein `"` in einer Notification-URL auftaucht. Praktisch nicht ausnutzbar (URLs kommen nur aus Momos eigenen Settings/Dashboard-Links, nie aus User-Input), aber Defense-in-Depth.

- **GitHub-Workflow `cleanup-images.yml` mit Top-Level `permissions: contents: read`** — CodeQL [`actions/missing-workflow-permissions`](https://codeql.github.com/codeql-query-help/actions/actions-missing-workflow-permissions/) (medium). Der `cleanup-registries`-Job hatte keinen `permissions`-Block; er redet nur mit Docker Hub und Quay.io und braucht von GitHub gar nichts. `cleanup-ghcr` behält sein `packages: write` Override.

### Changed

- **npm install und Build sind jetzt warnungsfrei** — alle 11 npm-Warnungen (3 ERESOLVE wegen React 19 vs swagger-ui-react-Transitives, 8 Deprecation-Warnings aus Workbox-/Drizzle-/Swagger-Subtrees) per `npm overrides` und `.npmrc legacy-peer-deps=true` adressiert. Konkret:
  - `react-copy-to-clipboard` → ^5.1.1 (drops React 18 cap)
  - `react-inspector` → ^9.0.0 (R18+19)
  - `react-debounce-input` → bleibt 3.3.0 (abandoned, hard React 18 cap), kompensiert via `legacy-peer-deps=true` in `.npmrc`
  - `workbox-build` → ^7.4.0 (drops glob@7 + inflight)
  - `glob` → ^13.0.0 (latest)
  - `magic-string` → ^0.30.21 (uses @jridgewell/sourcemap-codec)
  - `source-map` → ^0.7.6 (replaces workbox' abandoned 0.8.0-beta.0)
  - `node-domexception` → npm:@nolyfill/domexception@^1.0.28 (no-op stub; on Node 17+ globalThis.DOMException ist nativ verfügbar)
  - `@esbuild-kit/esm-loader` + `@esbuild-kit/core-utils` → npm:noop-package@^1.0.0 (drizzle-kit deklariert sie als Deps, importiert sie aber nirgendwo — Phantom-Dependencies, sicher zu stubben). `drizzle-kit check` läuft trotzdem sauber durch.
  - Verifiziert: `npm install` 0 warnings, `npm audit` 0 vulnerabilities, `npm run build` success, `tsc --noEmit` clean, `drizzle-kit check` "Everything's fine 🐶🔥".

- **GitHub Actions auf Node 24 migriert** — Vorbereitung auf das Node 20 Sunset (forced default 2026-06-02, removal 2026-09-16). Konkret: `actions/cache@v4 → @v5`, `actions/checkout@v4 → @v6` und `actions/configure-pages@v5 → @v6` in `docs.yml`. Der Pages-Deploy-Job nutzt zusätzlich `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` als dokumentierten Workaround, weil `actions/upload-pages-artifact@v4` und `actions/deploy-pages@v5` intern noch ein Node-20 `upload-artifact` bündeln (beide bereits an ihren neuesten Tags — keine neuere Version verfügbar).

### Fixed

- **Docker-Build kopiert jetzt `.npmrc` in den `deps`-Stage** — vorher hat `npm ci` im Container im strikten Modus ohne `legacy-peer-deps` gelaufen und mit ~40 fehlenden Lockfile-Einträgen abgebrochen (z.B. `webpack@5.105.4` aus `workbox-webpack-plugin`'s Peers). Local lief `npm ci` sauber, weil `.npmrc` im Repo-Root war — im Container nicht vorhanden. Fix: `COPY package.json package-lock.json .npmrc ./` im Dockerfile. `lint`-Job in `build-and-publish.yml` war nicht betroffen, weil er außerhalb von Docker im Repo-Root läuft.

- **Dockerfile Build-Time Env Stubs nicht mehr in Image-Layer** — der `dockerfile-rules SecretsUsedInArgOrEnv`-Lint hatte `ENV "AUTH_SECRET"`, `ENV "DATABASE_URL"`, `ENV "NEXT_PUBLIC_APP_URL"` flagged. Die drei Placeholder müssen nur existieren, damit `next build` `lib/env.ts` beim Modul-Load auswerten kann. Sie sind jetzt inline auf der `RUN npm run build`-Zeile gesetzt — existieren also nur für die Dauer dieses Build-Steps und werden nie in eine Image-Layer-Metadaten gebrannt.

### Added

- **Microsoft Sign-In (private accounts only)** — Login via persönlichem Microsoft-Account (Outlook.com, Hotmail, Live, Xbox, Skype). Aktiviert über `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`. Der Tenant ist hart auf `consumers` gepinnt (`https://login.microsoftonline.com/consumers/v2.0/`) — Work / School / Microsoft 365 Accounts werden bewusst nicht unterstützt, weil Auth.js den Consumer-Endpoint erzwingt. Button erscheint automatisch auf `/login` und in Settings → Connected Accounts (Account Linking funktioniert über die bestehende `linking_requests`-Flow). Keine DB-Migration. Setup-Anleitung in [docs/oauth-setup.md](docs/oauth-setup.md#microsoft-private-accounts-only) und [docs-site/oauth-setup.md](docs-site/oauth-setup.md). Damit ist der "Microsoft Sign In"-Eintrag aus `ROADMAP.md` (Nächste Schritte) abgehakt.

- **Telegram Benachrichtigungskanal** — Push-Benachrichtigungen über einen Telegram-Bot. User trägt Bot Token (von @BotFather) und Chat ID (z.B. via @userinfobot) in den Einstellungen ein. Nutzt die Telegram Bot API mit HTML-Parse-Mode und einem "Open Momo"-Click-Through-Link. Robustes HTML-Escaping für Sonderzeichen in Task-Titeln. Test-Button in den Einstellungen. Dreisprachig (DE/EN/FR). Keine DB-Migration — die Multi-Channel-Architektur trägt den neuen Kanal automatisch.

- **E-Mail Benachrichtigungskanal** — Tagesquest-Reminder, Streak-Warnung und Wochenrückblick per E-Mail. SMTP-Credentials sind eine Instance-Konfiguration über Env-Vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`); jeder User trägt nur die Ziel-Adresse ein (Default = Account-Mail). Stilisiertes Newsletter-HTML-Template (table-based, Outlook-kompatibel, Lora-Heading, Waldgrün-Akzent, CTA-Button) plus Plain-Text-Alternative für bessere Spam-Reputation. Singleton-Transporter via `nodemailer`. UI verbirgt den "+ E-Mail"-Button automatisch, wenn die Instanz kein SMTP konfiguriert hat. Test-Button verifiziert die Zustellung. Dreisprachig (DE/EN/FR). Keine DB-Migration nötig.

- **Pushover Benachrichtigungskanal** — Push-Benachrichtigungen über die Pushover API (iOS, Android, Desktop). Konfigurierbar in den Einstellungen unter "Zusätzliche Benachrichtigungskanäle" mit User Key und App Token. Test-Button zum Verifizieren. Nutzt die bestehende Multi-Channel-Architektur — keine DB-Migration nötig. Dreisprachig (DE/EN/FR).

- **ntfy.sh Benachrichtigungskanal** — Zusätzlicher Benachrichtigungskanal über ntfy.sh (öffentlich oder self-hosted). Konfigurierbar in den Einstellungen unter "Zusätzliche Benachrichtigungskanäle". Unterstützt Topic-Name und optionalen Server-URL. Test-Button zum Verifizieren der Konfiguration. Benachrichtigungen werden für Daily Quest, Streak-Erinnerungen und Wochenrückblick gesendet — unabhängig von Web-Push. Neue `notification_channels`-Tabelle mit JSONB-Config und Multi-Channel-Architektur: Neue Kanäle (Pushover, Telegram, E-Mail, Webhook) benötigen keine DB-Migration. Neues `NotificationChannel`-Interface in `lib/notifications.ts`. Dreisprachig (DE/EN/FR). API-Endpoints: `GET/PUT /api/settings/notification-channels`, `DELETE /api/settings/notification-channels/:type`, `POST /api/settings/notification-channels/:type/test`.

- **Profil bearbeiten** — Name, E-Mail-Adresse und Profilbild können in den Einstellungen geändert werden. OAuth-Provider liefern oft Wegwerf-Mails oder Pseudonyme — User können das jetzt nachträglich korrigieren. Profilbild-Upload mit serverseitigem Resize (200×200, WebP) und Speicherung als Data-URL in der DB. Neuer API-Endpoint `PATCH /api/user/profile`. Dreisprachig (DE/EN/FR).

- **Subtask-Reihenfolge (Drag & Drop)** — Aufgaben innerhalb eines Topics können per Drag & Drop umsortiert werden. Neue `sortOrder`-Spalte auf Tasks. Dedizierter Drag-Handle (6-Punkt Grip-Icon) links neben jeder Aufgabe — kein Konflikt mit Swipe-to-Complete. Touch-Support (200ms Delay), Tastatur-Support (Space + Pfeiltasten), optimistisches UI-Update mit automatischem Revert bei Fehler. Neuer API-Endpoint `PUT /api/topics/:id/reorder`. Neue Tasks erscheinen am Ende der Liste. Snoozed/Completed Sektionen bleiben unsortierbar. Dreisprachig (DE/EN/FR).

- **Focus Mode** — Neue Seite (`/focus`) zeigt eine ablenkungsfreie Ansicht mit nur zwei Elementen: Tagesquest + Quick Wins (Aufgaben ≤ 15 Minuten). Volle Completion-Animationen (Konfetti, Coins, Level-Up, Achievements). "Alles geschafft"-Feierzustand wenn Quest und alle Quick Wins erledigt. Atmosphärischer Header mit grünem Glow. Neuer Einstiegspunkt auf dem Dashboard (grüner CTA-Banner). Navigation: Sidebar (Desktop), Mobile-Nav (ersetzt 5-Min), User-Menü. Dreisprachig (DE/EN/FR).
- **Energie-Filter** — Tasks können mit einem Energielevel (Hoch / Mittel / Niedrig) getaggt werden. Vor der täglichen Quest fragt das Dashboard "Wie fühlst du dich heute?" — die Quest-Auswahl bevorzugt dann passende Tasks. Soft Preference: wenn keine energy-passenden Tasks existieren, wird trotzdem eine Quest gewählt. Ungetaggte Tasks passen zu jedem Energielevel. Neues Formularfeld im Task-Erstellen/Bearbeiten-Dialog, Energy-Badge auf Task-Items, Match-Badge auf der Quest-Karte. Neuer API-Endpoint `POST /api/energy-checkin`. Dreisprachig (DE/EN/FR). Refactoring: `forceSelectDailyQuest()` nutzt jetzt den gemeinsamen `pickBestTask()`-Algorithmus (eliminiert ~60 Zeilen Duplikat-Code).
- **Wöchentlicher Rückblick** — Dedizierte Seite (`/review`) zeigt die wöchentliche Performance-Zusammenfassung: Abschlüsse (mit Vergleich zur Vorwoche), Verschiebungen, verdiente Coins, Streak, neu erstellte Aufgaben und Top-Themen. Motivierende Nachricht basierend auf der Wochenleistung. Wöchentliche Push-Benachrichtigung jeden Sonntag um 18:00 Uhr (lokale Zeit des Nutzers). Neue `quest_postponements`-Tabelle für präzise Verschiebungs-Analyse. Dreisprachig (DE/EN/FR). Zugang über User-Menü (Avatar-Dropdown).
- **Unified Cron Dispatcher** — Alle Cron-Jobs (daily-quest, streak-reminder, weekly-review) laufen jetzt über einen einzigen Endpoint `POST /api/cron` und einen zentralen Dispatcher in `lib/cron.ts`. Neue Jobs erfordern nur noch einen Eintrag im `CRON_JOBS`-Array — keine Docker-Compose-Änderungen nötig. Jeder Job hat eigene Idempotenz-Guards (5-Minuten-Bucket oder täglich). Der Docker-Cron-Container ruft nur noch eine URL auf.
- **Emotionaler Abschluss** — Nach Abschluss der Tagesquest erscheint ein sanftes Zitat (Michael Ende) oder eine Aufmunterung. Tagesbasierte Auswahl (jeden Tag ein anderes Zitat, stabil bei Refresh). 12 Zitate pro Sprache (6 Michael-Ende-Zitate + 6 Affirmationen). Abschaltbar in den Einstellungen. Dreisprachig (DE/EN/FR). Framer-Motion-Animation mit verzögertem Fade-in.
- **"Ich hab nur 5 Minuten"-Modus** — Dedizierte Seite (`/quick`) zeigt nur Aufgaben mit Zeitschätzung ≤ 5 Minuten. Aufgaben sind direkt abschließbar mit Konfetti, Coins, Level-Up und Achievements. Prominenter CTA-Banner auf dem Dashboard (nur sichtbar wenn 5-Min-Aufgaben existieren). Neuer Eintrag in Sidebar und mobiler Navigation (Blitz-Icon). Leerer Zustand mit Hinweis, Zeitschätzungen hinzuzufügen. Dreisprachig (DE/EN/FR).
- **Snooze / Aufgabe pausieren** — Tasks können bis zu einem Datum pausiert werden ("Erinnere mich ab [Datum]"). Pausierte Tasks verschwinden aus der Aufgabenliste, Quick Wins und Tagesquest. Schnelloptionen: Morgen, Nächste Woche, In einem Monat, oder eigenes Datum. Tasks tauchen automatisch wieder auf, wenn das Datum erreicht ist. Neue API-Endpunkte: `POST/DELETE /api/tasks/:id/snooze`. Pausierte Tasks erscheinen in einer kollabierbaren "Pausiert"-Sektion. Wird die aktive Tagesquest pausiert, wird automatisch eine neue Quest gewählt.
- **Suche & Filter** — Volltextsuche und Filter-Chips auf der Tasks- und Wunschlisten-Seite. Tasks können nach Priorität und Thema gefiltert werden, Wishlist-Items nach Priorität. Die Suche durchsucht Titel und Notizen (Tasks) bzw. Titel (Wishlist). Alles client-seitig, kein API-Roundtrip.
- **Custom Error Pages** — eigene 404- und 500-Seite im Momo-Design (Lora-Schrift, Amber-Akzent, Waldgrün-Ästhetik, fliegende Animationsziffer). Beide Seiten unterstützen Dark- und Light-Mode vollständig. Die 500-Seite zeigt in der Entwicklungsumgebung den Fehlertext an und bietet "Neu laden" + "Zurück zur App".
- **Alexa Skill** — Spracheingabe für Momo via Amazon Echo: Tasks hinzufügen ("füge Zahnarzt hinzu"), Daily Quest abfragen ("was ist meine Quest?"), Aufgaben auflisten ("liste meine Aufgaben"), Wunschliste befüllen ("füge Milch zur Einkaufsliste hinzu"). Lambda-Code und Interaction Models in `alexa-skill/`.
- **Alexa Account Linking** — Alle Momo-User können ihren Account über die Alexa-App verknüpfen. Neuer OAuth 2.0 Implicit Grant Endpoint `GET /api/alexa/auth`: User wird eingeloggt, Momo erstellt automatisch einen API-Schlüssel "Alexa" und übergibt ihn an Amazon.
- **Swipe-Gesten auf Mobile** — Wischgeste auf Task-Items: rechts = erledigen (grüner Hintergrund), links = löschen (roter Hintergrund). Wishlist-Items (Status OPEN): rechts = kaufen, links = ablegen. Vertikales Scrollen bleibt unberührt.
- **Confetti beim Wishlist-Kauf** — Konfetti-Animation beim Markieren eines Wunschlisten-Artikels als gekauft, analog zu Task-Abschlüssen.
- **Daily Quest wechselt täglich** — Eine nicht abgeschlossene Quest wird am nächsten Tag zurückgesetzt und neu vergeben. Neue DB-Spalte `daily_quest_date` auf `tasks` verhindert, dass dieselbe Quest mehrere Tage in Folge erscheint.
- **Task-Titel in Push-Benachrichtigungen** — Die tägliche Quest-Benachrichtigung enthält jetzt den Namen der Quest, z. B. "Heutige Mission: Zahnarzt anrufen".

### Changed

- **Einheitliche Edit/Delete-Buttons** — Tasks, Topics und Wishlist-Kacheln zeigen Edit (✎) und Delete (✕) jetzt an derselben Position (oben rechts) mit derselben Stilistik. Lange Titel werden nicht mehr abgeschnitten und laufen nicht in die Icons.
- **CI/CD Pipeline ~25 s schneller** — Registry-Pushes (GHCR, Docker Hub, Quay.io) laufen jetzt parallel im merge-Job. `node_modules` wird gecacht und `npm ci` bei unverändertem Lock-File übersprungen. TypeScript-Check und ESLint laufen im lint-Job parallel.

### Fixed

- **Profilbild-Ladeprobleme (CSP)** — Profilbilder von OAuth-Providern (GitHub, Discord, Google) wurden vom Service Worker blockiert (`connect-src 'self'`). Fix: Remote-URLs werden jetzt über `next/image` proxied (same-origin), Data-URLs (hochgeladene Bilder) verwenden `<img>`.
- **Cron-Fehlerdiagnose** — Der Cron-Container loggt jetzt den HTTP-Statuscode und die Response bei Fehlern (z.B. `FAILED (HTTP 401)`). Vorher wurde der Fehlergrund von `curl -sf` verschluckt.
- **Cron-Status auf Admin-Seite**: Status-Banner (grün/rot) und History-Tabelle mit den letzten 20 Push-Cron-Läufen (Zeitpunkt, Gesendet, Fehler, Dauer). Rot wenn letzter Lauf älter als 15 Minuten.
- **Cron-Status im Health-Endpoint**: `GET /api/health` enthält jetzt ein nicht-blockierendes `cron`-Objekt mit `lastRunAt` und `minutesSinceLastRun`.
- **PATCH /api/push/subscribe**: Neuer Endpoint zum Aktualisieren der Benachrichtigungszeit ohne erneutes Subscriben.
- **Google OAuth** auf der Live-Version aktiviert.

### Fixed

- **Push-Benachrichtigungen**: Vier Bugs behoben — kein Cron-Service, `notificationTime` wurde ignoriert, Zeitänderung wurde silently verworfen (Zod 422), Idempotenz-Guard war falsch konfiguriert.
- **Cron-Intervall 5 Minuten**: Beliebige Zeiten in 5-Minuten-Schritten (z.B. 06:30, 08:00) werden korrekt getriggert.
- **Docker Compose `cron`-Service**: Neuer Container (`alpine:3` + curl) startet automatisch mit dem Stack und ruft alle 5 Minuten `POST /api/cron/daily-quest` auf.
- **Cron-History**: Letzte 30 Tage werden in der `cron_runs`-Tabelle gespeichert, ältere Rows werden automatisch bereinigt.

#### Code-Qualität & Robustheit (2026-04-05)

- **Wiederkehrende Tasks erstellen korrektes Fälligkeitsdatum**: `nextDueDate` bei wiederkehrenden Aufgaben wird jetzt in der lokalen Zeitzone des Nutzers berechnet, nicht mehr in UTC. Ein Task, der um Mitternacht in UTC+2 erstellt wird, erhält den richtigen lokalen Folgetag als Fälligkeitsdatum.
- **Task Breakdown zählt alle Subtasks**: Der globale `totalTasksCreated`-Zähler wird beim Aufteilen einer Aufgabe korrekt um die Anzahl der erstellten Subtasks erhöht (nicht nur um 1).
- **Daily Quest berücksichtigt Zeitzone überall**: Tagesquest-Auswahl, beste Task-Auswahl und erzwungene Quest-Auswahl verwenden jetzt einheitlich die Zeitzone des Nutzers. Die Zeitzone kann per Query-Parameter (`?timezone=`) bzw. Request-Body übergeben werden.
- **Coin-Event-System stabilisiert**: Das clientseitige Coin-Event wird nicht mehr im Server-Side-Rendering ausgelöst (SSR-Guard). Toter TypeScript-Code wurde entfernt.
- **Timezone-Validierung zentralisiert**: Die `TimezoneSchema`-Validierung in der Postpone-Route verwendet jetzt das gemeinsame Schema aus `lib/validators/` statt einer lokalen Inline-Definition.
- **Achievement-Fehler blockieren nicht mehr den Task-Abschluss**: Schlägt die Errungenschaftsprüfung beim Abschließen einer Aufgabe fehl, wird der Fehler abgefangen und protokolliert — der Abschluss selbst bleibt davon unberührt.
- **Datenbank-Migrationsskript mit Verbindungs-Timeout**: Alle Datenbankverbindungen im Migrationsskript setzen jetzt einen `statement_timeout` von 30 Sekunden, einschließlich der Drizzle-ORM-Migration selbst.

#### Statistikseite — Topic-Icons (2026-04-05)

- **Topic-Icons in der Statistikseite werden korrekt dargestellt**: Statt des rohen Icon-Namens (z. B. "house", "camera") wird jetzt das tatsächliche FontAwesome-Icon gerendert.

#### Formular-Darstellung auf Mobilgeräten (2026-04-05)

- **Task-Formular-Modal überlappt nicht mehr die Navigation**: Das Speichern/Abbrechen-Buttons im Task-Formular werden auf Mobilgeräten nicht mehr von der unteren Navigationsleiste verdeckt. Das Modal nutzt jetzt die volle Bildschirmhöhe (`100dvh`) auf Mobilgeräten und eine begrenzte Höhe auf dem Desktop.

---

### Fixed

**Timezone-aware streak & postpone (2026-04-04)**

- **Timezone-korrekte Streak-Berechnung**: Streak und Verschiebungs-Datum werden jetzt in der lokalen Zeitzone des Nutzers berechnet. Ein Task-Abschluss um 23:50 Uhr in UTC+2 wird korrekt dem lokalen Tag gutgeschrieben, nicht dem nächsten UTC-Tag. Die Zeitzone wird vom Browser mitgesendet (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **Coin-Counter im Navbar aktualisiert sich sofort**: Beim Abhaken einer Aufgabe steigt der Coin-Zähler oben sofort. Beim Rückgängigmachen (Uncomplete) sinkt er entsprechend.
- **Task-Zähler in der Aufgabenliste aktualisiert sich live**: Der "X aktiv · Y erledigt"-Untertitel in der Aufgabenliste reagiert jetzt direkt auf Abschlüsse — kein Seiten-Reload nötig.
- **Topic-Detailseite: vollständige Abschluss-Animationen**: Konfetti, Coin-Counter-Update, Level-Up-Overlay und Achievement-Toasts funktionieren jetzt auch beim Abhaken von Aufgaben innerhalb eines Topics.
- **Topic-Detailseite: Aufgabe bearbeiten zeigt alle Felder**: Beim Bearbeiten einer Subtask werden jetzt `estimatedMinutes`, `notes` und `recurrenceInterval` korrekt vorgeladen.
- **Konfetti-CSP-Fix**: `canvas-confetti` verwendet intern einen Web Worker aus einer Blob-URL — `worker-src blob:` wurde in der Content-Security-Policy ergänzt.
- **Produktions-Migration fix**: `scripts/migrate.mjs` erkennt jetzt auch `ALTER TABLE ADD COLUMN`-Migrationen, die außerhalb von Drizzle angewendet wurden. Verhindert den Container-Start-Fehler "column already exists".

---

### Added

**Phase 11 — Neue Features + UI-Redesign (2026-04-03)**

- **Prokrastinations-Zähler**: `postponeCount` auf Tasks trackt wie oft eine Aufgabe verschoben wurde
- **Quest-Verschiebe-Limit**: User können in den Einstellungen konfigurieren, wie oft sie täglich verschieben dürfen (1–5, default 3)
- **Bonus-Coins**: Tasks mit 3+ Verschiebungen geben beim Abschließen doppelte Coins
- **Task Breakdown**: "Aufteilen"-Button auf jedem Task erstellt ein neues Topic mit Subtasks (Original wird gelöscht)
- **Zeitschätzung**: `estimatedMinutes` (5/15/30/60 min) auf Tasks; Badge im Task-Item
- **Quick Wins**: Dashboard-Sektion zeigt Tasks mit Zeitschätzung ≤ 15 Minuten
- **Öffentliche Landing Page**: Atmosphärische Startseite im Momo-Stil (Lora italic, Waldgrün, Feather-Animation, Michael-Ende-Zitat)
- **Dashboard Redesign**: Kursive Lora-Begrüßung, atmosphärische Hintergrund-Glows, Stat-Karten mit Tier-Indikatoren

**Nutzer- und Admin-Statistiken (2026-04-03)**

- `lib/statistics.ts` — `getUserStatistics()` und `getAdminStatistics()` mit parallelen Drizzle-Abfragen
- `/stats` — Nutzerstatistiken-Seite (Server Component):
  - Übersichtskarten: Aufgaben, Abschlüsse, Streak, Bester Streak
  - Fortschrittsbereich: Level-Badge mit deutschem Titel, Coin-Guthaben, Fortschrittsbalken zum nächsten Level
  - Aktivitätsbereich: Abschlüsse letzte 7 und 30 Tage, offene Aufgaben
  - Aufgaben nach Typ (Einmalig / Wiederkehrend / Tagesquest-fähig) mit Prozentstabs
  - Aufgaben nach Priorität (Hoch / Normal / Irgendwann)
  - Topics mit Fortschrittsbalken pro Topic
  - Errungenschaften: verdiente mit Datum, gesperrte mit Schloss-Icon und reduzierter Opacity
  - Wunschliste: Gekauft, Ausgegeben (€), Offen, Verworfen
- `/admin` — Admin-Statistiken-Seite (Server Component):
  - Zugriffschutz via `ADMIN_USER_IDS` Umgebungsvariable (kein Redirect, zeigt "Zugriff verweigert")
  - System-Übersicht: Nutzer, Aufgaben, Abschlüsse, Topics
  - Nutzerwachstum (7d/30d), Aktivität (7d/30d), Durchschnittswerte (Level, Coins, Streak)
  - OAuth-Provider-Tabelle mit Anteilen
  - Top-10-Nutzer-Tabelle nach Abschlüssen
  - Errungenschaften-Verteilung mit Anteilen
  - Wunschliste-Aggregat (Total gekauft, Total ausgegeben)
- `components/layout/user-menu.tsx` — "Statistiken"-Link (faChartBar) + optionaler "Admin"-Link (faShieldHalved) für Admins
- `components/layout/navbar.tsx` — `isAdmin?: boolean` prop durchgereicht
- `app/(app)/layout.tsx` — Admin-Prüfung via `ADMIN_USER_IDS`, `isAdmin` an Navbar übergeben
- `ADMIN_USER_IDS` Umgebungsvariable dokumentiert in `.env.example` und `docs/environment-variables.md`

**Public REST API + Personal Access Tokens + Swagger UI (2026-04-03)**

- `lib/openapi.ts` — vollständige OpenAPI 3.1.0 Spezifikation (29 Endpunkte, 8 Tags, alle Schemas)
- `GET /api/openapi.json` — Maschinenlesbare Spec (öffentlich, Cache 5 Min.)
- `/api-docs` — Interaktive Swagger UI (öffentlich, kein Auth nötig)
  - Authorize via Bearer Token oder Session Cookie
  - "Try it out" für alle Endpunkte direkt im Browser
- `api_keys`-Tabelle — Mehrere Keys pro User, Read-Only-Option, Ablaufdatum
- `lib/api-keys.ts` — `generateApiKey()` (256-bit Entropie), `createApiKey()`, `listApiKeys()`, `revokeApiKey()`, `resolveApiKeyUser()`
- `lib/api-auth.ts` — `resolveApiUser()` — Bearer Token + Session Cookie, `readonlyKeyResponse()`
- Alle ~18 API-Routen auf `resolveApiUser()` migriert (Bearer Token + Session Cookie)
- Read-Only-Keys erhalten `403 Forbidden` auf POST/PATCH/DELETE-Routen
- `GET /api/user/api-keys` — Liste aktiver Keys (ohne Hash)
- `POST /api/user/api-keys` — Erstellt neuen Key (Klartext wird einmalig zurückgegeben, rate limit: 10/h)
- `DELETE /api/user/api-keys/:id` — Widerruft Key
- `/api-keys` Seite — API Key Verwaltung mit Formular, einmaliger Klartextanzeige + Copy-Button
- `components/layout/user-menu.tsx` — Avatar-Dropdown (Einstellungen / API Keys / Abmelden)

**Logo SVG + Favicon (2026-04-03)**

- `public/icon.svg` — Stilisiertes Feder-Icon in Amber (#f0a500)
- `app/icon.svg` — Next.js Favicon auto-discovery
- `app/apple-icon.svg` — Apple Touch Icon
- `public/logo.svg` — Wortmarke: Feder + "momo" in Lora-Schrift
- `public/manifest.json` — SVG als primäres PWA-Icon
- Navbar: Feder-SVG + "momo" in Lora statt 🪶 Emoji-Text
- Login: `logo.svg` als `<Image>` statt Text-H1

**Font Awesome Icons (lokal, kein CDN) (2026-04-03)**

- `@fortawesome/fontawesome-svg-core` + `free-solid-svg-icons` + `free-brands-svg-icons` + `react-fontawesome` installiert
- `config.autoAddCss = false` in `app/layout.tsx` — verhindert doppeltes Stylesheet
- Sidebar: faHouse / faListCheck / faFolderOpen / faStar / faGear
- ThemeToggle: faMoon / faSun / faDesktop
- CoinCounter: faCoins
- Dashboard-Stats: faCoins / faFire / faTrophy / faCircleCheck
- Login-Provider: faGithub / faDiscord / faGoogle / faKey

**Account Linking — mehrere OAuth-Provider verbinden (2026-04-03)**

- `linking_requests`-Tabelle — Short-lived tokens für OAuth-Account-Linking (5 Min. TTL)
- `POST /api/auth/link-request` — Erstellt Linking-Token, gibt OAuth-Redirect-URL zurück
- `GET /api/auth/link-callback` — Mergt neuen OAuth-Account auf Original-User nach OAuth-Flow
- `components/settings/linked-accounts.tsx` — Provider-Liste mit Status-Badges + "Verbinden"-Button
- Settings-Seite: Neue Sektion "Verbundene Konten" (vor Gefahrenzone)
- i18n: `section_linked_accounts` + `linked_accounts_hint` in DE/EN/FR

**DSGVO Compliance + Performance (2026-04-03)**

- Self-hosted Google Fonts via `next/font/google` — no more CDN requests to `fonts.googleapis.com` at runtime (DSGVO + performance)
- `GET /api/user/export` — personal data export as JSON download (DSGVO Art. 15/20, rate limit: 5/hour)
- `DELETE /api/user` — account deletion with full CASCADE across all tables (DSGVO Art. 17)
- `/impressum` and `/datenschutz` legal pages — env-var driven, publicly accessible, no auth required
- Login page footer with Impressum and Datenschutz links
- "Daten exportieren" button in Settings page (section above Danger Zone)
- "Konto löschen" two-step confirmation in Settings page Danger Zone
- `docs/gdpr.md` — DSGVO compliance guide for operators
- `NEXT_PUBLIC_IMPRINT_*` environment variables added to `.env.example` and all docs
- CSP headers updated: `fonts.googleapis.com` and `fonts.gstatic.com` removed (no longer needed)

**Multilingual Support (2026-04-03)**

- `next-intl` integration — cookie-based locale detection, no URL prefix changes
- Three supported languages: German (`de`, default), English (`en`), French (`fr`)
- All UI strings extracted into `messages/de.json`, `messages/en.json`, `messages/fr.json`
- Language switcher in Settings (🇩🇪 / 🇬🇧 / 🇫🇷 buttons)
- `POST /api/locale` — sets the `locale` cookie
- Locale resolution order: cookie → `Accept-Language` header → default `de`
- Adding new languages requires only a `messages/XX.json` file — no code changes

**Dark Mode Redesign — "Warme Dämmerung" (2026-04-03)**

- Background lightness raised from L 7–14% to L 12–20% — no longer oppressively dark
- Improved layer separation: `bg-primary` / `bg-surface` / `bg-elevated` now clearly distinguishable
- Border opacity increased (L 22% → L 30%) for better visibility
- Shadow opacity reduced (0.40–0.60 → 0.30–0.45) for a softer feel
- Light mode unchanged

**CI/CD Improvements (2026-04-01)**

- Native multi-arch CI build: `linux/amd64` on `ubuntu-latest`, `linux/arm64` on `ubuntu-24.04-arm` — eliminates slow QEMU emulation
- Per-registry conditional guards in merge job (Docker Hub, Quay.io only push when secrets are configured)
- Per-registry isolated `imagetools create` steps for better failure visibility

### Changed

- `package.json` — npm override `serialize-javascript` pinned to `^7.0.5` (CVE fix, constrained to 7.x major)
- `package.json` — npm override `lodash` pinned to `4.17.21` (fixes broken 4.18.0 release where `assignWith` was undefined in `template.js`)
- `.github/workflows/build-and-publish.yml` — digest artifact retention increased from 1 to 7 days; 45-minute timeout on build jobs; explicit `permissions: read` on lint job
- `.github/workflows/docs.yml` — fixed non-existent action versions (`checkout@v6` → `@v4`, `configure-pages@v6` → `@v5`)

### Fixed

- `app/api/wishlist/[id]/buy/route.ts` — `DELETE /buy` now returns HTTP 409 Conflict (instead of 404) when the item exists but is not in BOUGHT state
- `app/(app)/dashboard/page.tsx` — replaced `<a>` with `<Link>` to fix Next.js no-html-link-for-pages lint rule
- `lib/auth.ts` — Keycloak provider changed from dynamic `require()` to static import
- API error messages in wishlist buy/discard routes no longer leak internal `error.message` strings

---

**Phase 7 – Deployment & Hardening**

- `app/api/health/route.ts` — unauthenticated health check endpoint (`GET /api/health`) returning `{ status: "ok", timestamp }` for Docker, Kubernetes, and load balancer probes
- `lib/rate-limit.ts` — in-memory sliding-window rate limiter (`checkRateLimit`, `rateLimitResponse`) applied to all mutation API routes
- Rate limiting applied to mutation routes: `POST /api/tasks` (60/min), `POST /api/tasks/:id/complete` (30/min), `POST /api/topics` (30/min), `POST /api/wishlist` (30/min), `POST /api/daily-quest/postpone` (10/min)
- `next.config.ts` — security headers on all routes: CSP, HSTS (2-year preload), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `.github/workflows/build-and-publish.yml` — GitHub Actions CI/CD pipeline: multi-platform Docker build (amd64 + arm64) with push to GHCR, Docker Hub, and Quay.io on every push to `main` and on version tags
- `deploy/examples/namespace.yaml` — Kubernetes namespace manifest
- `deploy/examples/deployment.yaml` — Kubernetes Deployment (2 replicas, liveness/readiness probes, pod anti-affinity, non-root securityContext)
- `deploy/examples/service.yaml` — ClusterIP Service for the app
- `deploy/examples/ingress.yaml` — Ingress with TLS placeholder (cert-manager + ingress-nginx)
- `deploy/examples/secret.example.yaml` — Secret template with all required keys and generation instructions
- `deploy/examples/postgres-statefulset.yaml` — PostgreSQL 18 StatefulSet with PVC (10Gi) for self-hosted database

### Changed

- `Dockerfile` — added `HEALTHCHECK` instruction hitting `/api/health` every 30s
- `docker-compose.yml` — updated app healthcheck to use `/api/health` endpoint
- `docs/deployment.md` — added production checklist, AUTH_SECRET rotation procedure, and Kubernetes deployment steps
- `README.md` — added Production Checklist section; Phase 7 marked as Done in status table

---

**Phase 6 – PWA & Push Notifications**

- `public/manifest.json` — PWA web app manifest (name, short_name, description, start_url, display, theme_color, orientation, icons, shortcuts)
- `worker/index.js` — Custom service worker push + notificationclick handlers (merged into next-pwa generated SW)
- `next-pwa` integration — service worker generated at `public/sw.js`, auto-registered at startup, disabled in development
- `@types/web-push` TypeScript types, `types/next-pwa.d.ts` manual type declaration for next-pwa v5
- PWA meta tags in root layout: `<link rel="manifest">`, `theme-color`, Apple mobile web app meta tags
- `lib/push.ts` — server-side VAPID push logic:
  - `sendPushNotification` — sends to a single subscriber, auto-cleans expired (410) subscriptions
  - `sendDailyQuestNotifications` — fan-out to all users with notifications enabled
  - `sendStreakReminders` — fan-out to streak users who haven't completed a task today
- `app/api/push/subscribe` — `POST` (save subscription + enable notifications) / `DELETE` (remove + disable)
- `app/api/push/test` — `POST` sends a test push notification to the current user
- `app/api/cron/daily-quest` — `POST` triggers daily quest notifications (protected by `CRON_SECRET`)
- `app/api/cron/streak-reminder` — `POST` triggers streak reminder notifications (protected by `CRON_SECRET`)
- `components/settings/notification-settings.tsx` — client component for full permission/subscribe/unsubscribe flow
- `app/(app)/settings/page.tsx` — Settings page with Account section (name, avatar, email, provider badge) and Push Notifications section
- Settings link added to Sidebar navigation
- `CRON_SECRET` environment variable added to `lib/env.ts` and `.env.example`
- `docs/environment-variables.md` updated with `CRON_SECRET` documentation
- `docs/api.md` updated with push notification and cron routes
- Build script updated to use `--webpack` flag (required for next-pwa compatibility with Next.js 16 + Turbopack default)

**Phase 1 – Foundation**

- Next.js 15 (App Router) + React 19 + TypeScript strict mode project setup
- Tailwind CSS v4 with custom design system CSS variables
- Design system: dark/light mode with warm earthy colour palette
  - Dark theme: deep forest greens (`#0f1410`) with warm amber accents
  - Light theme: soft parchment whites (`#f7f2e8`) with sand tones
- Typography: Lora (headings), JetBrains Mono (task text), DM Sans (UI)
- `next-themes` integration for dark/light/system theme switching
- `ThemeToggle` component — cycles dark → light → system
- Auth.js v5 (next-auth@beta) with Drizzle adapter
  - GitHub, Discord, and Google OAuth providers (configurable)
  - Generic OIDC provider support (Authentik, Keycloak, Zitadel)
  - Database sessions stored in PostgreSQL
- Drizzle ORM schema for all core tables:
  - `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js adapter)
  - `topics`, `tasks`, `task_completions`
  - `wishlist_items`
  - `achievements`, `user_achievements`
- PostgreSQL 18 integration via `pg` driver + Drizzle ORM
- Zod-validated environment variable wrapper (`lib/env.ts`)
- `Navbar` component with app name (Lora font), theme toggle, user avatar, sign-out
- `Sidebar` component with navigation links and active state highlighting
- Login page with styled OAuth provider buttons
- Dashboard shell with greeting, daily quest placeholder, quick stats
- Placeholder pages for Tasks, Topics, Wishlist
- Docker Compose setup (app + PostgreSQL 18)
- Multi-stage Dockerfile with non-root user (`nextjs:1001`)
- `drizzle.config.ts` — Drizzle Kit configuration
- `.env.example` with all environment variables documented
- `docs/environment-variables.md` — full env var reference
- `docs/database.md` — schema overview and migration instructions
- `docs/oauth-setup.md` — provider setup guide (GitHub, Discord, Google, OIDC)
- `docs/api.md` — API route reference (Auth.js routes)
- `docs/deployment.md` — Docker Compose deployment guide

**Phase 5 – Wishlist & Budget**

- `lib/wishlist.ts` — full wishlist business logic:
  - `getUserWishlistItems` — list all items (OPEN first by priority, then history)
  - `createWishlistItem` — create new wishlist item
  - `updateWishlistItem` — partial update (ownership-gated)
  - `markAsBought` — set status to BOUGHT (purchase history)
  - `unmarkAsBought` — revert BOUGHT → OPEN (undo)
  - `discardWishlistItem` — set status to DISCARDED (archive)
  - `deleteWishlistItem` — permanent delete (ownership-gated)
  - `getBudgetSummary` — monthly budget + spent this month + remaining
  - `updateMonthlyBudget` — update or clear the user's monthly budget
- Zod validators for wishlist (CreateWishlistItemInputSchema, UpdateWishlistItemInputSchema, UpdateBudgetInputSchema)
- API routes:
  - `GET/POST /api/wishlist` — list items + budget / create item
  - `PATCH/DELETE /api/wishlist/:id` — update / permanently delete item
  - `POST/DELETE /api/wishlist/:id/buy` — mark bought / undo
  - `POST /api/wishlist/:id/discard` — archive item
  - `GET/PATCH /api/settings/budget` — get or update monthly budget
- UI components:
  - `WishlistCard` — item card with price, priority badge, affordability indicator, coin-unlock indicator, action buttons
  - `WishlistForm` — modal for create/edit (title, price, URL, priority, coin threshold)
  - `BudgetBar` — animated (Framer Motion) budget progress bar with inline edit
  - `WishlistView` — full interactive page client component managing all state
- Wishlist page (`/wishlist`) fully implemented, replacing Phase 5 placeholder
- Affordability indicator (green/red based on remaining monthly budget)
- Coin-unlock indicator (shows coins needed when threshold is set)
- Purchase history section (collapsed by default, shows bought + discarded items)
- Bought items shown with green left border and "Bought" badge
- Discarded items shown with 50% opacity and strikethrough title

[Unreleased]: https://github.com/jp1337/momo/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/jp1337/momo/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/jp1337/momo/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/jp1337/momo/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/jp1337/momo/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/jp1337/momo/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/jp1337/momo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/jp1337/momo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jp1337/momo/releases/tag/v0.1.0
