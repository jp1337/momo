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

**Eine Sache fehlt dafür noch, und sie ist eine Falle:** `main` hat **keine required status checks**.
Solange GitHubs Auto-Merge ausgeschaltet ist, greift Renovates eigener Mechanismus, der den
Branch-Status prüft — sicher aus Versehen, nicht aus Konstruktion. Wird Auto-Merge eingeschaltet,
mergen Patch-, Digest- und devDeps-Minor-PRs sowie der wöchentliche Lockfile-PR sofort und **ohne
einen einzigen Testlauf**, weil nichts verlangt wird. `test` gehört als required check auf `main`,
bevor die Automation scharf läuft.

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

- `components/layout/user-menu.tsx:157` verlinkt direkt auf `/review` statt auf
  `/progress?tab=review` — ein unnötiger Redirect-Hop.
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

**Erledigt** ✅ — Automatische DB-Backups (`pg_dump`-Cronjob, `profiles: [backup]`, seit
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
