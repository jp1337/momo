# Alexa Skill Setup — Schritt-für-Schritt

Voraussetzung: Ein normaler Amazon Account (z.B. mit Prime) reicht als Ausgangspunkt.

---

## Übersicht

Du benötigst zwei kostenlose Accounts:
- **Amazon Developer Account** — für den Alexa Skill
- **AWS Account** — für die Lambda-Funktion (der eigentliche Code)

Beides ist kostenlos nutzbar (AWS Free Tier, Alexa Entwickler-Konto).

---

## Teil 1 — AWS Account erstellen

### 1.1 Registrierung

1. Gehe zu **https://aws.amazon.com** und klicke auf **"Kostenloses Konto erstellen"**
2. Melde dich mit deinem bestehenden Amazon Account an — oder erstelle einen neuen
3. Gib eine **Kreditkarte** an (wird nur für Überprüfung benötigt; Lambda ist im Free Tier dauerhaft kostenlos)
4. **Telefonverifizierung**: Du bekommst einen Anruf, gib den angezeigten PIN ein
5. Wähle den Plan **"Basic (kostenlos)"**
6. Warte ca. 1–2 Minuten bis die Aktivierungs-E-Mail kommt

> **Kosten**: Lambda ist im Free Tier dauerhaft kostenlos (1 Million Anfragen/Monat frei).
> Bei einem privaten Alexa Skill wirst du diese Grenze nie erreichen.

---

### 1.2 Lambda-Funktion erstellen

1. Gehe zur **AWS Management Console** → https://console.aws.amazon.com
2. Suche oben in der Suchleiste nach **"Lambda"** und öffne den Dienst
3. Stelle sicher, dass oben rechts die Region **"Europe (Frankfurt) eu-central-1"** ausgewählt ist
4. Klicke auf **"Funktion erstellen"**
5. Wähle **"Neu von Grund auf"**
6. Fülle die Felder aus:
   - **Funktionsname**: `momo-alexa-skill`
   - **Laufzeit**: `Node.js 20.x`
   - **Architektur**: `x86_64`
7. Klicke auf **"Funktion erstellen"**

---

### 1.3 Code hochladen

1. Du bist jetzt in der Lambda-Funktion. Scrolle zum Abschnitt **"Code"**
2. Klicke auf **"Hochladen aus"** → **".zip-Datei"**
3. Lade die Datei `alexa-skill/deploy.zip` aus diesem Projekt hoch
   - Falls du die Datei noch nicht hast: Im Ordner `alexa-skill/` den Befehl `npm run zip` ausführen
4. Klicke auf **"Speichern"**

Prüfe, ob als **Handler** `index.handler` eingetragen ist (unter "Laufzeiteinstellungen" → "Bearbeiten").

---

### 1.4 Umgebungsvariable setzen

1. Klicke oben auf **"Konfiguration"** → links auf **"Umgebungsvariablen"**
2. Klicke auf **"Bearbeiten"** → **"Umgebungsvariable hinzufügen"**
3. Trage ein:
   - **Schlüssel**: `MOMO_API_BASE_URL`
   - **Wert**: `https://momotask.app` (oder deine eigene Momo-Instanz)
4. Klicke auf **"Speichern"**

---

### 1.5 Lambda ARN kopieren

Oben rechts in der Lambda-Konsole siehst du die **ARN** deiner Funktion — sie sieht so aus:
```
arn:aws:lambda:eu-central-1:123456789012:function:momo-alexa-skill
```
**Kopiere diese ARN** — du brauchst sie in Schritt 3.

---

## Teil 2 — Amazon Developer Account erstellen

1. Gehe zu **https://developer.amazon.com**
2. Klicke oben rechts auf **"Sign in"** und melde dich mit deinem Amazon Account an
3. Stimme den Nutzungsbedingungen zu (einmalig)
4. Das Developer Portal öffnet sich — du brauchst keine weiteren Angaben

---

## Teil 3 — Alexa Skill erstellen

### 3.1 Neuen Skill anlegen

1. Gehe zur **Alexa Developer Console** → https://developer.amazon.com/alexa/console/ask
2. Klicke auf **"Create Skill"**
3. Fülle aus:
   - **Skill name**: `Momo`
   - **Primary locale**: `German (DE)` — oder English (US) wenn du Englisch bevorzugst
4. Klicke auf **"Next"**
5. Wähle Modell: **"Other"** → **"Custom"**
6. Klicke auf **"Next"**
7. Wähle Hosting: **"Provision your own"**
8. Klicke auf **"Next"** → **"Start from Scratch"** → **"Create Skill"**

---

### 3.2 Interaction Model importieren

1. Im linken Menü: Klicke auf **"Interaction Model"** → **"JSON Editor"**
2. Lösche den gesamten vorhandenen Inhalt
3. Öffne die Datei `alexa-skill/models/de-DE.json` aus diesem Projekt
4. Kopiere den gesamten Inhalt und füge ihn in den JSON-Editor ein
5. Klicke oben auf **"Save Model"** → dann auf **"Build Model"**
6. Warte bis der Build abgeschlossen ist (ca. 1–2 Minuten, grüne Erfolgsmeldung)

---

### 3.3 Endpunkt konfigurieren

1. Im linken Menü: Klicke auf **"Endpoint"**
2. Wähle **"AWS Lambda ARN"**
3. Trage unter **"Default Region"** die kopierte Lambda ARN aus Schritt 1.5 ein:
   ```
   arn:aws:lambda:eu-central-1:123456789012:function:momo-alexa-skill
   ```
4. Klicke auf **"Save Endpoints"**
5. **Skill ID kopieren**: Oben auf der Seite siehst du die Skill-ID — sie beginnt mit `amzn1.ask.skill.`
   Kopiere sie — du brauchst sie gleich in Lambda.

---

### 3.4 Lambda: Alexa Trigger hinzufügen

Zurück in der **AWS Lambda-Konsole**:

1. Klicke oben auf **"+ Trigger hinzufügen"**
2. Wähle **"Alexa Skills Kit"**
3. Unter **"Skill ID verification"**: wähle **"Enable"** und trage deine Skill-ID ein
4. Klicke auf **"Add"**

---

## Teil 4 — Account Linking einrichten

Damit Alexa weiß, wer du bist (= deinen Momo API-Schlüssel kennt), musst du Account Linking einrichten.

### 4.1 API-Schlüssel in Momo erstellen

1. Öffne Momo → **Einstellungen** → **API-Schlüssel**
2. Erstelle einen neuen API-Schlüssel
3. Kopiere den Schlüssel (beginnt mit `momo_live_...`)

---

### 4.2 Account Linking konfigurieren

In der **Alexa Developer Console** → dein Skill → linkes Menü → **"Account Linking"**:

1. Aktiviere den Schalter **"Do you allow users to create an account or link to an existing account with you?"**
2. Wähle **Authorization Grant Type**: **"Implicit Grant"**
3. Fülle aus:
   - **Authorization URI**: `https://momotask.app/api/alexa/auth`
   - **Client ID**: `momo-alexa`
   - **Scope**: leer lassen
   - **Domain List**: leer lassen
4. Klicke auf **"Save"**

> **So funktioniert es für alle User:**
> Momo stellt unter `/api/alexa/auth` einen vollständigen OAuth 2.0 Implicit Grant Endpoint bereit.
> Wenn ein User "Account verknüpfen" in der Alexa-App tippt:
> 1. Alexa öffnet `https://momotask.app/api/alexa/auth?response_type=token&...`
> 2. Momo prüft, ob der User eingeloggt ist — falls nicht, weiter zur Login-Seite
> 3. Nach dem Login erstellt Momo automatisch einen API-Schlüssel namens "Alexa" für diesen User
> 4. Alexa bekommt den Schlüssel und speichert ihn — fertig
>
> Der Schlüssel ist danach unter **Einstellungen → API-Schlüssel** sichtbar und kann dort
> jederzeit widerrufen werden (= Alexa-Verbindung trennen).

---

### 4.3 Account in der Alexa-App verknüpfen

1. Öffne die **Alexa-App** auf deinem Smartphone
2. Gehe zu **Mehr** → **Skills & Spiele** → **Deine Skills** → **Dev Skills**
3. Tippe auf **"Momo"**
4. Tippe auf **"Account verknüpfen"** / **"Enable to use"**
5. Es öffnet sich ein Browser mit der Momo Settings-Seite
6. Gib deinen Momo API-Schlüssel ein und bestätige
7. Alexa zeigt "Account erfolgreich verknüpft"

---

## Teil 5 — Skill testen

### 5.1 Im Browser testen (ohne Echo-Gerät)

1. In der Alexa Developer Console → **"Test"** (oben im Menü)
2. Ändere **"Skill testing is enabled in:"** auf **"Development"**
3. Tippe oder sprich:
   - `öffne momo`
   - `füge Zahnarzt hinzu`
   - `was ist meine Quest`
   - `liste meine Aufgaben`

### 5.2 Auf einem Echo-Gerät testen

Stelle sicher, dass Echo und Alexa-App mit demselben Amazon Account verbunden sind.
Sage einfach: **"Alexa, öffne Momo"**

---

## Häufige Probleme

| Problem | Lösung |
|---|---|
| "Diese Funktion hat keine Berechtigung" | Alexa Trigger in Lambda korrekt konfiguriert? Skill-ID stimmt? |
| "Dein Account ist nicht verknüpft" | Account Linking in der Alexa-App durchführen (Schritt 4.3) |
| Lambda Timeout | Timeout in Lambda erhöhen: Konfiguration → Allgemeine Konfiguration → Timeout auf 10 Sekunden |
| "Es ist ein Fehler aufgetreten" | CloudWatch Logs prüfen: Lambda → Monitor → CloudWatch Logs anzeigen |
| Build-Fehler | Im `alexa-skill/`-Ordner: `npm install && npm run zip` erneut ausführen |

---

## Zusammenfassung der nötigen Schritte

```
1. AWS Account erstellen            → aws.amazon.com
2. Lambda-Funktion anlegen          → Node.js 20.x, momo-alexa-skill
3. deploy.zip hochladen             → npm run zip → dann in Lambda
4. MOMO_API_BASE_URL setzen         → https://momotask.app
5. Amazon Developer Account         → developer.amazon.com
6. Alexa Skill erstellen            → Custom, eigenes Hosting
7. de-DE.json importieren           → JSON Editor, Build Model
8. Lambda ARN in Skill eintragen    → Endpoint
9. Skill-ID in Lambda-Trigger       → Trigger hinzufügen
10. Account Linking einrichten      → API-Schlüssel aus Momo-Einstellungen
11. Skill in Alexa-App aktivieren   → Dev Skills → Account verknüpfen
12. Testen                          → "Alexa, öffne Momo"
```
