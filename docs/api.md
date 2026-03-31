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

> Phase 2 and beyond. No application routes exist in Phase 1.

Routes will be added here as features are implemented.

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
