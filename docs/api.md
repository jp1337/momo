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

## Authentication Routes

Managed by Auth.js v5. These routes are handled internally by the framework.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/session` | Returns the current session (or null) |
| `GET` | `/api/auth/signin` | Initiates the OAuth sign-in flow |
| `GET` | `/api/auth/callback/:provider` | OAuth provider callback |
| `POST` | `/api/auth/signout` | Signs the user out |
| `GET` | `/api/auth/csrf` | Returns a CSRF token |

---

## System Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Liveness probe — returns `{ status: "ok" }` or `503` on DB error |
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
  "title": "Tax Return",
  "description": "All documents and tasks for this year's return",
  "color": "#52a06e",
  "icon": "📂",
  "priority": "HIGH"
}
```

`title` is required. Response: `{ "topic": Topic }` — Status `201`

### GET /api/topics/:id

Returns the topic with its full task list (both open and completed tasks).

Response: `{ "topic": Topic & { tasks: Task[] } }`

### PATCH /api/topics/:id

All fields optional. Same shape as POST body. Response: `{ "topic": Topic }`

### DELETE /api/topics/:id

Deletes the topic. All associated tasks have their `topicId` set to `null` (they become standalone tasks, not deleted).

Response: `{ "success": true }`

---

## Daily Quest Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `GET` | `/api/daily-quest` | Yes | — | Get today's quest (auto-selects if none active) |
| `POST` | `/api/daily-quest` | Yes | — | Force a new quest selection |
| `POST` | `/api/daily-quest/postpone` | Yes | 10/min | Postpone today's quest to tomorrow |

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

---

## Push Notification Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/push/subscribe` | Yes | Save push subscription + enable notifications |
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

---

## Cron Routes

Protected by `CRON_SECRET` (not by user session). Pass as:
`Authorization: Bearer <CRON_SECRET>`

If `CRON_SECRET` is not set, these routes are unprotected — set it in production.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cron/daily-quest` | CRON_SECRET | Send daily quest push notifications to all eligible users |
| `POST` | `/api/cron/streak-reminder` | CRON_SECRET | Send streak reminder push notifications |

Response format for both: `{ "sent": 5, "failed": 0 }`

---

## User Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `DELETE` | `/api/user` | Yes | 5/hour | Permanently delete account + all data |
| `GET` | `/api/user/export` | Yes | 5/hour | Download all personal data as JSON |

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
