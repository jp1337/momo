# API Reference

All API routes are prefixed with `/api`.

## Interactive Documentation

The full API is documented interactively via Swagger UI:

- **Swagger UI:** [`/api-docs`](/api-docs)
- **OpenAPI 3.1.0 JSON spec:** [`/api/openapi.json`](/api/openapi.json)

You can authorize with a Personal Access Token in the Swagger UI to try out all endpoints directly.

---

## Authentication

All routes (except `/api/health`) require authentication via one of:

| Method | How |
|---|---|
| Session cookie | Automatic for logged-in browser users |
| Bearer token | `Authorization: Bearer momo_live_<key>` |

**Read-only API keys** (`readonly: true`) may only call GET endpoints. POST/PATCH/DELETE requests with a read-only key return `403 Forbidden`.

Create and manage API keys at [`/api-keys`](/api-keys) or via the navbar → avatar → "API Keys".

## Alexa Account Linking

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/alexa/auth` | Session (redirect) | OAuth 2.0 Implicit Grant — issues an API key to Alexa on behalf of the logged-in user |

### GET /api/alexa/auth

OAuth 2.0 Implicit Grant authorization endpoint for the Momo Alexa Skill.
Amazon redirects every user here when they tap "Link Account" in the Alexa app.

Required query parameters (sent by Amazon):

| Parameter | Description |
|---|---|
| `response_type` | Must be `token` |
| `redirect_uri` | Amazon's callback URI — validated against known Alexa domains |
| `state` | Opaque value forwarded unchanged to the redirect |

**Flow:**
1. Validates parameters and checks that `redirect_uri` is an official Amazon Alexa domain
2. If the user has no active Momo session → redirects to `/login?callbackUrl=...` and returns here after login
3. Creates a new API key named `"Alexa"` for the user
4. Redirects to `redirect_uri#access_token=<key>&token_type=Bearer&state=<state>`

The generated key is visible under **Settings → API Keys** and can be revoked at any time to disconnect the skill.

---

## Authentication Routes

Managed by Auth.js v5. These routes are handled internally by the framework.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/session` | Returns the current session (or null) |
| `GET` | `/api/auth/signin` | Initiates the OAuth sign-in flow |
| `GET` | `/api/auth/callback/:provider` | OAuth provider callback |
| `POST` | `/api/auth/signout` | Signs the user out |
| `GET` | `/api/auth/csrf` | Returns a CSRF token |

### Two-Factor Authentication (TOTP)

All `/api/auth/2fa/*` routes require an interactive **session cookie** —
they explicitly reject `Authorization: Bearer …` (API key) callers, since
2FA is meant to protect interactive logins. API keys themselves are exempt
from the 2FA gate by design (a Personal Access Token already represents a
separate credential). See [two-factor-auth.md](two-factor-auth.md) for the
full lifecycle.

All routes are rate-limited at 5 attempts per 5 minutes per user. Error
responses share the shape `{ error: string, code: string }`.

#### POST /api/auth/2fa/setup

Starts a TOTP setup wizard. Generates a fresh secret and stashes the
plaintext in a signed httpOnly cookie (`momo_totp_setup`, 10-minute TTL).
Writes nothing to the database.

- **Auth:** session cookie required
- **Body:** none
- **Response:** `200 { "qrCodeDataUrl": "data:image/png;base64,…", "manualEntryKey": "JBSWY3DPEHPK3PXP" }`
- **Errors:** `401 UNAUTHORIZED`, `409 TOTP_ALREADY_ENABLED`, `429 RATE_LIMITED`

#### POST /api/auth/2fa/verify-setup

Completes the setup wizard. Reads the pending plaintext secret from the
setup cookie, verifies the user-supplied code, and atomically encrypts +
persists the secret, generates 10 backup codes, and marks the current
session as totp-verified.

- **Auth:** session cookie required
- **Body:** `{ "code": "123456" }`
- **Response:** `200 { "backupCodes": ["ABCDEFGHJK", "LMNPQRSTUV", …] }` — plaintext, returned exactly once
- **Errors:** `400` invalid body, `401 UNAUTHORIZED`, `410 SETUP_EXPIRED`, `422 INVALID_CODE`, `429 RATE_LIMITED`

#### POST /api/auth/2fa/verify

Login-time second-factor verification. Accepts either a 6-digit TOTP
code or a 10-character backup code (XOR validated). On success, marks
`sessions.totp_verified_at` for the current session row.

- **Auth:** session cookie required
- **Body:** `{ "code": "123456" }` or `{ "backupCode": "ABCDEFGHJK" }`
- **Response:** `200 { "success": true, "usedBackupCode": false }`
- **Errors:** `400` invalid body, `401 UNAUTHORIZED`, `409 TOTP_NOT_ENABLED`, `422 INVALID_CODE`, `429 RATE_LIMITED`

#### POST /api/auth/2fa/disable

Deactivates 2FA for the current user. Requires re-authentication with a
current code (or backup code). **Blocked entirely** when `REQUIRE_2FA=true`.

- **Auth:** session cookie required
- **Body:** `{ "code": "123456" }` or `{ "backupCode": "ABCDEFGHJK" }`
- **Response:** `200 { "success": true }`
- **Errors:** `400`, `401 UNAUTHORIZED`, `403 TOTP_REQUIRED_BY_ADMIN`, `409 TOTP_NOT_ENABLED`, `422 INVALID_CODE`, `429 RATE_LIMITED`

#### POST /api/auth/2fa/regenerate-backup-codes

Replaces all of the user's backup codes with a fresh batch of 10. Requires
a current TOTP code (backup codes are not accepted here for clarity —
using one would consume one of the codes being replaced).

- **Auth:** session cookie required
- **Body:** `{ "code": "123456" }`
- **Response:** `200 { "backupCodes": ["ABCDEFGHJK", …] }` — plaintext, returned exactly once
- **Errors:** `400`, `401 UNAUTHORIZED`, `409 TOTP_NOT_ENABLED`, `422 INVALID_CODE`, `429 RATE_LIMITED`

### Passkeys (WebAuthn)

Passwordless primary login *and* alternative second factor. Built directly
on `@simplewebauthn/server` on top of the existing Auth.js database-session
strategy — Momo does **not** use the Auth.js Passkey provider because it
requires JWT sessions.

All challenges are stashed in a short-lived signed httpOnly cookie
(`momo_webauthn_challenge`, 5 min TTL, purpose-tagged `reg`/`login`/`sf`
to prevent cross-flow replay). RP ID + origin are resolved from
`WEBAUTHN_RP_ID` / `NEXT_PUBLIC_APP_URL` in `lib/webauthn.ts::getRpConfig`.
See [two-factor-auth.md](two-factor-auth.md) for the lifecycle overview.

#### POST /api/auth/passkey/register/options

Starts a passkey registration. Generates WebAuthn `PublicKeyCredentialCreationOptionsJSON`,
stashes the raw challenge in the signed challenge cookie (`kind=reg`), and returns the
options JSON for `@simplewebauthn/browser::startRegistration`.

- **Auth:** session cookie required
- **Body:** none
- **Response:** `200 PublicKeyCredentialCreationOptionsJSON`
- **Errors:** `401 UNAUTHORIZED`, `429 RATE_LIMITED`

#### POST /api/auth/passkey/register/verify

Verifies the attestation and persists the credential in `authenticators`.

- **Auth:** session cookie required
- **Body:** `{ "name": "iPhone", "response": RegistrationResponseJSON }`
- **Response:** `200 { "credentialID": "…", "name": "iPhone", "deviceType": "multiDevice" | "singleDevice", "backedUp": true }`
- **Errors:** `400`, `401 UNAUTHORIZED`, `410 CHALLENGE_EXPIRED`, `422 REGISTRATION_FAILED`, `429 RATE_LIMITED`

#### POST /api/auth/passkey/login/options

Starts a **passwordless primary login**. Generates an assertion challenge
with empty `allowCredentials` so the browser offers any discoverable
credential registered for this RP.

- **Auth:** none (public endpoint — this IS the login entry)
- **Body:** none
- **Response:** `200 PublicKeyCredentialRequestOptionsJSON`
- **Errors:** `429 RATE_LIMITED`

#### POST /api/auth/passkey/login/verify

Completes passwordless primary login. Verifies the assertion, creates a
fresh Auth.js database session row with `second_factor_verified_at = now()`
(a passkey is inherently MFA), and sets the Auth.js session cookie
(`authjs.session-token` / `__Secure-authjs.session-token`).

- **Auth:** none
- **Body:** `{ "response": AuthenticationResponseJSON }`
- **Response:** `200 { "success": true }` + session cookie
- **Errors:** `400`, `410 CHALLENGE_EXPIRED`, `422 ASSERTION_FAILED`, `429 RATE_LIMITED`

#### POST /api/auth/passkey/second-factor/options

Generates an assertion challenge for a user who already completed the
primary (OAuth) login but has not yet satisfied the second-factor gate.
Uses `allowCredentials` scoped to the user's registered passkeys.

- **Auth:** session cookie required
- **Body:** none
- **Response:** `200 PublicKeyCredentialRequestOptionsJSON`
- **Errors:** `401 UNAUTHORIZED`, `409 NO_PASSKEYS`, `429 RATE_LIMITED`

#### POST /api/auth/passkey/second-factor/verify

Marks the current session row as second-factor verified on a successful
assertion. Never creates a new session.

- **Auth:** session cookie required
- **Body:** `{ "response": AuthenticationResponseJSON }`
- **Response:** `200 { "success": true }`
- **Errors:** `400`, `401 UNAUTHORIZED`, `410 CHALLENGE_EXPIRED`, `422 ASSERTION_FAILED`, `429 RATE_LIMITED`

#### PATCH /api/auth/passkey/[id]

Renames a registered passkey. `[id]` is the base64url credential ID.
Silently no-ops when the credential is not owned by the session user
(matches the TOTP surface's "hide existence" pattern).

- **Auth:** session cookie required
- **Body:** `{ "name": "YubiKey 5C" }`
- **Response:** `200 { "success": true }`
- **Errors:** `400`, `401 UNAUTHORIZED`, `429 RATE_LIMITED`

#### DELETE /api/auth/passkey/[id]

Revokes a registered passkey. Blocked with `403 SECOND_FACTOR_REQUIRED_BY_ADMIN`
when `REQUIRE_2FA=true` and the deletion would leave the account without
any second factor (no TOTP and no other passkey).

- **Auth:** session cookie required
- **Body:** none
- **Response:** `200 { "success": true }`
- **Errors:** `401 UNAUTHORIZED`, `403 SECOND_FACTOR_REQUIRED_BY_ADMIN`, `429 RATE_LIMITED`

---

## System Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Liveness probe — returns `{ status: "ok", cron: {...} }` or `503` on DB error |
| `POST` | `/api/locale` | No | Set UI language preference cookie |

### POST /api/locale

Sets the `locale` cookie used by next-intl for language selection.

Request body:
```json
{ "locale": "de" }
```

Valid values: `"de"`, `"en"`, `"fr"`. Response: `{ "success": true }`

---

## Task Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/tasks` | Yes | — | List all tasks (with optional filters) |
| `POST` | `/api/tasks` | Yes | 60/min | Create a new task |
| `GET` | `/api/tasks/:id` | Yes | — | Get a single task |
| `PATCH` | `/api/tasks/:id` | Yes | — | Partially update a task |
| `DELETE` | `/api/tasks/:id` | Yes | — | Delete a task |
| `POST` | `/api/tasks/:id/complete` | Yes | 30/min | Mark task as complete + award coins |
| `DELETE` | `/api/tasks/:id/complete` | Yes | — | Undo task completion + refund coins |
| `POST` | `/api/tasks/:id/breakdown` | Yes | — | Break task into subtasks under a new topic |
| `POST` | `/api/tasks/:id/promote-to-topic` | Yes | 10/min | Promote standalone task to a new topic |
| `POST` | `/api/tasks/:id/snooze` | Yes | 30/min | Snooze task until a date (hidden from views) |
| `DELETE` | `/api/tasks/:id/snooze` | Yes | — | Unsnooze task (make visible again) |

### GET /api/tasks

Optional query parameters:

| Parameter | Type | Description |
|---|---|---|
| `topicId` | UUID or `"none"` | Filter by topic (`"none"` returns tasks without a topic) |
| `type` | `ONE_TIME` \| `RECURRING` \| `DAILY_ELIGIBLE` | Filter by task type |
| `completed` | `true` \| `false` | Filter by completion status |

Response:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "userId": "uuid",
      "topicId": null,
      "title": "Buy groceries",
      "notes": null,
      "type": "ONE_TIME",
      "priority": "NORMAL",
      "recurrenceInterval": null,
      "dueDate": "2026-04-05",
      "nextDueDate": null,
      "completedAt": null,
      "coinValue": 1,
      "isDailyQuest": false,
      "createdAt": "2026-04-01T08:00:00Z"
    }
  ]
}
```

### POST /api/tasks

Request body:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Task title (max 255 chars) |
| `type` | `ONE_TIME` \| `RECURRING` | Yes | Task type |
| `priority` | `LOW` \| `NORMAL` \| `HIGH` | No | Defaults to `NORMAL` |
| `dueDate` | ISO date string | No | e.g. `"2026-04-05"` |
| `coinValue` | integer | No | Coin reward on completion |
| `notes` | string | No | Free-text notes |
| `topicId` | UUID | No | Assign to an existing topic |
| `recurrenceInterval` | integer (days) | Conditionally | Required when `type` is `RECURRING` |
| `timezone` | IANA timezone string | No | Used to calculate `nextDueDate` for `RECURRING` tasks in non-UTC timezones (max 64 chars). Falls back to UTC if omitted. |

```json
{
  "title": "Buy groceries",
  "type": "ONE_TIME",
  "priority": "NORMAL",
  "dueDate": "2026-04-05",
  "coinValue": 2,
  "notes": "Optional notes",
  "topicId": "uuid-or-null",
  "recurrenceInterval": null,
  "timezone": "Europe/Berlin"
}
```

`type` is required. For `RECURRING` tasks, `recurrenceInterval` (integer, days) is required. Response: `{ "task": Task }` — Status `201`

### PATCH /api/tasks/:id

All fields optional. Same shape as POST body. Response: `{ "task": Task }`

### POST /api/tasks/:id/complete

Awards `coinValue` coins to the user, updates the daily streak, checks achievements.
For `RECURRING` tasks: advances `nextDueDate` by `recurrenceInterval` days and resets `completedAt`.

Optional request body (JSON):
```json
{ "timezone": "Europe/Berlin" }
```
The `timezone` field (IANA timezone string) is used for timezone-aware streak calculation.
If omitted, the server falls back to UTC.

Response:
```json
{
  "task": Task,
  "coinsEarned": 2,
  "newLevel": { "level": 3, "title": "Alltagsmeister" } | null,
  "unlockedAchievements": [{ "key": "first_task", "title": "Erster Schritt", "icon": "🌱" }],
  "streakCurrent": 5
}
```

### DELETE /api/tasks/:id/complete

Refunds the `coinValue` coins, resets `completedAt` to null.

Response: `{ "task": Task }`

### POST /api/tasks/:id/snooze

Snoozes a task until a future date. The task is hidden from the task list, Quick Wins, and Daily Quest until the snooze date passes. If the task is the current daily quest, the quest flag is cleared.

Request body:

| Field | Type | Required | Description |
|---|---|---|---|
| `snoozedUntil` | string | Yes | Date in YYYY-MM-DD format |

```json
{ "snoozedUntil": "2026-04-13" }
```

Response: `{ "task": Task }`

### DELETE /api/tasks/:id/snooze

Removes the snooze from a task, making it immediately visible again.

Response: `{ "task": Task }`

### POST /api/tasks/:id/breakdown

Breaks a task into multiple subtasks inside a new topic. The original task is deleted. A new topic is created using the task's title, and each entry in `subtaskTitles` becomes an individual task within that topic.

Also increments the `totalTasksCreated` statistics counter by the number of subtasks created (N).

Request body:

| Field | Type | Required | Description |
|---|---|---|---|
| `subtaskTitles` | string[] | Yes | 2–10 subtask titles (each max 255 chars) |

```json
{
  "subtaskTitles": [
    "Research options",
    "Compare prices",
    "Place order"
  ]
}
```

Returns `404 Not Found` if the task does not exist or does not belong to the authenticated user.

Response (200 OK):
```json
{
  "topicId": "uuid",
  "tasks": [
    { "id": "uuid", "title": "Research options", ... },
    { "id": "uuid", "title": "Compare prices", ... },
    { "id": "uuid", "title": "Place order", ... }
  ]
}
```

### POST /api/tasks/:id/promote-to-topic

Promotes a standalone task (no `topicId`) to a new topic in a single atomic transaction.
The task's `title`, `notes`, and `priority` are mapped to the new topic.
The task is re-associated as the first subtask.

Returns `409 Conflict` if the task already belongs to a topic.

Response (201 Created):
```json
{
  "topic": { "id": "uuid", "title": "Hochbeet bauen", ... }
}
```

---

## Topic Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/topics` | Yes | — | List all topics with task counts |
| `POST` | `/api/topics` | Yes | 30/min | Create a new topic |
| `GET` | `/api/topics/:id` | Yes | — | Get topic with all its tasks |
| `PATCH` | `/api/topics/:id` | Yes | — | Partially update a topic |
| `DELETE` | `/api/topics/:id` | Yes | — | Delete topic (tasks become standalone) |
| `PUT` | `/api/topics/:id/reorder` | Yes | 30/min | Reorder tasks within a topic |
| `POST` | `/api/topics/import-template` | Yes | 10/min | Import a topic from a predefined template |

### GET /api/topics

Response:
```json
{
  "topics": [
    {
      "id": "uuid",
      "title": "Tax Return",
      "description": null,
      "color": "#52a06e",
      "icon": "📂",
      "priority": "HIGH",
      "archived": false,
      "sequential": false,
      "createdAt": "2026-03-01T10:00:00Z",
      "taskCount": 5,
      "completedCount": 2
    }
  ]
}
```

### POST /api/topics

Request body:
```json
{
  "title": "Moving",
  "description": "Everything related to the move",
  "color": "#52a06e",
  "icon": "boxes-stacked",
  "priority": "HIGH",
  "sequential": true
}
```

`title` is required. `sequential` (default `false`) restricts daily quest selection in this topic to the first still-open task (lowest `sortOrder`, not snoozed); later tasks are blocked until earlier ones are completed. Response: `{ "topic": Topic }` — Status `201`

### GET /api/topics/:id

Returns the topic with its full task list (both open and completed tasks).

Response: `{ "topic": Topic & { tasks: Task[] } }`

### PATCH /api/topics/:id

All fields optional. Same shape as POST body. Response: `{ "topic": Topic }`

### DELETE /api/topics/:id

Deletes the topic. All associated tasks have their `topicId` set to `null` (they become standalone tasks, not deleted).

Response: `{ "success": true }`

### PUT /api/topics/:id/reorder

Reorders active tasks within a topic. The array index of each task ID becomes the new `sortOrder` value.

**Request body:**
```json
{ "taskIds": ["uuid-1", "uuid-2", "uuid-3"] }
```

All task IDs must belong to the given topic and the authenticated user.

Response: `{ "success": true }`

### POST /api/topics/import-template

Creates a new topic with all predefined subtasks from a curated template. Title, description and task titles are resolved in the caller's current UI locale (cookie `locale`, falls back to `Accept-Language`, default `de`) and stored as plain editable text — the imported content is no longer coupled to the i18n layer.

The full template catalogue (icon, color, priority, sequential flag, default energy level and task list) lives in [`lib/templates.ts`](../lib/templates.ts).

**Request body:**
```json
{ "templateKey": "moving" }
```

| Template key | Title (EN) | Tasks | Sequential |
|---|---|---|---|
| `moving` | Moving | 10 | yes |
| `taxes` | Tax return | 6 | yes |
| `fitness` | Workout routine | 7 | no |

**Response:** `201 { "topic": Topic, "tasks": Task[] }` — the created topic and its tasks, ordered by `sortOrder`.

Errors: `400` invalid JSON, `401 Unauthorized`, `403` readonly API key, `422` unknown `templateKey`, `429` rate-limited (10/min), `500` internal error.

---

## Daily Quest Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/daily-quest` | Yes | — | Get today's quest (auto-selects if none active) |
| `POST` | `/api/daily-quest` | Yes | — | Force a new quest selection |
| `POST` | `/api/daily-quest/postpone` | Yes | 10/min | Postpone today's quest to tomorrow |
| `POST` | `/api/daily-quest/restore` | Yes | — | Pin a specific task as today's quest (Undo for energy re-roll) |
| `POST` | `/api/energy-checkin` | Yes | 30/min | Record daily energy level + auto re-roll quest if mismatched |

### GET /api/daily-quest

Returns the active daily quest. If no quest is currently selected, one is automatically chosen using the priority algorithm:

1. Oldest overdue task
2. High-priority topic subtask
3. Due recurring task
4. Random open task from pool

Optional query parameters:

| Parameter | Type | Description |
|---|---|---|
| `timezone` | IANA timezone string | Used for timezone-aware "today" boundary when selecting the quest (max 64 chars). Falls back to UTC if omitted. |

Example: `GET /api/daily-quest?timezone=Europe%2FBerlin`

Response:
```json
{
  "task": { ... },
  "alreadyCompleted": false
}
```

Returns `{ "task": null }` if no eligible tasks exist.

### POST /api/daily-quest

Forces a new daily quest selection for the authenticated user. Clears any existing active or completed quest and runs the priority algorithm to assign a new one.

Optional request body (JSON):

| Field | Type | Required | Description |
|---|---|---|---|
| `timezone` | IANA timezone string | No | Used for timezone-aware "today" boundary during selection (max 64 chars). Falls back to UTC if omitted. |

```json
{ "timezone": "Europe/Berlin" }
```

The request body is entirely optional — sending an empty body or omitting `Content-Type` is also valid.

Response:
```json
{
  "quest": { ... }
}
```

Returns `{ "quest": null }` if no eligible tasks exist.

### POST /api/daily-quest/postpone

Postpones today's quest: clears `isDailyQuest`, sets `dueDate` to tomorrow (in the user's
local timezone), increments `postponeCount` on the task and the user's daily postpone counter.
Returns `429 LIMIT_REACHED` if the user has exhausted their daily postpone budget.

Request body:
```json
{ "taskId": "uuid", "timezone": "Europe/Berlin" }
```
`timezone` is optional — omit to use UTC.

Response: `{ "ok": true, "postponesToday": 2, "postponeLimit": 3 }`

### POST /api/energy-checkin

Records the user's daily energy level and **automatically re-rolls the daily quest** if the active quest no longer matches the reported energy. Idempotent in all other cases (no quest yet, quest already matches, quest already completed, no better candidate exists). Writes to both the cached `users.energyLevel`/`energyLevelDate` columns *and* appends a row to `energy_checkins` so the historical Stats view can pick it up. Re-check-ins later in the day are explicitly supported.

Request body:
```json
{ "energyLevel": "HIGH", "timezone": "Europe/Berlin" }
```

- `energyLevel` — required: `"HIGH"`, `"MEDIUM"`, or `"LOW"`
- `timezone` — optional IANA timezone string (omit to use UTC)

Response:
```json
{
  "quest": { /* TaskWithTopic */ } | null,
  "swapped": true,
  "previousQuestId": "uuid",
  "previousQuestTitle": "Call the dentist"
}
```

- `quest` — the (possibly re-rolled) active quest after the call
- `swapped` — true iff the quest was actually replaced
- `previousQuestId` / `previousQuestTitle` — only present when `swapped` is true; pass `previousQuestId` back to `POST /api/daily-quest/restore` to undo the swap

### POST /api/daily-quest/restore

Pins a specific task as today's daily quest, replacing whatever is currently active. Used by the energy check-in card's Undo link to restore the pre-reroll quest. The target task must be owned by the user, not completed, and not snoozed past today — otherwise the response contains `quest: null`.

Request body:
```json
{ "taskId": "uuid", "timezone": "Europe/Berlin" }
```

Response: `{ "quest": { /* TaskWithTopic */ } | null }`

---

## Wishlist Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/wishlist` | Yes | — | List all wishlist items + budget summary |
| `POST` | `/api/wishlist` | Yes | 30/min | Create a new wishlist item |
| `PATCH` | `/api/wishlist/:id` | Yes | — | Update a wishlist item (partial) |
| `DELETE` | `/api/wishlist/:id` | Yes | — | Permanently delete a wishlist item |
| `POST` | `/api/wishlist/:id/buy` | Yes | — | Mark item as bought (status → BOUGHT) |
| `DELETE` | `/api/wishlist/:id/buy` | Yes | — | Revert bought item to OPEN |
| `POST` | `/api/wishlist/:id/discard` | Yes | — | Mark item as discarded (status → DISCARDED) |

### GET /api/wishlist

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "New headphones",
      "price": "149.99",
      "url": "https://example.com",
      "priority": "WANT",
      "status": "OPEN",
      "coinUnlockThreshold": 100,
      "createdAt": "2026-03-31T10:00:00Z"
    }
  ],
  "budget": {
    "monthlyBudget": 500,
    "spentThisMonth": 149.99,
    "remaining": 350.01
  }
}
```

### POST /api/wishlist

Request body:
```json
{
  "title": "New headphones",
  "price": 149.99,
  "url": "https://example.com",
  "priority": "WANT",
  "coinUnlockThreshold": 100
}
```

`title` and `priority` are required. Response: `{ "item": WishlistItem }` — Status `201`

### PATCH /api/wishlist/:id

All fields optional. Same shape as POST body. Response: `{ "item": WishlistItem }`

### DELETE /api/wishlist/:id

Permanently deletes the item. Response: `{ "success": true }`

### POST /api/wishlist/:id/buy

Sets item status to `BOUGHT`. Response: `{ "item": WishlistItem }`

### DELETE /api/wishlist/:id/buy

Reverts a `BOUGHT` item back to `OPEN`. Returns `409` if item is not in `BOUGHT` state.

Response: `{ "item": WishlistItem }`

### POST /api/wishlist/:id/discard

Sets item status to `DISCARDED`. Response: `{ "item": WishlistItem }`

---

## Settings Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings/budget` | Yes | Get current monthly budget + spending summary |
| `PATCH` | `/api/settings/budget` | Yes | Update monthly budget |
| `PATCH` | `/api/settings/quest` | Yes | Update quest settings (postpone limit, emotional closure) |

### GET /api/settings/budget

Response:
```json
{
  "budget": {
    "monthlyBudget": 500.00,
    "spentThisMonth": 149.99,
    "remaining": 350.01
  }
}
```

### PATCH /api/settings/budget

```json
{ "budget": 500 }
```

Send `null` to remove the budget limit. Response: `{ "success": true }`

### PATCH /api/settings/quest

Updates quest-related user settings. At least one field must be provided.

```json
{ "postponeLimit": 3, "emotionalClosureEnabled": true }
```

| Field | Type | Description |
|---|---|---|
| `postponeLimit` | number (1–5) | Max daily quest postponements (optional) |
| `emotionalClosureEnabled` | boolean | Show affirmation/quote after quest completion (optional) |

Response: `{ "success": true }`

---

## Notification Channel Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/settings/notification-channels` | Yes | — | List all configured channels |
| `PUT` | `/api/settings/notification-channels` | Yes | 10/min | Create or update a channel (upsert by type) |
| `DELETE` | `/api/settings/notification-channels/:type` | Yes | — | Remove a channel |
| `POST` | `/api/settings/notification-channels/:type/test` | Yes | 3/min | Send test notification via channel |

### GET /api/settings/notification-channels

Response:
```json
{
  "channels": [
    {
      "type": "ntfy",
      "config": { "topic": "my-momo", "server": "https://ntfy.sh" },
      "enabled": true,
      "createdAt": "2026-04-06T10:00:00Z",
      "updatedAt": "2026-04-06T10:00:00Z"
    }
  ]
}
```

### PUT /api/settings/notification-channels

Upserts a channel by type. Each user can have at most one channel per type.

Request body:
```json
{
  "type": "ntfy",
  "config": { "topic": "my-momo-channel", "server": "https://ntfy.sh" },
  "enabled": true
}
```

Supported types: `ntfy`, `pushover`, `telegram`, `email` (more coming: `webhook`).

**ntfy config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `topic` | string | Yes | ntfy topic name (letters, numbers, hyphens, underscores) |
| `server` | string (URL) | No | ntfy server URL (defaults to `https://ntfy.sh`) |

**pushover config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `userKey` | string | Yes | Pushover user key (alphanumeric, max 50 chars) |
| `appToken` | string | Yes | Pushover application API token (alphanumeric, max 50 chars) |

**telegram config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `botToken` | string | Yes | Bot token from @BotFather, format `<bot_id>:<secret>` |
| `chatId` | string | Yes | Telegram chat ID (numeric, optionally negative for groups/channels) |

Example:
```json
{
  "type": "telegram",
  "config": { "botToken": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", "chatId": "987654321" },
  "enabled": true
}
```

**email config:**

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string (email) | Yes | Destination email address (max 254 chars) |

Email delivery requires SMTP credentials configured on the server instance via the
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `SMTP_SECURE`
environment variables (see `docs/environment-variables.md`). When SMTP is not
configured the email channel cannot be saved and is hidden in the settings UI.

Example:
```json
{
  "type": "email",
  "config": { "address": "you@example.com" },
  "enabled": true
}
```

Response: `{ "success": true }`

### DELETE /api/settings/notification-channels/:type

Removes the channel. Response: `{ "success": true }`

### POST /api/settings/notification-channels/:type/test

Sends a test notification to verify the channel works. Rate limited to 3/min.

Response: `{ "success": true }` or `400` if channel not configured.

---

## Push Notification Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/push/subscribe` | Yes | Save push subscription + enable notifications |
| `PATCH` | `/api/push/subscribe` | Yes | Update notification time without re-subscribing |
| `DELETE` | `/api/push/subscribe` | Yes | Remove subscription + disable notifications |
| `POST` | `/api/push/test` | Yes | Send a test push notification to the current user |

### POST /api/push/subscribe

Request body:
```json
{
  "subscription": {
    "endpoint": "https://push.example.com/...",
    "keys": { "p256dh": "...", "auth": "..." }
  },
  "notificationTime": "08:00"
}
```

Response: `{ "success": true }`

### PATCH /api/push/subscribe

Updates only the `notificationTime` for the current user. Does not require the push subscription object.

Request body:
```json
{ "notificationTime": "06:30" }
```

Response: `{ "success": true }`

---

## Cron Routes

Protected by `CRON_SECRET` (not by user session). Pass as:
`Authorization: Bearer <CRON_SECRET>`

If `CRON_SECRET` is not set, these routes are unprotected — set it in production.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cron` | CRON_SECRET | Unified cron dispatcher — runs all registered jobs |

The Docker cron container calls `POST /api/cron` every 5 minutes. The server-side dispatcher in `lib/cron.ts` runs all registered jobs sequentially, each with its own idempotency guard:

| Job | Guard | Description |
|---|---|---|
| `daily-quest` | 5-min bucket | Send daily quest push notifications based on user's local notification time |
| `streak-reminder` | Once per day | Send streak-at-risk reminders to users who haven't completed a task today |
| `weekly-review` | 5-min bucket | Send weekly review summary (Sunday 18:00 local time only) |

Response format: `{ "jobs": [{ "name": "daily-quest", "sent": 5, "failed": 0, "durationMs": 42, "skipped": false }, ...] }`

Jobs with `logToDb: true` persist each run to the `cron_runs` table (visible on the admin page and via `GET /api/health`). Rows older than 30 days are pruned automatically.

Adding a new cron job only requires adding an entry to the `CRON_JOBS` array in `lib/cron.ts` — no Docker Compose or endpoint changes needed.

---

## User Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `DELETE` | `/api/user` | Yes | 5/hour | Permanently delete account + all data |
| `GET` | `/api/user/export` | Yes | 5/hour | Download all personal data as JSON |
| `PATCH` | `/api/user/profile` | Yes | 10/min | Update profile (name, email, avatar) |

### DELETE /api/user

Permanently deletes the authenticated user's account. All associated data is removed via `ON DELETE CASCADE` PostgreSQL constraints (tasks, topics, wishlist items, sessions, OAuth accounts, achievements, task completions).

After a successful response the client calls `signOut()` and redirects to `/login`.

Response: `{ "success": true }`

### GET /api/user/export

Returns all personal data as a downloadable JSON file. Implements DSGVO Art. 15 (right of access) and Art. 20 (data portability).

Response: JSON file attachment — `momo-export-YYYY-MM-DD.json`

**Included:** profile, topics, tasks, task completions, wishlist items, earned achievements.
**Excluded:** OAuth tokens, session tokens, push subscription (internal/sensitive).

```json
{
  "exportedAt": "2026-04-03T12:00:00.000Z",
  "version": "1",
  "profile": { "id": "...", "name": "...", "email": "...", "coins": 42 },
  "topics": [...],
  "tasks": [...],
  "taskCompletions": [...],
  "wishlistItems": [...],
  "achievements": [{ "key": "first_task_completed", "title": "...", "earnedAt": "..." }]
}
```

### PATCH /api/user/profile

Updates the authenticated user's profile. All fields are optional — only provided fields are updated. Profile pictures are resized server-side to 200×200px WebP and stored as data URLs in the database.

**Request body:**

```json
{
  "name": "New Name",
  "email": "new@example.com",
  "image": "data:image/png;base64,..."
}
```

| Field | Type | Description |
|---|---|---|
| `name` | `string` (1–100 chars) | Display name |
| `email` | `string` (valid email, max 255 chars) | Email address (must be unique) |
| `image` | `string \| null` | Base64 data URL (PNG/JPEG/GIF/WebP/BMP) or `null` to remove |

**Success response:** `{ "user": { "name": "...", "email": "...", "image": "..." } }`

**Error responses:**

| Status | Code | When |
|---|---|---|
| 409 | `EMAIL_TAKEN` | Email already in use by another account |
| 422 | `INVALID_IMAGE` | Unsupported image format |
| 422 | — | Validation error (details in `details` field) |
| 429 | `RATE_LIMITED` | Exceeded 10 requests/minute |

---

## Calendar Feed Routes

Private iCalendar subscription feed per user. Third-party calendar clients (Google Calendar, Apple Calendar, Outlook, Thunderbird) subscribe to the feed URL and poll it periodically. Tasks with a due date become all-day events; `RECURRING` tasks emit an `RRULE` and appear as a series.

### GET /api/calendar/:token

Returns the user's iCalendar feed. **Unauthenticated** — the token in the URL path *is* the authentication. An optional `.ics` suffix is accepted for clients that expect a file extension (`/api/calendar/momo_cal_abc.ics` works too).

Unknown, revoked, or malformed tokens return **404** (not 401) so the endpoint does not leak which tokens exist.

**Response:**
- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: inline; filename="momo.ics"`
- `Cache-Control: private, max-age=900` (15 min)

**Selection rules:**
- Only tasks owned by the token's user
- Excludes completed `ONE_TIME` tasks (`completed_at IS NOT NULL`)
- Requires either `due_date` or (for `RECURRING`) `next_due_date` to be set
- Snoozed tasks and tasks in sequential topics are included — the calendar shows the plan, not the actionable list

**Event rules:**
- All events are all-day `VEVENT`s (`DTSTART;VALUE=DATE:YYYYMMDD`)
- UID is `task-<taskId>@momo` — stable across polls, so updates merge in place
- `RECURRING` tasks get `RRULE:FREQ=DAILY;INTERVAL=<recurrenceInterval>` with DTSTART = `next_due_date` and no UNTIL
- `SUMMARY` = task title; `DESCRIPTION` = notes + topic name + deep link; `URL` = deep link into Momo; `CATEGORIES` = topic name

**Rate limit:** 60 requests / minute / token.

### GET /api/settings/calendar-feed

Returns the current feed status for the authenticated user. Never returns the token itself.

**Auth:** Browser session (and 2FA-verified, if the user has any second factor set up).

**Response:**
```json
{ "active": true, "createdAt": "2026-04-08T12:00:00.000Z" }
```

### POST /api/settings/calendar-feed

Generates a new feed token, replacing any existing one. The previous URL stops working immediately. The plaintext URL is returned **once** and never retrievable again — the server only stores a SHA-256 hash.

**Auth:** Browser session (and 2FA-verified).

**Rate limit:** 10 mutations / minute / user.

**Response:**
```json
{
  "url": "https://momo.example.com/api/calendar/momo_cal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.ics",
  "createdAt": "2026-04-08T12:00:00.000Z"
}
```

### DELETE /api/settings/calendar-feed

Revokes the current feed token. The subscription URL stops working immediately. Idempotent — safe to call when no feed is active.

**Auth:** Browser session (and 2FA-verified).

**Response:**
```json
{ "success": true }
```

---

## Response Format

All routes return consistent JSON. On error, `error` is always a human-readable string.

**Success:**
```json
{ "task": { ... } }
```
*(field name varies by resource — `task`, `topic`, `item`, `success`, etc.)*

**Error:**
```json
{ "error": "Task not found" }
```

**Rate limit exceeded (429):**
```json
{ "error": "Rate limit exceeded" }
```
Includes `Retry-After` header with seconds until reset.

---

## Authentication

All application API routes (except `/api/health`, `/api/locale`, and `/api/auth/*`) require a valid session cookie. The session is validated using Auth.js `auth()` at the start of every handler.

Unauthenticated requests return `401`:
```json
{ "error": "Unauthorized" }
```
