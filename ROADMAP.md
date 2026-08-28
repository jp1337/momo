# Momo — Roadmap

Kein Feature-Backlog. Ein ehrlicher Blick auf das Projekt und was als nächstes wirklich zählt.
Was bereits gebaut wurde, steht im [CHANGELOG](CHANGELOG.md).

---

## Wo Momo heute steht

Momo hat eine starke Seele: *eine Aufgabe pro Tag, kein Overwhelm, du schaffst das.*
Das technische Fundament ist solide — Self-hostable, GDPR-ready, sieben Sprachen, full API.

Die Vereinfachungs-Phase ist durch: Quick-Add überall, Navigation konsolidiert, keine
`window.confirm`-Dialoge mehr. Die Codebase ist dabei erstaunlich disziplinert geblieben —
kein einziges `TODO`, kein `ts-ignore`, **1728 Unit-Tests** und 13 E2E-Specs. Jedes große Modul in
`lib/` ist von Tests abgedeckt. Das ist die gute Nachricht.

Die schlechte war: **das Fundament hat gebröckelt, während vorne poliert wurde.** 19 Dependabot-PRs
hatten sich angestaut, und mit ihnen 75 offene Security-Alerts (3 critical, 36 high). Das ist mit
0.6.0 abgeräumt — **`npm audit` steht bei 1** (ein `@babel/core`-Low), 0 offene Dependency-PRs, und
die Ursachen sind weg statt nur die Symptome: Renovate ersetzt Dependabot, Rate-Limiting deckt alle
70 Mutation-Handler ab, Read-only-Keys sind es tatsächlich.

Was diese Phase gelehrt hat, steht nicht in der Alert-Zahl: **die Hälfte der behobenen Befunde stand
nicht auf dieser Liste.** Sie kam durch die Reviews der geplanten Arbeit ans Licht — drei Routen ohne
Readonly-Gate, ein Endpunkt, dessen Dokumentation seit jeher etwas anderes behauptete als sein Code
tat, zwei ungeschützte Handler hinter einer Datei-basierten Zählung. Und dreimal war der Defekt
derselbe Typ: *ein Dokument, das eine Sicherheitseigenschaft behauptet, die der Code nicht hat.* Ein
solcher Satz ist schlimmer als eine undokumentierte Lücke, weil er die nächste Prüfung abhält.

Die nächste Phase heißt deshalb: **verbreiten, polieren** — absichern ist durch.

---

## Die drei Themen

### 1. Absichern — das Fundament halten ✅ (0.6.0, bis auf Error-Tracking)

Nicht spannend. Aber vor zwei Wochen wäre Momo als „die Self-Hosted-App mit den 36
High-Alerts" auffindbar gewesen — und genau jetzt beginnt die Verbreitungs-Phase, die
Besucher auf den Security-Tab schickt.

Die Reihenfolge war bewusst nach *Erreichbarkeit* sortiert, nicht nach Alert-Severity: was ein
Nutzer damals anfassen konnte, stand vor dem, was nur im Advisory-Feed steht. Das hat sich
ausgezahlt — der erreichbarste Punkt (Rate-Limiting) führte über seine eigenen Reviews zu den zwei
schwersten Befunden dieser Phase, die beide nicht auf der Liste standen.

Die Einträge bleiben mit ihrer Begründung stehen, statt gelöscht zu werden. Wer in einem halben Jahr
wissen will, *warum* eine Ausnahme eine Ausnahme ist, findet es hier und muss es nicht neu herleiten.
Offen ist von diesem Thema nur noch **Error-Tracking** (unten) und ein Repo-Setting: `test` als
required status check auf `main`.

**Rate-Limiting auf 70 Mutation-Handlern** ✅ (2026-08-20/21, #71, #80)

`CLAUDE.md` schreibt vor: *„Rate limiting on all mutation API routes."* Die ehrliche Einheit
dafür ist der Handler, nicht die Datei: **70 Mutation-Handler über 57 Dateien**. 17 Dateien
hatten zunächst überhaupt kein Limit; 15 davon wurden nachgezogen (`/api/cron` und
`/api/admin/seed` bleiben bewusst ausgenommen, siehe CHANGELOG). Eine reine Datei-Zählung
verdeckte dabei zwei weitere unguarded Handler, deren Datei-Nachbar bereits ein Limit hatte
— `DELETE /api/settings/webhooks/[id]` und `DELETE /api/tasks/[id]/snooze` — erst gefunden,
als der Invariant-Test auf Handler- statt Datei-Granularität umgestellt wurde. Authentifiziert
waren alle Routen bereits korrekt — es fehlte nur die Bremse, nicht die Tür. Am meisten hätten
wehgetan:

- `app/api/wishlist/[id]/buy/route.ts` — bucht **atomar Coins ab**. Eine ungebremste
  Schreiboperation direkt auf dem Währungssystem.
- `app/api/auth/link-request/route.ts` — konnte unbegrenzt `linking_request`-Records erzeugen.

Das stand hier oben, weil es der einzige Befund auf dieser Seite war, den ein
authentifizierter Nutzer damals tatsächlich anfassen konnte. Das Muster dafür existierte
schon (`checkRateLimit` / `rateLimitResponse` aus `lib/rate-limit`, siehe
`app/api/settings/calendar-feed/route.ts` als Vorbild) — es war konsistentes Nachziehen,
kein Neubau.

Die Auth-Lage selbst war sauber: `/api/cron` ist per `CRON_SECRET` mit `timingSafeEqual`
geschützt, `calendar-feed` hinter `resolveSessionOnlyApiUser` (Bearer-Aufrufer werden für die
Mutationen dort seit #78 ganz zurückgewiesen). Es fehlte nur die Bremse, nicht die Tür.

**nodemailer 8 → 9** ✅ (2026-08-21, #72) — vier von fünf Alerts, alle nicht erreichbar

Von den fünf offenen Dependabot-Alerts gehören **vier** zu `nodemailer` (im Projekt steht
`^8.0.7`). `npm audit` fasst sie zu einem Paket-Eintrag zusammen und zeigt deshalb nur „2" —
GitHub listet jedes Advisory einzeln:

| Severity | Advisory |
| --- | --- |
| **HIGH** | Message-level `raw`-Option umgeht `disableFileAccess` / `disableUrlAccess` |
| MEDIUM | Improper TLS Certificate Validation im OAuth2-Token-Fetch |
| MEDIUM | CRLF-Injection in `List-*`-Header-Kommentaren |
| MEDIUM | `jsonTransport` umgeht `disableFileAccess` / `disableUrlAccess` |

**Wichtig für die Einordnung: keiner dieser vier Pfade ist in Momo erreichbar.** Es gibt im
ganzen Projekt genau einen `sendMail`-Aufruf (`lib/notifications.ts:314`), und der setzt
ausschließlich `from`, `to`, `subject`, `text` und `html`. Eine Suche über den Mail-Code
findet **null** Vorkommen von `raw`, `attachments`, `jsonTransport`, `oauth2`,
`disableFileAccess` oder `disableUrlAccess`. Konkret:

- **`raw`-Bypass (HIGH)** — Momo übergibt kein `raw` und nutzt überhaupt keine Attachments.
- **OAuth2-TLS** — die SMTP-Auth läuft über `SMTP_USER` / `SMTP_PASS`, nicht über OAuth2.
- **CRLF in `List-*`** — Momo setzt kein einziges `List-*`-Header.
- **`jsonTransport`** — Momo nutzt einen echten SMTP-Transport über `host` / `port`.

Momo hat außerdem keinen Email-Auth-Provider: die Provider sind GitHub, Discord, Google,
MicrosoftEntraID, Keycloak und Credentials. Die `verificationTokens`-Tabelle existiert nur,
weil der Drizzle-Adapter sie im Schema verlangt — kein Provider nutzt sie. nodemailer
transportiert also ausschließlich Notification-Mails, nicht Auth.

Der Grund, es trotzdem zu tun, ist ein anderer: es räumt **vier der fünf Alerts** auf einen
Schlag ab, und die Verbreitungs-Phase schickt Besucher auf den Security-Tab des Repos. Das
ist ein Reputations- und Hygiene-Argument, kein Sicherheits-Notfall. Danach bleibt nur noch
der `@babel/core`-Low übrig.

Der Fix verlangte einen Major-Bump, und `.github/dependabot.yml` ignorierte pauschal *jeden*
Major für *jedes* Paket. Dieser Fix wäre also **strukturell nie als PR erschienen** — er kam von
Hand. Die Ursache ist inzwischen weg (siehe Renovate unten); bemerkenswert ist, dass Renovate den
Advisory binnen Minuten nach der Installation von selbst aufmachte, inklusive beider Pin-Stellen.

Die Falle dabei war die doppelte Pinnung: `nodemailer` stand **zweimal** in `package.json` — als
Dependency und als `overrides`-Eintrag, beide auf `^8.0.7`. Der Override pinnt die 8.x-Linie über
den ganzen Abhängigkeitsbaum; wer nur die Dependency hebt, wird still zurückgezogen. Beide Stellen
stehen jetzt auf `^9.0.5`, `npm ls nodemailer` zeigt kein 8.x mehr im Baum.

Offen bleibt die eine Prüfung, die keine Maschine übernehmen kann: **der echte SMTP-Versand ist
nicht verifiziert.** `nodemailer` ist in allen Tests `vi.mock`-ersetzt, eine grüne Suite beweist
hier nur, dass Typen und Aufrufformen passen. Der Pfad dafür existiert — Settings → Notifications →
E-Mail-Kanal → Test.

**next 16.3.1** ✅ (2026-08-20, #65)

Hat zwei der drei verbleibenden High-Alerts auf einen Schlag geschlossen: `next` selbst und
das gebündelte `sharp` (libvips-CVEs). Damit steht `npm audit` bei **2** — nur noch nodemailer
(siehe oben) und ein `@babel/core`-Low. Nebenwirkung: `eslint-config-next` 16.3.1 bringt die
neue Regel `@next/next/no-location-assign-relative-destination` mit und markiert damit zwei
vorbestehende Stellen, die `window.location.href` für interne Navigation nutzen —
`components/auth/passkey-login-button.tsx:62` und
`components/auth/passkey-second-factor-button.tsx:52`. Beides Warnungen, keine Errors.

**Passkey-Navigation** ✅ (2026-08-21, #74) — und hier lag die Roadmap falsch. Sie schrieb „der Fix
ist `useRouter().push()`". Das wäre eine Regression gewesen: die markierte Zeile trug einen
Kommentar, der den Full Reload begründete — das `fetch` davor tauscht das Session-Cookie, und
`/dashboard` wird serverseitig daraus gerendert. Ein blankes `push()` kann aus dem Router-Cache
bedient werden und liefert dann ein Dashboard für die Session *vor* dem Login, was den Nutzer
zurück auf die Login-Seite wirft. Der richtige Fix ist `router.refresh()` **vor** `router.push()`.
Dass keine E2E-Spec den Passkey-Login abdeckt, bleibt eine echte Lücke — die Verifikation war
manuell.

**Dependabot durch Renovate ersetzt** ✅ (2026-08-21, #73)

Nicht repariert, ersetzt. Die vier Ursachen des Staus steckten alle in einer Datei, und Renovate
löst drei davon *strukturell* statt per einmalig richtig gesetzter Config:

- `open-pull-requests-limit: 10`, während Security-Updates die Gruppierung umgingen — so entstanden
  zwölf einzelne PRs auf derselben `package-lock.json`, die sich bei jedem Merge gegenseitig
  invalidierten. Renovate behandelt Vulnerability-PRs mit denselben `packageRules` und Limits.
- Majors global ignoriert → deshalb musste der nodemailer-Fix von Hand kommen. Renovate trennt sie
  in eigene PRs *und* listet sie im Dependency Dashboard, wo ein hängender Major sichtbar ist statt
  abwesend.
- `github-actions` ohne Gruppierung → jetzt ein gruppierter PR.
- **`alexa-skill/` hatte gar keinen Eintrag** — Renovate findet Package-Files selbst, der Fehler ist
  damit nicht mehr möglich. Neu abgedeckt sind außerdem `Dockerfile` und `docker-compose.yml`.

Dazu `lockFileMaintenance`, wofür es bei Dependabot keine Entsprechung gibt. Automerge-Politik:
devDependencies mergen Patch und Minor selbst, Runtime-Dependencies nur Patches, Runtime-Minors und
alle Majors bleiben Handarbeit. Postgres-Majors sind explizit gesperrt.

**Diese Falle ist seit 2026-08-21 zu** — und sie war tiefer als hier beschrieben. Notiert war
„`main` hat keine required status checks"; dazu kam, dass `lint` und `next build` bei einem Pull
Request **gar nicht liefen**. `build-and-publish.yml` triggert nur auf `push: main`, berichtete also
erst nach dem Merge. Es fehlte damit nicht nur die Pflicht, den Check zu bestehen, sondern der Check
selbst.

Beides ist erledigt: die beiden Jobs leben jetzt in `test.yml` („PR Gate"), das auf `pull_request`
läuft, und `lint`, `build` und `test` sind required status checks auf `main` (nicht-strict,
`enforce_admins` bleibt an). `build-and-publish.yml` durfte den Trigger nicht bekommen — sein
`deploy`-Job läuft auf einem Self-hosted-Intranet-Runner in einem öffentlichen Repo, und
`pull_request` würde daraus Codeausführung aus jeder Fork-PR machen. Der Kommentar dort verweist
jetzt auf den richtigen Ort.

Warum `build` und nicht nur `test` required ist: der `magic-string`-v1-Override ließ **alle 1728
Tests grün** und brach `next build`. Eine Suite prüft die Build-Toolchain nicht — der Build braucht
sein eigenes Gate.

**Read-only API-Keys waren nicht read-only** ✅ (2026-08-21, #77, #78)

Stand nicht auf dieser Liste — gefunden als Nebenbefund beim Review des Rate-Limitings. Fünf
Mutation-Routen prüften das Readonly-Flag nicht. Die schlimmste: `DELETE /api/user/api-keys/[id]`
ließ einen Read-only-Key **API-Keys widerrufen**, während `POST` auf derselben Ressource korrekt
gegated war. Ein Credential, dessen Zweck es ist, gefahrlos weitergegeben werden zu können, konnte
die Credentials um sich herum zerstören.

Zwei der fünf lagen in `/api/settings/calendar-feed`, und dort war der Befund schärfer: der Docstring
der Route behauptete seit jeher *„Bearer/API-key callers are rejected"*, während der Code sie annahm
und dabei sogar vom 2FA-Gate befreite. Ein Read-only-Key konnte einen Feed-Token erzeugen, der
unauthentifizierten Dauerlesezugriff auf die Metadaten aller Aufgaben gewährt. Gefixt, indem die
dokumentierte Absicht endlich implementiert wurde — Breaking Change für programmatische Aufrufer.

**Error-Tracking**

GlitchTip (self-hostbar) oder Sentry. `app/error.tsx:25` hat bis heute nur einen Kommentar,
wo der Aufruf hingehört. Ohne das erfährt man von Produktionsfehlern durch Nutzer-Mails —
und die schreibt niemand, der prokrastiniert. Gehört hierher, weil es die Voraussetzung
dafür ist, überhaupt zu *wissen*, ob Momo bei Fremden funktioniert.

---

### 2. Verbreiten — Momo bekannt machen

Mehr Features bringen nichts, wenn niemand Momo kennt. Bei 6 Stars ist das nach wie vor
der größte Hebel.

**awesome-selfhosted — Termin korrigiert: ab 22.09.2026**

Die alte Roadmap nannte „frühestens Aug 2026". Das war zu optimistisch: die Richtlinie
verlangt ein Projektalter von sechs Monaten, und das Repo wurde am **22.03.2026** erstellt.
Eligibility ist damit der **22.09.2026** — etwa ein Monat hin.

Das ist keine Verzögerung, sondern eine Vorbereitungsphase. Bis dahin: Einreichung
vorschreiben, Demo-Instanz stabil halten, Screenshots aktualisieren, und die Punkte aus
Thema 1 abarbeiten. Ein Listing, das Besucher auf ein Repo mit 36 High-Alerts schickt,
ist schlechter als kein Listing.

**Backlinks aufbauen — der eigentliche SEO-Hebel**

Unverändert der Kern. Targets in Reihenfolge der Wichtigkeit:

- **r/selfhosted** — Showcase-Post mit Screenshots + Docker-Compose-Snippet, ehrliche Story
  („self-hosted task manager für ADHS-Nutzer"). Beste Zeiten Mo–Mi morgens EU-Zeit
- **r/selfhostable**, **r/opensource**, **r/ProductivityApps**, **r/ADHD** (dort nur dezent,
  strikte Self-Promo-Regeln)
- **HackerNews Show HN** — „Show HN: Momo, self-hosted task manager for ADHD", Wochenende
  oder Sonntagabend US-Zeit
- **awesome-selfhosted-data** PR (das Daten-Repo, nicht die Webseite) — ab 22.09.2026
- **awesome-stars Listen** auf GitHub — viele kuratieren „awesome ADHD tools" oder
  „awesome productivity"
- **Lobste.rs** wenn Invite vorhanden
- **dev.to / hashnode** über Engineering-Themen aus Momo („How we built energy-aware task
  scheduling", „Radix UI vs custom components") — bringt indirekt Backlinks zur Live-Demo
- **Product Hunt** — einmaliger größerer Push, gut planbar
- **GitHub README Badges** für jede Verlinkung → reziprozierter Backlink

**alternativeto.net** ✅ — Listing seit 2026-04-29, 9 Alternativen verlinkt.
**GitHub-Präsenz** ✅ — CONTRIBUTING.md, Topics, README-Contributing-Sektion.
**Ein kurzes Video** ❌ gestrichen — ein gut platzierter Reddit-Post mit Screenshots wirkt
nachhaltiger als ein Demovideo, das selten geteilt wird.

---

### 3. Polieren — den Kern besser machen

Nach wie vor richtig, nur nicht zuerst. Neue Features bringen nichts, wenn das Bestehende
nicht überzeugt.

**Der Aha-Moment für neue Nutzer**

Sieht ein neuer Nutzer die komplette Schleife — Quest → Energy-Check-in → Task erledigt →
Coins verdient → Wishlist — noch am ersten Tag? Wenn nicht, kommt er nicht zurück.
Dashboard-Empty-State mit CTA existiert seit 0.4.0; der Abschluss-Moment im Onboarding
seit 0.5.0. Was fehlt, ist die Messung: erlebt jemand die Schleife *wirklich*?
Hängt an Error-Tracking und minimaler Nutzungs-Telemetrie aus Thema 1.

**Daily Quest Algorithm**

Der Quest-Algorithmus ist das Herzstück. `lib/daily-quest.ts` ist von sieben Testdateien
abgedeckt, funktioniert also nachweisbar wie spezifiziert. Die offene Frage ist nicht
Korrektheit, sondern *Gefühl*: fühlt sich die ausgewählte Quest immer sinnvoll an — oder
manchmal zufällig? Keine Code-Änderung nötig, aber: bewusst benutzen und beobachten.

**Insights statt Daten**

Best-Day-Insight-Chip existiert seit 0.4.0 (ab ≥10 Erledigungen). Der Ansatz trägt weiter:
kleine, kontextuelle Hinweise auf dem Dashboard machen bestehende Daten nützlicher, ohne
neue Seiten zu bauen. „Dein stärkster Wochentag ist Dienstag" ist mehr wert als ein
Balkenchart.

---

## Was wir bewusst nicht tun

- Keine neuen Toplevel-Seiten
- Keine weiteren Notification-Typen oder -Kanäle
- Keine weiteren Auth-Provider
- Keine KI-Features ohne klaren Nutzen für procrastination-geplagte User
- Kein Feature, das eine weitere Entscheidung vom Nutzer verlangt

Das ist keine Freeze — neue Features sind willkommen, wenn sie *Friction reduzieren*,
nicht wenn sie Funktionsumfang erhöhen.

---

## Offene technische Schulden

**OpenAPI-Spec-Drift, von keinem Test bewacht**

`lib/openapi.ts` sind 3715 handgepflegte Zeilen, und **keine einzige Testdatei importiert
sie**. Dokumentiert sind 42 von 67 API-Routen. Das Gute: null Geister-Endpunkte — es steht
nichts Falsches drin. Das Fehlende: Webhooks (3 Endpunkte), Push-Devices (2), 2FA (5) und
Passkeys (7) existieren im Swagger-UI überhaupt nicht. „Full API" ist ein Verkaufsargument
im README.

Der eigentliche Fix ist nicht „25 Endpunkte nachdokumentieren", sondern **ein Test, der
Spec gegen `app/api/**/route.ts` abgleicht** und bei Drift fehlschlägt. Sonst ist die Lücke
in drei Monaten wieder da.

**Das ist mit 0.6.0 vom kosmetischen zum dringenden Posten geworden** — und damit der wichtigste
offene Punkt dieser Liste. Während der Härtungsarbeit hat die Spec zweimal etwas Falsches behauptet:
sie versprach ein `429` auf einer Route ohne Limit, und sie enthielt **zwei tote `$ref`s** auf eine
`RateLimited`-Komponente, die nie existiert hat — eine Spec, die an der Stelle schlicht nicht
auflöst, jahrelang unbemerkt. Beides wurde nicht durch einen Test gefunden, sondern weil jemand
hingesehen hat. Der Beweis, dass der Test billig ist: ein ~40-zeiliges Skript, das Handler-Guards
gegen die dokumentierten Response-Codes abgleicht, fand beide Befunde in einem Lauf. Dieses Skript
*ist* der fehlende Test — er muss nur noch in `__tests__/` einziehen.

Ein Muster dafür existiert seit 0.6.0 im Repo: `__tests__/api-rate-limits.test.ts` läuft über
`app/api/**/route.ts`, zerlegt jede Datei in ihre Handler-Regionen und prüft pro Handler statt pro
Datei. Genau diese Granularität ist der Punkt — die erste Fassung prüfte pro Datei und übersah
dadurch zwei ungeschützte Handler, deren Datei-Nachbar bereits ein Limit hatte.

**Offline-Queue**

Tasks offline erfassen via PWA Service Worker Background Sync. Aktuell kein
`BackgroundSync`-Code im Projekt. Passt zur Zielgruppe (Aufgabe notieren, wenn sie
einfällt — auch im Funkloch), ist aber echte Arbeit und kein Quick Win.

**Kleinigkeiten**

- `lib/openapi.ts` (3715 LOC) und `components/tasks/task-list.tsx` (1467 LOC) sind die
  beiden Dateien, bei denen Aufteilen sich am ehesten lohnt.

**Neu auf dieser Liste, aus 0.6.0 heraus**

- **Die 20 Route-Test-Mocks von `readonlyKeyResponse` kennen den neuen `code` nicht.** Sie stubben
  `{ error, message }` ohne `code: "READONLY_KEY"`, sodass der Code an genau einer Stelle geprüft
  wird — eine Regression im echten Helper würde kein Route-Test bemerken.
- **Drei Handler liefern 403, ohne es in der Spec zu dokumentieren**: `POST /api/auth/sessions/revoke-others`,
  `DELETE /api/auth/sessions/{id}`, `PATCH /api/settings/vacation-mode`. Fällt weg, sobald der
  Drift-Test oben existiert.
- **Sechs Tests in `__tests__/webhooks.test.ts`** warten mit festem `setTimeout(r, 300)` auf denselben
  fire-and-forget-Insert, für den es seit 0.6.0 einen sauberen Helper gibt (`waitForEndpointDelivery`).
  Nie rot gesehen, aber dasselbe Rennen mit großzügigerem Puffer — und der Umbau spart ~2 s Laufzeit.
- **Rate-Limits sind pro Prozess**, und `deploy/examples/deployment.yaml` fährt `replicas: 2`. Jedes
  Limit gilt auf der empfohlenen Topologie faktisch doppelt. Steht so im Header von
  `lib/rate-limit.ts`, aber nicht in der API-Doku.
- **Zehn Komponenten rufen `setState` synchron in einem Effect** (`react-hooks/set-state-in-effect`):
  `layout/quick-add-modal.tsx:53`, `onboarding/steps/notification-step.tsx:29`,
  `settings/linked-accounts.tsx:66`, `settings/notification-history.tsx:103`,
  `settings/notification-settings.tsx:114`, `settings/push-devices-section.tsx:163`,
  `settings/timezone-settings.tsx:97`, `tasks/task-form.tsx:145`, `topics/topic-form.tsx:97`,
  `wishlist/wishlist-form.tsx:83`. Jede Stelle kostet einen zusätzlichen Render-Pass.
  Aufgetaucht sind sie nicht durch Hinsehen, sondern weil `eslint-plugin-react-hooks` 7.1 die
  Regel von opt-in auf `error` gezogen hat — zehn rote Dateien aus einem Lockfile-Refresh, der
  keine Zeile Anwendungscode anfasst. Die Regel steht deshalb in `eslint.config.mjs` bewusst auf
  `warn`: der Fix ist ein Umbau des State-Flusses in zehn Komponenten und gehört in einen eigenen
  PR, nicht in einen Dependency-Sweep. Solange sie `warn` ist, steht sie in jedem Lint-Lauf —
  ein Pin auf 7.0.1 wäre still gewesen.
- **TypeScript 7 ist blockiert, aber nicht an uns.** `tsc --noEmit` läuft mit 7.0.2 sauber durch und
  `next build` auch — der Blocker ist `typescript-eslint`, das mit
  `Error: typescript-eslint does not support TS 7.0` hart abbricht und damit `npm run lint`
  komplett tötet. Grund: TS 7 ist der Go-Port und stellt noch keine stabile programmatische API
  bereit; die ist für 7.1 angekündigt. Wiedervorlage, sobald `typescript-eslint` TS 7 unterstützt —
  die tsconfig des Hauptprojekts ist bereits 7-tauglich (`moduleResolution: bundler`, kein
  `baseUrl`, kein `downlevelIteration`, kein `target: es5`).
  Der Guard in `typescript-eslint/dist/index.js` ist ein unbedingtes `throw` bei
  `ts.versionMajorMinor >= 7` — keine Env-Var, kein Flag, und auch die Canary
  (`8.67.1-alpha.24`) deklariert noch `typescript >=4.8.4 <6.1.0`. Es gibt kein `typescript-eslint`
  v9. Der von Microsoft dokumentierte Side-by-side-Weg über `@typescript/typescript6` (existiert,
  6.0.2) wurde ebenfalls probiert: npm-`overrides` auf die acht Pakete, die `typescript` als *Peer*
  deklarieren, erzeugen keine verschachtelte Installation — `require("typescript")` landet weiter
  auf dem Root-TS-7 und der Throw feuert. Umgekehrt aufzusetzen (TS 6 als `typescript`, TS 7 unter
  anderem Namen) würde `next build` mit TS 6 typprüfen und damit den Zweck aufheben. Wiedervorlage
  an `typescript-eslint` Issue #10940, das TS >= 7.1 verfolgt.
- **`eslint-plugin-react` 7.37.5 ruft weiter das entfernte `context.getFilename()`** — nur trifft
  es uns nicht mehr. Der Aufruf sitzt in `detectReactVersion`, und der läuft ausschließlich, wenn
  `settings.react.version` auf `"detect"` steht, was `eslint-config-next` so ausliefert.
  `eslint.config.mjs` setzt die Version jetzt explizit (aus `react/package.json` gelesen), damit
  die Erkennung nie anläuft. 7.37.5 ist die neueste Version des Plugins und deklariert nur bis
  `eslint ^9.7` — dieser Workaround kann also wegfallen, sobald das Plugin nachzieht oder
  `eslint-config-next` es fallen lässt. Bis dahin ist die explizite Version ohnehin die schnellere
  Variante: kein Dateisystem-Probe pro geprüfter Datei.
- **`alexa-skill/` hat keine eigene eslint-Config, und niemand hat es gemerkt.** `npm run lint`
  dort fällt auf die Root-`eslint.config.mjs` zurück — die Next.js-Config — und meldet folgerichtig
  „Pages directory cannot be found". Der Lambda-Code wird also gegen React-/Next-Regeln geprüft
  statt gegen Node-Regeln. Konsequenz: die beiden devDependencies
  `@typescript-eslint/eslint-plugin` und `@typescript-eslint/parser`, die das Projekt installiert,
  werden **von keiner Config referenziert** — Renovate hat sie zuletzt brav auf 8.67.0 gehoben, für
  einen Linter, der so nicht existiert. Dazu ist `--ext .ts` im Lint-Skript unter eslint 9 Flat
  Config bedeutungslos. Fix ist eine eigene `alexa-skill/eslint.config.mjs` mit
  `typescript-eslint` — dann werden die beiden Pakete echt und das Skript prüft, was es zu prüfen
  behauptet.

**Aus der Lichtkegel-Phase 2 (2026-08-28) — gefunden, bewusst nicht behoben**

Elf Funde, jeder außerhalb jedes Task-Zuschnitts der Phase. Der Phasenbericht steht in
`docs-tech/lichtkegel-phase2/abschluss.md`, die Messung dahinter in
`docs-tech/lichtkegel-phase2/zustandspruefung.md`.

*Die Testinfrastruktur beißt sich selbst*

`e2e/wishlist.spec.ts:81-91` legt eine Fixture mit `coinUnlockThreshold: 500` an und löscht sie
**inline**; die Datei hat kein `afterEach`. Schlägt irgendeine Assertion davor fehl, bleibt die
Zeile dauerhaft in der Datenbank — und ab da scheitern zehn Assertions in zwei *anderen*
Spec-Dateien für immer. Während dieser Phase zweimal passiert.

Ein `afterEach` behebt aber nur die Hälfte: die Assertions sind ganzkörperliche
`not.toContainText(/500/i)`-Prüfungen und kollidieren mit **Produktdaten** —
`lib/gamification.ts:277` (`coins_500`, „500 Coins gesammelt"), `:334` (`tasks_500`,
„500 Aufgaben erledigt") und `:75` (`minCoins: 500`). Jede Seite, die die Errungenschaftsliste
rendert, ist damit für jedes Konto dauerhaft rot. Die Assertion muss eng gezogen oder abgeschafft
werden.

*Die Messung selbst hat drei Löcher* (Belege in `zustandspruefung.md`)

| Lücke | Folge |
|---|---|
| Die Suite interagiert nie | `e2e/design-rules.spec.ts` und `e2e/helpers/design-count.ts` enthalten kein `click`, `hover`, `press`, `focus`, `fill`. Jeder eingeklappte Abschnitt, jedes geschlossene Menü, jedes Modal ist unmessbar — **10 von 19 dahinterliegenden Zuständen sind rot.** |
| Die Ratsche liest kein CSS | `scripts/check-design-tokens.mjs:141` sammelt nur `.tsx`, `scripts/design-baseline.json` hat null `.css`-Einträge. `app/globals.css` definiert jedes Token und wurde von der Ratsche nie geöffnet. |
| Phasen sind nach Seiten geschnitten, die Verstöße sitzen in Bauteilen | Neun der zwölf Funde der Zustandsprüfung gehören **keiner** Phasenliste: Formulare, Menüs, Leisten, ein globaler Fokusstil. Sie zuzuordnen ist eine Planungsentscheidung, keine Aufräumarbeit. |

Der amber Fokusring (`app/globals.css:541-547`: `outline: 2px solid var(--accent-amber)` plus
6-px-Halo, dazu `border-radius: 4px` außerhalb der vier Stufen) liegt im blinden Fleck aller drei
gleichzeitig: die Ratsche liest die Datei nicht, `countAmber` liest kein `outline-color`, die Suite
fokussiert nie. **Gebaut wurde er als AAA-Kontrastmaßnahme** — ihn zu entfernen verlangt einen
ebenso sichtbaren Ersatz und ist damit eine Spec-Entscheidung.

*i18n — `check:i18n` prüft nur eine Richtung*

Das Skript verifiziert *referenziert ⇒ vorhanden*, nie umgekehrt. Beide Gegenrichtungen fehlen:

- **Verwaiste Keys.** In der Phase wurden 18 Keys ohne jede Code-Referenz gezählt, in allen sieben
  Locale-Dateien vorhanden. Ein grober Nachscan listet 132 Kandidaten — die meisten davon aber per
  Template-Literal konstruiert (`closure.quote_${n}`, `templates.<x>.task_N`,
  `progress.tab_${id}`). Die echte Zahl braucht einen Scan, der Template-Literale versteht, und
  **keine Löschung auf Verdacht**: eine falsche Löschung ist genau das, was `check:i18n` nicht
  bemerkt. Ein neunzehnter kam im Schlussreview dazu: `quick.empty_title` verlor seine einzige
  Referenz, als `five-minute-view.tsx`s Leerzustand zu einem `EmptyState` wurde, der nur
  `empty_subtitle` zeigt — `t("empty_title")` in `components/focus/focus-mode-view.tsx:124` ist ein
  anderer Namensraum (`focus`, nicht `quick`).
- **Hartkodiertes Deutsch.** `components/layout/user-menu.tsx` liefert fünf deutsche Labels in
  einer Sieben-Sprachen-App: `Statistiken` (:152), `Wochenrückblick` (:155), `Einstellungen`
  (:158), `Admin` (:170), `Abmelden` (:192). Die Datei importiert `useTranslations("nav")` und ruft
  `t(` genau dreimal. Jede nicht-deutsche Nutzerin liest heute ein deutsches Menü. `check:i18n` ist
  blind dafür, weil diese Strings nie durch `t()` gehen. Kosten: fünf Keys × sieben Locales.
  Dasselbe eine Ebene tiefer im **Errungenschaftskatalog**: `lib/gamification.ts` hält Titel und
  Beschreibung jeder Errungenschaft als deutsche Literale, sodass `/progress?tab=achievements`
  bei Locale `en` „Erstes Wunschlisten-Item gekauft" anzeigt (im Chrome-Review der Phase gesehen).

*Drei Kleinigkeiten, jede in einer fremden Datei*

| Ort | Befund |
|---|---|
| `components/wishlist/wishlist-view.tsx:426-436` | Der Verlaufs-Umschalter zählt nur die gekauften Wünsche (`Verlauf (1)`), klappt aber gekaufte **und** verworfene auf. Vorbestehend, identisch bei `84c4871`. |
| `components/stats/weekday-chart.tsx:43` | Das `aria-label` ist nicht auf `hasData` gegattert, anders als jeder andere „bester Tag"-Verbraucher derselben Datei. In einer Nullwoche liest ein Screenreader „Bester Tag: Mo — 0 Abschlüsse" vor — einen besten Tag, den die sichtbare Oberfläche absichtlich unterdrückt. Fix: ``aria-label={hasData ? `${bestDayLabel}: ${labels[bestIdx]} — ${bestDayCount}` : bestDayLabel}``. |
| `app/(app)/wishlist/loading.tsx` | Zentrierte `max-w-[var(--measure)]`-Spalte, während die Seite dahinter ein `PageFrame` mit Rand ist — über 1100 px springt die Überschrift nach links, sobald der Inhalt da ist. `/tasks`' Skeleton ist ebenfalls unmigriert, ein Hausmuster gibt es also noch nicht. |

**Aus dem Schlussreview des ganzen Branches (2026-08-28)** — gefunden, bewusst nicht behoben.
Details und Begründung stehen in `docs-tech/lichtkegel-phase2/abschluss.md`.

- **Der Seitenkopf springt bei drei von vier Tab-Wechseln.** Zwei Tabs können randlos sein —
  `habits-tab.tsx` und `review-tab.tsx:94` (`const rail = !hasRail ? undefined : (`) geben
  `rail={undefined}` zurück, sobald ihre Randsummen 0 sind; `achievements-tab.tsx` und
  `stats-tab.tsx` bauen ihren Rand dagegen unbedingt und sind immer gerandet. `page-frame.tsx:57-60`
  zentriert (`mx-auto`) eine `max-w-[var(--measure)]`-Spalte ohne Rand und eine
  `max-w-[calc(measure+gutter+rail)]`-Spalte mit Rand — auf einem frischen Konto (keine
  Habit-Abschlüsse, keine Review-Aktivität) trifft das den Standard-Erstlauf durch die Tableiste,
  nicht nur einen Randfall. Kein Regelverstoß (`countBoxes` sieht keine Fläche), und `PageFrame` auf
  Seitenebene zu hoisten ist keine dritte Option — jeder Tab holt seine Randdaten inzwischen selbst,
  ein gemeinsamer `PageFrame` müsste alle vier Datenquellen wieder vorab laden. Entscheidung:
  festhalten, nicht beheben.
- **Zwei Geldbeträge mit unterschiedlicher Definition stehen jetzt nebeneinander.**
  `components/wishlist/budget-bar.tsx:105` zeigt `budget_this_month` aus `getBudgetSummary`
  (`lib/wishlist.ts:416-424`: `gte(wishlistItems.createdAt, startOfMonth)` — Scope ist *wann
  angelegt*, nicht *wann gekauft*); `:145` direkt darunter zeigt `budget_total_spent`, das
  `wishlist-view.tsx:132` korrekt über `status === "BOUGHT"` bildet. Wer einen im Vormonat
  angelegten Wunsch heute kauft, liest „Budget diesen Monat: €0,00 / €500,00" über „€49,99 insgesamt
  ausgegeben" direkt darunter. Das `createdAt`-Scoping ist vorbestehend — neu ist, dass die Phase
  beide Zahlen nebeneinanderstellt und den Widerspruch damit erstmals sichtbar macht. Nicht heute
  behebbar: `lib/db/schema.ts:638-661` hat weder `boughtAt` noch `updatedAt` auf `wishlistItems` —
  die fehlende Spalte ist die Voraussetzung für einen Fix.
- **`/quick` zeigt seit Task 7 keinen Münzwert mehr — bewusst hingenommen.** Der Wechsel von
  `TaskItem` zu `TaskRow` entfernte `coinValue`/`postponeCount`/`energyLevel` aus der Zeile — auf
  `/tasks` richtig, dort zieht der Münzwert in `tasks-rail.tsx` (siehe `task-row.tsx:16`).
  `app/(app)/quick/page.tsx` rendert aber ein randloses `PageFrame`; der Wert wird weiter
  serialisiert (`components/quick/five-minute-view.tsx:38`) und nur noch vom Undo-Refund-Pfad
  gelesen (`:133-134`), aber nirgends mehr angezeigt. Entscheidung: der Verlust bleibt bewusst
  hingenommen und wird nicht per Ad-hoc-Rand am Phasenende nachgerüstet — kein Spec-Auftrag dafür,
  und die Zahl existiert weiterhin auf `/tasks`. Ein `/quick`-Rand, der die Münzsumme der Session
  zeigt, wäre die naheliegende Erweiterung.

| Ort | Befund |
|---|---|
| `components/progress/tabs/stats-tab.tsx:186,191,194` | `RAIL_LINE` wird in der Lesespalte benutzt (Abschnitt „Fortschritt"), nicht im Rand. Die eigene JSDoc der Konstante (`ui/list.tsx`) nennt sie „eine Zeile im Rand" und rechtfertigt das feste `--ink-3` damit, dass der Rand nie Amber trägt — die Zusicherung, nicht das Rendering, ist gebrochen. Fix: `META_LINE` umbenennen oder die drei Stellen inline setzen. |
| `components/progress/tabs/review-tab.tsx:106-108` und `stats-tab.tsx:129,134` | Das hartkodierte Tageskürzel `d` sitzt an drei Stellen, nicht einer — beide bauen `{n}d {label}` per JS-Konkatenation statt ICU-Nachricht. Chinesisch rendert „3d 连击 · 最佳连击 12d". Plan-vorgegeben (das Zwei-Key-Budget der Phase verbot einen neuen ICU-Key); Fix ist ein Key für alle drei Stellen. |
| `components/stats/weekday-chart.tsx:59` und `energy-week-block.tsx:222` | `role="gridcell"` ist ungültig und wirkungslos — kein `role="grid"`/`role="row"`-Elternteil, dazu innerhalb eines `role="img"`-Containers, der Kinder als reine Präsentation markiert. Bei `energy-week-block` sind die Zellen `h-3 w-3` (12px) und liegen ohnehin schon unter `countBoxes`' 12×12px-Freigrenze — die Rolle bringt dort gar nichts. Die Messvorschrift formt hier das Markup, nicht das Design. |
| `app/(app)/progress/page.tsx:44`, `app/(app)/wishlist/page.tsx:59`, `app/(app)/quick/page.tsx:111` | Kopfzeilen-Idiom driftet über drei Seiten: `gap-4` vs. `gap-2`, Untertitel/Tab-Text `--ink-2` vs. `--ink-3`. Dieselbe Absicht, jede für sich auf der Skala, aber in zwei Eigenschaften uneinheitlich. |
| `components/stats/streak-sparkline.tsx:58` | Hartkodiert englisches `aria-label="Streak history sparkline"` in einer Sieben-Sprachen-App. Vorbestehend (identisch bei `c4889dd`), aber diese Phase hat dieselbe Datei angefasst und im selben Task das Geschwister-`aria-label` in `weekday-chart.tsx` lokalisiert — die Inkonsistenz ist jetzt auffällig. Braucht einen Key; das Zwei-Key-Budget der Phase ist ausgegeben. |
| `app/(app)/stats/page.tsx`, `app/(app)/review/page.tsx` | `redirect()` (307) statt `permanentRedirect()` (308) für einen dokumentiert dauerhaften Routenumzug. 307 ist die sicherere Voreinstellung — eine bewusste Abwägung, kein Bug. |

**Erledigt** ✅ — Automerge-Gate (`lint`, `build`, `test` sind seit 2026-08-21 required status checks auf `main`, und die beiden neuen Jobs laufen im PR-Gate-Workflow — vorher berichteten Lint und Build erst *nach* dem Merge, bei `required_status_checks: null`) · Automatische DB-Backups (`pg_dump`-Cronjob, `profiles: [backup]`, seit
0.4.0) · E2E-Tests (Playwright, 13 Specs, seit 0.4.0) · Dependency-Stau aufgelöst
(19 → 0 offene PRs, 75 → 1 Alert, 2026-08-20) · next 16.3.1 (#65) · Rate-Limiting auf allen
70 Mutation-Handlern (#71, #80) · nodemailer 9 (#72) · Renovate statt Dependabot (#73) ·
Passkey-Navigation (#74) · Read-only-Gates (#77, #78) · Flaky Webhook-Test — der Test rannte
gegen einen absichtlich nicht `await`-eten `db.insert`; er wartet ihn jetzt ab, Produktionscode
unverändert (#69, #70) · Zeitzonenblinder Streak-Test — rechnete „gestern" in UTC, während der
Code „heute" in der Nutzer-Zeitzone bestimmt, und war dadurch jede Nacht zwei Stunden lang
deterministisch rot (#79)

---

*Momo ist für die Menschen, die zu viel im Kopf haben und zu wenig auf der Liste erledigt
bekommen. Der nächste Schritt ist nicht ein neues Feature — es ist sicherzustellen, dass
das, was da ist, wirklich für diese Menschen funktioniert. Und dass es sicher genug ist,
um es Fremden zu empfehlen.*
