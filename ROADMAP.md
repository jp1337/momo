# Momo — Roadmap

Kein Feature-Backlog. Ein ehrlicher Blick auf das Projekt und was als nächstes wirklich zählt.
Was bereits gebaut wurde, steht im [CHANGELOG](CHANGELOG.md).

---

## Wo Momo heute steht

Momo hat eine starke Seele: *eine Aufgabe pro Tag, kein Overwhelm, du schaffst das.*
Das technische Fundament ist solide — Self-hostable, GDPR-ready, sieben Sprachen, full API.

Die Vereinfachungs-Phase ist durch: Quick-Add überall, Navigation konsolidiert, keine
`window.confirm`-Dialoge mehr. Die Codebase ist dabei erstaunlich disziplinert geblieben —
kein einziges `TODO`, kein `ts-ignore`, zehn `any` auf 244 Dateien, 1684 Unit-Tests und
13 E2E-Specs. Jedes große Modul in `lib/` ist von Tests abgedeckt. Das ist die gute Nachricht.

Die schlechte: **das Fundament hat gebröckelt, während vorne poliert wurde.** 19 Dependabot-PRs
hatten sich angestaut, und mit ihnen 75 offene Security-Alerts (3 critical, 36 high). Das ist
jetzt aufgeräumt — **5 Alerts, davon 1 high, und 0 offene Dependency-PRs**. Aber es war kein
Zufall, und es kommt wieder, solange die Ursachen stehen. Vier der fünf verbleibenden Alerts
gehören zu `nodemailer` — und genau die kann Dependabot nicht liefern, weil der Fix einen
Major-Bump braucht. Keiner der vier ist in Momos Nutzung erreichbar; die Begründung steht
unten.

Die nächste Phase heißt deshalb: **absichern, verbreiten, polieren.** In dieser Reihenfolge.

---

## Die drei Themen

### 1. Absichern — das Fundament halten

Nicht spannend. Aber vor zwei Wochen wäre Momo als „die Self-Hosted-App mit den 36
High-Alerts" auffindbar gewesen — und genau jetzt beginnt die Verbreitungs-Phase, die
Besucher auf den Security-Tab schickt. Der Rest dieser Liste hält das so.

Die Reihenfolge hier ist bewusst nach *Erreichbarkeit* sortiert, nicht nach
Alert-Severity: was ein Nutzer heute anfassen kann, steht vor dem, was nur im
Advisory-Feed steht.

**Rate-Limiting auf 17 Mutation-Routen — der real erreichbare Befund**

`CLAUDE.md` schreibt vor: *„Rate limiting on all mutation API routes."* Tatsächlich haben
17 von 57 Mutation-Routen keins. Authentifiziert sind sie alle korrekt — nur ungebremst.
Die zwei, die am meisten wehtun:

- `app/api/wishlist/[id]/buy/route.ts` — bucht **atomar Coins ab**. Eine ungebremste
  Schreiboperation direkt auf dem Währungssystem.
- `app/api/auth/link-request/route.ts` — erzeugt unbegrenzt `linking_request`-Records.

Das steht hier oben, weil es der einzige Befund auf dieser Seite ist, den ein
authentifizierter Nutzer **heute tatsächlich anfassen kann**. Das Muster dafür existiert
schon (`checkRateLimit` / `rateLimitResponse` aus `lib/rate-limit`, siehe
`app/api/settings/calendar-feed/route.ts` als Vorbild) — es ist konsistentes Nachziehen,
kein Neubau.

Die Auth-Lage selbst ist sauber: `/api/cron` ist per `CRON_SECRET` mit `timingSafeEqual`
geschützt, `calendar-feed` hinter `resolveVerifiedApiUser` samt 2FA-Gate. Hier fehlt nur
die Bremse, nicht die Tür.

**nodemailer 8 → 9 — vier von fünf Alerts, alle nicht erreichbar**

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

Der Fix verlangt einen Major-Bump. `.github/dependabot.yml` ignoriert aber pauschal *jeden*
Major für *jedes* Paket:

```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

Dieser Fix wird also **strukturell nie als PR erscheinen**. Er muss von Hand kommen.

Eine Falle dabei: `nodemailer` steht **zweimal** in `package.json` — als Dependency (Zeile 49)
und als `overrides`-Eintrag (Zeile 67), beide auf `^8.0.7`. Der Override pinnt die 8.x-Linie
über den ganzen Abhängigkeitsbaum. Wer nur die Dependency auf 9 hebt, wird vom Override
still zurückgezogen und wundert sich. **Beide Stellen müssen gleichzeitig ändern** — und
danach gehört der Notification-Mail-Versand manuell verifiziert, weil `npm test` den echten
SMTP-Transport nicht abdeckt. Die Oberfläche ist dabei winzig: ein `createTransport` mit
Singleton-Cache, ein `sendMail`. Beides in `lib/notifications.ts`.

**next 16.3.1** ✅ (2026-08-20, #65)

Hat zwei der drei verbleibenden High-Alerts auf einen Schlag geschlossen: `next` selbst und
das gebündelte `sharp` (libvips-CVEs). Damit steht `npm audit` bei **2** — nur noch nodemailer
(siehe oben) und ein `@babel/core`-Low. Nebenwirkung: `eslint-config-next` 16.3.1 bringt die
neue Regel `@next/next/no-location-assign-relative-destination` mit und markiert damit zwei
vorbestehende Stellen, die `window.location.href` für interne Navigation nutzen —
`components/auth/passkey-login-button.tsx:62` und
`components/auth/passkey-second-factor-button.tsx:52`. Beides Warnungen, keine Errors;
der Fix ist `useRouter().push()`.

**`dependabot.yml` reparieren, damit der Stau nicht wiederkommt**

Vier Ursachen, alle in einer Datei:

- `open-pull-requests-limit: 10`, während Security-Updates die Gruppierung umgehen — so
  entstehen zwölf einzelne PRs auf derselben `package-lock.json`, die sich gegenseitig
  bei jedem Merge invalidieren.
- Majors global ignoriert → siehe nodemailer. Besser: Majors erlauben und einzeln bewerten,
  oder wenigstens Security-Majors nicht ausschließen.
- `github-actions` ohne Gruppierung → vier separate Action-PRs statt einem.
- **`alexa-skill/` hat gar keinen Eintrag.** Die vier alexa-PRs kamen ausschließlich als
  Security-Alerts durch; geplante Version-Updates gibt es dort nicht.

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

**Flaky Webhook-Test**

`__tests__/webhooks.test.ts` → „aborts fetch via AbortController when delivery takes longer
than timeout" ist ein Race gegen den absichtlich fire-and-forget nicht-`await`-eten
`db.insert` in `lib/webhooks.ts:470`. In CI gewinnt der Insert das Rennen meist, lokal
zuverlässig nicht. Heute grün — aber er wird rot, und dann verliert man Vertrauen in die
Suite genau dann, wenn man sie braucht. Der Produktionscode ist in Ordnung; der Test muss
auf den Insert warten können.

**Offline-Queue**

Tasks offline erfassen via PWA Service Worker Background Sync. Aktuell kein
`BackgroundSync`-Code im Projekt. Passt zur Zielgruppe (Aufgabe notieren, wenn sie
einfällt — auch im Funkloch), ist aber echte Arbeit und kein Quick Win.

**Kleinigkeiten**

- `components/layout/user-menu.tsx:157` verlinkt direkt auf `/review` statt auf
  `/progress?tab=review` — ein unnötiger Redirect-Hop.
- `lib/openapi.ts` (3715 LOC) und `components/tasks/task-list.tsx` (1467 LOC) sind die
  beiden Dateien, bei denen Aufteilen sich am ehesten lohnt.

**Erledigt** ✅ — Automatische DB-Backups (`pg_dump`-Cronjob, `profiles: [backup]`, seit
0.4.0) · E2E-Tests (Playwright, 13 Specs, seit 0.4.0) · Dependency-Stau aufgelöst
(19 → 0 offene PRs, 75 → 5 Security-Alerts, 2026-08-20) · next 16.3.1 (#65, 2026-08-20)

---

*Momo ist für die Menschen, die zu viel im Kopf haben und zu wenig auf der Liste erledigt
bekommen. Der nächste Schritt ist nicht ein neues Feature — es ist sicherzustellen, dass
das, was da ist, wirklich für diese Menschen funktioniert. Und dass es sicher genug ist,
um es Fremden zu empfehlen.*
