---
layout: default
title: Webhooks
description: Momo hat zwei verschiedene Webhook-Typen — HTTP-Alert für Benachrichtigungen und Aufgaben-Events für Automatisierungen. Diese Seite erklärt beide mit Payload-Beispielen und Code-Snippets.
---

# Webhooks

Momo hat **zwei verschiedene Webhook-Typen**, die oft verwechselt werden:

| Typ | Wo | Zweck | Payload |
|---|---|---|---|
| **HTTP-Alert** | Einstellungen → Benachrichtigungen → Kanäle | Momo-Benachrichtigungen per HTTP empfangen | `momo.notification` mit Titel + Text |
| **Aufgaben-Events** | Einstellungen → Integrationen → Aufgaben-Events | Automatisierungen bei Aufgaben-Änderungen | `task.created/updated/completed/deleted` mit Aufgaben-Daten |

---

## HTTP-Alert (Benachrichtigungskanal)

Der **HTTP-Alert** ist ein weiterer Zustellungsweg für Momo-Benachrichtigungen — neben Web Push, ntfy, Pushover, Telegram und E-Mail. Wenn Momo eine Benachrichtigung sendet (z. B. Daily Quest, Streak-Erinnerung, fällige Aufgaben), schickt es diese auch als HTTP POST an deine URL.

**Einrichten:** Einstellungen → Benachrichtigungen → Kanäle → + HTTP-Alert

### Payload

```json
{
  "event": "momo.notification",
  "title": "Deine Daily Quest wartet",
  "body": "Heutige Mission: React-Komponente fertigstellen",
  "url": "/dashboard",
  "tag": "daily-quest",
  "timestamp": "2026-04-25T08:00:00.000Z"
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `event` | string | Immer `"momo.notification"` |
| `title` | string | Benachrichtigungstitel |
| `body` | string | Benachrichtigungstext |
| `url` | string \| null | Relativer App-Pfad zum Öffnen |
| `tag` | string \| null | Eindeutiger Bezeichner des Benachrichtigungstyps (z. B. `daily-quest`, `streak`, `due-today`) |
| `timestamp` | string | ISO 8601 Zeitstempel |

### Typische `tag`-Werte

| Tag | Auslöser |
|---|---|
| `daily-quest` | Tägliche Quest-Erinnerung |
| `streak` | Streak-Erinnerung |
| `due-today` | Aufgaben heute fällig |
| `overdue` | Überfällige Aufgaben |
| `recurring-due` | Wiederkehrende Aufgaben fällig |
| `weekly-review` | Wöchentlicher Rückblick |
| `morning-briefing` | Morgen-Zusammenfassung |
| `achievement` | Errungenschaft freigeschaltet |

### Beispiel: Home Assistant

```yaml
# configuration.yaml
rest_command:
  momo_alert:
    url: "https://homeassistant.local/api/webhook/momo-alert"
    method: POST
    content_type: "application/json"

automation:
  - alias: "Momo Benachrichtigung als Notification"
    trigger:
      platform: webhook
      webhook_id: momo-alert
    action:
      service: notify.mobile_app
      data:
        title: "{{ trigger.json.title }}"
        message: "{{ trigger.json.body }}"
```

### Beispiel: n8n / Zapier

Füge einen **Webhook-Trigger** hinzu und nutze `{{ $json.title }}` und `{{ $json.body }}` als Eingabe für weitere Aktionen.

---

## Aufgaben-Events (Outbound Webhooks)

Die **Aufgaben-Events** sind für Automatisierungen. Momo sendet strukturierte JSON-Events an deine konfigurierten Endpunkte, wenn sich Aufgaben ändern — unabhängig von Benachrichtigungseinstellungen.

**Einrichten:** Einstellungen → Integrationen → Aufgaben-Events → + Endpunkt hinzufügen

Du kannst bis zu **10 Endpunkte** konfigurieren, jeden mit eigenem Signing-Secret und Event-Filter.

### Events

| Event | Auslöser |
|---|---|
| `task.created` | Aufgabe wurde erstellt |
| `task.updated` | Aufgabe wurde bearbeitet |
| `task.completed` | Aufgabe wurde abgehakt |
| `task.deleted` | Aufgabe wurde gelöscht |

### Payload

```json
{
  "event": "task.completed",
  "timestamp": "2026-04-25T14:32:00.000Z",
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "React-Komponente fertigstellen",
    "type": "TASK",
    "priority": "HIGH",
    "topicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "dueDate": "2026-04-25",
    "completedAt": "2026-04-25T14:32:00.000Z",
    "createdAt": "2026-04-20T09:00:00.000Z"
  }
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `event` | string | `task.created` / `task.updated` / `task.completed` / `task.deleted` |
| `timestamp` | string | ISO 8601 Zeitstempel des Events |
| `task.id` | string | UUID der Aufgabe |
| `task.title` | string | Aufgabentitel |
| `task.type` | string | `TASK` oder `RECURRING` |
| `task.priority` | string | `LOW`, `MEDIUM`, `HIGH` oder `URGENT` |
| `task.topicId` | string \| null | UUID des zugehörigen Themas |
| `task.dueDate` | string \| null | Fälligkeitsdatum (`YYYY-MM-DD`) |
| `task.completedAt` | string \| null | Abschlusszeitpunkt (ISO 8601), nur bei `task.completed` |
| `task.createdAt` | string | Erstellungszeitpunkt (ISO 8601) |

### Beispiel: n8n Workflow

```
Webhook Trigger (POST /webhook/momo)
  → IF event == "task.completed"
    → HTTP Request → Notion API (Seite aktualisieren)
    → Slack Message → #erledigt
```

### Beispiel: Zapier

1. Trigger: **Webhooks by Zapier → Catch Hook**
2. Kopiere die Zapier-URL in Momo als Endpunkt-URL
3. Wähle die Events die dich interessieren (oder alle)
4. Action: z. B. Zeile in Google Sheets erstellen, Trello-Karte bewegen, etc.

---

## Signierung (HMAC-SHA256)

Beide Webhook-Typen unterstützen optionale **Request-Signierung** zur Verifizierung der Herkunft.

Wenn ein Signing-Secret konfiguriert ist, enthält jede Anfrage den Header:

```
X-Momo-Signature: sha256=<hex-digest>
```

Der Digest wird berechnet als HMAC-SHA256 über den **rohen JSON-Body** mit deinem Secret als Schlüssel.

### Verifikation in verschiedenen Sprachen

**Node.js / TypeScript:**
```typescript
import { createHmac, timingSafeEqual } from "crypto";

function verifyMomoSignature(
  body: string,
  secret: string,
  signatureHeader: string
): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const received = Buffer.from(signatureHeader);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return timingSafeEqual(received, expectedBuf);
}
```

**Python:**
```python
import hmac
import hashlib

def verify_momo_signature(body: bytes, secret: str, signature_header: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**PHP:**
```php
function verifyMomoSignature(string $body, string $secret, string $header): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $body, $secret);
    return hash_equals($expected, $header);
}
```

> **Wichtig:** Immer den rohen Request-Body vor dem JSON-Parsen für die Signaturberechnung verwenden. Und `timingSafeEqual` / `compare_digest` / `hash_equals` nutzen — keine einfachen String-Vergleiche (Timing-Attack-Schutz).

---

## Unterschied auf einen Blick

```
Momo sendet eine Benachrichtigung
  │
  ├── Web Push (Browser)
  ├── ntfy.sh
  ├── Pushover
  ├── Telegram
  ├── E-Mail
  └── HTTP-Alert ← Benachrichtigungs-Webhook
        Payload: { event: "momo.notification", title, body, ... }

Aufgabe wird abgehakt
  │
  └── Aufgaben-Events Webhook ← Outbound Webhook
        Payload: { event: "task.completed", task: { id, title, ... } }
```

## Siehe auch

- [Features — Benachrichtigungen](/momo/features#benachrichtigungen)
- [Features — Integrationen](/momo/features#integrationen)
- [Getting Started](/momo/getting-started)
