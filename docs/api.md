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
