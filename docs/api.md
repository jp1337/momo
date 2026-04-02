# API Reference

All API routes are prefixed with `/api`.

## Authentication Routes

Managed by Auth.js v5. These routes are handled internally by the framework.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/session` | Returns the current session (or null) |
| `GET` | `/api/auth/signin` | Initiates the OAuth sign-in flow |
| `GET` | `/api/auth/callback/:provider` | OAuth provider callback |
| `POST` | `/api/auth/signout` | Signs the user out |
| `GET` | `/api/auth/csrf` | Returns a CSRF token |

## Application Routes

### Task Action Routes

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/tasks/:id/promote-to-topic` | Yes | 10/min | Promote a standalone task to a new topic |

#### POST /api/tasks/:id/promote-to-topic

Promotes a standalone task (no `topicId`) to a new topic in a single atomic transaction.
The task's `title`, `notes`, and `priority` are mapped to the new topic.
The task is re-associated as the first subtask (`topicId` set to new topic's UUID).

Returns `409 Conflict` if the task already belongs to a topic.

Response (201 Created):
```json
{
  "topic": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Hochbeet bauen",
    "description": "optional notes from the original task",
    "color": null,
    "icon": null,
    "priority": "NORMAL",
    "archived": false,
    "createdAt": "2026-04-02T10:00:00Z"
  }
}
```

Error responses:
- `401` Unauthorized
- `404` Task not found
- `409` Task already belongs to a topic
- `429` Rate limit exceeded
- `500` Internal server error

---

### Wishlist Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/wishlist` | Yes | List all wishlist items + budget summary |
| `POST` | `/api/wishlist` | Yes | Create a new wishlist item |
| `PATCH` | `/api/wishlist/:id` | Yes | Update a wishlist item (partial) |
| `DELETE` | `/api/wishlist/:id` | Yes | Permanently delete a wishlist item |
| `POST` | `/api/wishlist/:id/buy` | Yes | Mark item as bought (status → BOUGHT) |
| `DELETE` | `/api/wishlist/:id/buy` | Yes | Revert bought item to OPEN |
| `POST` | `/api/wishlist/:id/discard` | Yes | Mark item as discarded (status → DISCARDED) |

#### GET /api/wishlist

Returns all wishlist items for the user plus the budget summary.

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "uuid",
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

#### POST /api/wishlist

Creates a new wishlist item.

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

Response: `{ "item": WishlistItem }` — Status `201`

#### PATCH /api/wishlist/:id

Partially updates a wishlist item. All fields optional.

Request body: Same fields as POST, all optional.

Response: `{ "item": WishlistItem }`

#### DELETE /api/wishlist/:id

Permanently deletes a wishlist item.

Response: `{ "success": true }`

#### POST /api/wishlist/:id/buy

Marks the item as bought.

Response: `{ "item": WishlistItem }`

#### DELETE /api/wishlist/:id/buy

Reverts a bought item back to OPEN.

Response: `{ "item": WishlistItem }`

#### POST /api/wishlist/:id/discard

Archives the item as discarded.

Response: `{ "item": WishlistItem }`

---

### Settings Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings/budget` | Yes | Get current monthly budget + spending summary |
| `PATCH` | `/api/settings/budget` | Yes | Update monthly budget |

#### GET /api/settings/budget

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

#### PATCH /api/settings/budget

Request body:
```json
{ "budget": 500 }
```

Send `null` to remove the budget limit. Response: `{ "success": true }`

---

### Push Notification Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/push/subscribe` | Yes | Save push subscription + enable notifications |
| `DELETE` | `/api/push/subscribe` | Yes | Remove subscription + disable notifications |
| `POST` | `/api/push/test` | Yes | Send a test push notification to the current user |

#### POST /api/push/subscribe

Saves the user's browser push subscription and enables notifications.

Request body:
```json
{
  "subscription": {
    "endpoint": "https://push.example.com/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "notificationTime": "08:00"
}
```

Response: `{ "success": true }`

#### DELETE /api/push/subscribe

Removes the push subscription and disables notifications.

Response: `{ "success": true }`

#### POST /api/push/test

Sends a test push notification to the current user's registered subscription.

Response: `{ "success": true }`

---

### Cron Routes

These routes are protected by `CRON_SECRET` (not by user session). Include the token as:
`Authorization: Bearer <CRON_SECRET>`

If `CRON_SECRET` is not set, the routes are unprotected.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cron/daily-quest` | CRON_SECRET | Send daily quest notifications to all eligible users |
| `POST` | `/api/cron/streak-reminder` | CRON_SECRET | Send streak reminder notifications |

#### POST /api/cron/daily-quest

Triggers push notifications for all users who have notifications enabled and an active push subscription.

Response:
```json
{ "sent": 5, "failed": 0 }
```

#### POST /api/cron/streak-reminder

Triggers streak reminder notifications for users with an active streak who haven't completed a task today.

Response:
```json
{ "sent": 3, "failed": 0 }
```

---

## Response Format

All API routes return consistent JSON responses.

### Success
```json
{
  "data": { ... }
}
```

### Error
```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

## Authentication

All application API routes require a valid session. The session is validated using Auth.js `auth()` at the start of every handler.

Unauthenticated requests return:
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```
Status: `401`
