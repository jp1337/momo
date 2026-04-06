# Momo Alexa Skill

Sprachsteuerung für Momo via Amazon Alexa.  
Aufgaben hinzufügen, Daily Quest abfragen und Aufgabenliste hören — per Stimme.

---

## Sprachbefehle

| Was du sagst | Was passiert |
|---|---|
| „Alexa, öffne Momo" | Skill starten |
| „Füge Zahnarzt hinzu" | Neue Aufgabe `Zahnarzt` erstellen |
| „Was ist meine Quest?" | Heutige Daily Quest vorlesen |
| „Liste meine Aufgaben" | Offene Aufgaben vorlesen (max. 5) |
| „Hilfe" | Verfügbare Befehle aufzählen |
| „Beenden" | Skill schließen |

---

## Architektur

```
Nutzer (Sprache)
    ↓
Amazon Alexa / Echo-Gerät
    ↓
Alexa Skills Kit → AWS Lambda (diese Funktion)
    ↓
POST/GET https://momotask.app/api/...
Authorization: Bearer momo_live_...
```

**Account Linking:** Der Nutzer hinterlegt seinen Momo API-Schlüssel einmalig in der Alexa-App.  
Der Schlüssel wird bei jeder Anfrage als `accessToken` an Lambda übergeben.

---

## Setup

### 1. Voraussetzungen

- [Amazon Developer Account](https://developer.amazon.com/) (kostenlos)
- [AWS-Konto](https://aws.amazon.com/) für Lambda
- Node.js 20+, npm
- Momo-Instanz mit aktivierten API Keys

### 2. Lambda-Funktion erstellen

**In der AWS Lambda Console:**

1. Neue Funktion → **Neu von Grund auf**
2. Funktionsname: `momo-alexa-skill`
3. Laufzeit: **Node.js 20.x**
4. Architektur: x86_64
5. Erstellen

**Umgebungsvariablen** (unter Konfiguration → Umgebungsvariablen):
```
MOMO_API_BASE_URL = https://momotask.app
```

**Code hochladen:**
```bash
cd alexa-skill
npm install
npm run zip
# → deploy.zip wird erstellt
```
Dann in der Lambda-Console: Code hochladen → `.zip-Datei hochladen` → `deploy.zip` auswählen.

**Handler:** `index.handler`

**Trigger hinzufügen:** Alexa Skills Kit → Skill-ID eintragen (nach Skill-Erstellung in Schritt 4).

**Lambda ARN kopieren** (oben rechts in der Console) — wird in Schritt 4 benötigt.

### 3. Alexa Skill erstellen

In der [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask):

1. **Skill erstellen** → Name: `Momo` → Modell: `Benutzerdefiniert` → Hosting: `Eigene Bereitstellung`
2. **Aufrufname:** `momo`
3. **Interaction Model importieren:**
   - JSON-Editor öffnen
   - Inhalt von `models/de-DE.json` einfügen
   - Modell speichern & erstellen
4. **Endpunkt:** AWS Lambda ARN → ARN aus Schritt 2 eintragen
5. **Skill-ID kopieren** → in Lambda-Trigger eintragen (Schritt 2)

### 4. Account Linking einrichten

Im Alexa Developer Portal → dein Skill → **Account Linking**:

| Feld | Wert |
|---|---|
| Verknüpfungstyp | Impliziter Grant (einfachste Option) |
| Autorisierungs-URI | `https://momotask.app/api/alexa/auth` (Platzhalter — s.u.) |
| Client-ID | beliebig, z.B. `momo-alexa` |
| Scope | leer lassen |

> **Einfachste Alternative ohne OAuth-Flow:**  
> Statt einem vollständigen OAuth-Server kann der API-Schlüssel direkt im Textfeld  
> "Authorization URI" als `token`-Parameter übergeben werden — oder du nutzt  
> die Alexa-App-eigene Token-Eingabe:  
> Unter **Account Linking → Auth Code Grant** → Authorization URL = `https://momotask.app/settings`  
> (Nutzer wird zur Settings-Seite geschickt, kopiert seinen API Key und gibt ihn ein)

**Praktischste Lösung:** Nutze [simple account linking mit Token-Eingabe](https://developer.amazon.com/en-US/docs/alexa/account-linking/account-linking-for-skills-without-login.html):
Der Nutzer gibt seinen `momo_live_...` Key direkt in der Alexa-App ein.

### 5. Skill testen

Im Alexa Developer Portal → **Test** → Skill-Tests aktivieren:
- Eingabe: `öffne momo`
- Eingabe: `füge Zahnarzt hinzu`
- Eingabe: `was ist meine Quest`

Oder auf einem echten Echo-Gerät nach der Account-Verknüpfung.

---

## Entwicklung

```bash
cd alexa-skill
npm install

# TypeScript prüfen
npm run typecheck

# Build (erzeugt dist/index.js)
npm run build

# Build + ZIP für Lambda-Deploy
npm run zip
```

**Projektstruktur:**
```
alexa-skill/
  src/
    index.ts              ← Lambda-Handler (Einstiegspunkt)
    momo-client.ts        ← Typisierter Momo-API-Client
    handlers/
      launch.ts           ← LaunchRequest
      add-task.ts         ← AddTaskIntent
      get-quest.ts        ← GetQuestIntent
      list-tasks.ts       ← ListTasksIntent
      help.ts             ← AMAZON.HelpIntent
      cancel-stop.ts      ← AMAZON.CancelIntent / StopIntent
      error.ts            ← Globaler ErrorHandler
  models/
    de-DE.json            ← Deutsches Interaction Model
    en-US.json            ← Englisches Interaction Model
  skill.json              ← Skill-Manifest (ARN anpassen!)
  .env.example            ← Lambda-Umgebungsvariablen
```

---

## Erweiterungsmöglichkeiten

- **`CompleteQuestIntent`** — „Alexa, ich habe meine Quest erledigt" → POST /api/daily-quest/complete
- **`CompleteTaskIntent`** — „Alexa, erledige {taskName}" → PATCH /api/tasks/{id}/complete
- **Mehrsprachige Antworten** — Sprache aus `requestEnvelope.request.locale` ableiten
- **Proaktive Benachrichtigungen** — Alexa Proactive Events API für Quest-Reminder

---

*Benötigt: Amazon Developer Account · AWS Lambda (kostenlos im Free Tier) · Momo API Key*
