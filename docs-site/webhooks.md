---
layout: default
title: Webhooks
description: Momo has two distinct webhook types — HTTP Alert for notifications and Task Events for automation. This page explains both with payload examples and code snippets.
---

# Webhooks

Momo has **two distinct webhook types** that are easy to confuse:

| Type | Where | Purpose | Payload |
|---|---|---|---|
| **HTTP Alert** | Settings → Notifications → Channels | Receive Momo notifications via HTTP | `momo.notification` with title + body |
| **Task Events** | Settings → Integrations → Task Events | Automate on task changes | `task.created/updated/completed/deleted` with task data |

---

## HTTP Alert (Notification Channel)

The **HTTP Alert** is a delivery channel for Momo notifications — alongside Web Push, ntfy, Pushover, Telegram, and Email. Whenever Momo sends a notification (e.g. Daily Quest, streak reminder, due tasks), it also POSTs it to your configured URL.

**Setup:** Settings → Notifications → Channels → + HTTP Alert

### Payload

```json
{
  "event": "momo.notification",
  "title": "Your Daily Quest is waiting",
  "body": "Today's mission: finish the React component",
  "url": "/dashboard",
  "tag": "daily-quest",
  "timestamp": "2026-04-25T08:00:00.000Z"
}
```

| Field | Type | Description |
|---|---|---|
| `event` | string | Always `"momo.notification"` |
| `title` | string | Notification title |
| `body` | string | Notification body text |
| `url` | string \| null | Relative app path to open |
| `tag` | string \| null | Unique identifier for the notification type (e.g. `daily-quest`, `streak`, `due-today`) |
| `timestamp` | string | ISO 8601 timestamp |

### Common `tag` values

| Tag | Trigger |
|---|---|
| `daily-quest` | Daily quest reminder |
| `streak` | Streak reminder |
| `due-today` | Tasks due today |
| `overdue` | Overdue tasks |
| `recurring-due` | Recurring tasks due |
| `weekly-review` | Weekly review summary |
| `morning-briefing` | Morning digest |
| `achievement` | Achievement unlocked |

### Example: Home Assistant

```yaml
# configuration.yaml
rest_command:
  momo_alert:
    url: "https://homeassistant.local/api/webhook/momo-alert"
    method: POST
    content_type: "application/json"

automation:
  - alias: "Momo Notification → Mobile"
    trigger:
      platform: webhook
      webhook_id: momo-alert
    action:
      service: notify.mobile_app
      data:
        title: "{{ trigger.json.title }}"
        message: "{{ trigger.json.body }}"
```

### Example: n8n / Zapier

Add a **Webhook Trigger** node and use `{{ $json.title }}` and `{{ $json.body }}` as inputs for further actions.

---

## Task Events (Outbound Webhooks)

**Task Events** are for automation. Momo sends structured JSON events to your configured endpoints whenever tasks change — independent of notification settings.

**Setup:** Settings → Integrations → Task Events → + Add Endpoint

You can configure up to **10 endpoints**, each with its own signing secret and event filter.

### Events

| Event | Trigger |
|---|---|
| `task.created` | A task was created |
| `task.updated` | A task was edited |
| `task.completed` | A task was checked off |
| `task.deleted` | A task was deleted |

### Payload

```json
{
  "event": "task.completed",
  "timestamp": "2026-04-25T14:32:00.000Z",
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Finish the React component",
    "type": "TASK",
    "priority": "HIGH",
    "topicId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "dueDate": "2026-04-25",
    "completedAt": "2026-04-25T14:32:00.000Z",
    "createdAt": "2026-04-20T09:00:00.000Z"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `event` | string | `task.created` / `task.updated` / `task.completed` / `task.deleted` |
| `timestamp` | string | ISO 8601 event timestamp |
| `task.id` | string | Task UUID |
| `task.title` | string | Task title |
| `task.type` | string | `TASK` or `RECURRING` |
| `task.priority` | string | `LOW`, `MEDIUM`, `HIGH`, or `URGENT` |
| `task.topicId` | string \| null | UUID of the associated topic |
| `task.dueDate` | string \| null | Due date (`YYYY-MM-DD`) |
| `task.completedAt` | string \| null | Completion timestamp (ISO 8601), only on `task.completed` |
| `task.createdAt` | string | Creation timestamp (ISO 8601) |

### Example: n8n Workflow

```
Webhook Trigger (POST /webhook/momo)
  → IF event == "task.completed"
    → HTTP Request → Notion API (update page)
    → Slack Message → #done
```

### Example: Zapier

1. Trigger: **Webhooks by Zapier → Catch Hook**
2. Copy the Zapier URL into Momo as the endpoint URL
3. Select the events you care about (or all of them)
4. Action: e.g. add a row to Google Sheets, move a Trello card, etc.

---

## Request Signing (HMAC-SHA256)

Both webhook types support optional **request signing** to verify the origin of incoming requests.

When a signing secret is configured, every request includes the header:

```
X-Momo-Signature: sha256=<hex-digest>
```

The digest is computed as HMAC-SHA256 over the **raw JSON body** using your secret as the key.

### Verification examples

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

> **Important:** Always use the raw request body *before* JSON-parsing for signature verification. Use `timingSafeEqual` / `compare_digest` / `hash_equals` — never a plain string comparison (timing attack protection).

---

## At a Glance

```
Momo sends a notification
  │
  ├── Web Push (browser)
  ├── ntfy.sh
  ├── Pushover
  ├── Telegram
  ├── Email
  └── HTTP Alert  ← notification webhook
        Payload: { event: "momo.notification", title, body, ... }

A task is checked off
  │
  └── Task Events webhook  ← outbound webhook
        Payload: { event: "task.completed", task: { id, title, ... } }
```

## See also

- [Features — Notifications](/momo/features#notifications)
- [Features — Integrations](/momo/features#integrations)
- [Getting Started](/momo/getting-started)
