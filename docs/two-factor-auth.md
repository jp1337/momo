# Two-Factor Authentication (TOTP)

Momo supports RFC 6238 TOTP (Time-based One-Time Password) as an additive
second factor on top of every OAuth provider. This document covers the
technical details for self-hosters and developers — for end users, see
[`docs-site/two-factor-auth.md`](../docs-site/two-factor-auth.md).

## Overview

| Aspect | Implementation |
|---|---|
| Standard | RFC 6238 TOTP, 30-second period, 6 digits, SHA-1, ±1 step drift tolerance |
| Library | [`otplib`](https://www.npmjs.com/package/otplib) v13 |
| Secret storage | AES-256-GCM, fresh IV per encryption, key from `TOTP_ENCRYPTION_KEY` |
| Backup codes | 10 codes per batch, 10 chars from a 32-char unambiguous alphabet (no `I`/`O`/`0`/`1`), SHA-256 hashed at rest, single-use |
| Session binding | New `sessions.totp_verified_at` column — every fresh OAuth session must re-verify |
| Enforcement | Optional `REQUIRE_2FA=true` env var — hard-lock to `/setup/2fa` for users without a second factor |
| Method-agnostic gate | `userHasSecondFactor(userId)` in `lib/totp.ts` — single touchpoint for the future Passkey feature |
| API key exemption | Bearer-token (Personal Access Token) callers bypass 2FA by design |

## User-facing flows

### Enabling 2FA (opt-in)

1. User opens **Settings → Two-factor authentication** and clicks **Enable 2FA**.
2. The wizard calls `POST /api/auth/2fa/setup`. The server generates a fresh
   secret, stashes the plaintext in a signed httpOnly cookie (`momo_totp_setup`,
   10-minute TTL), and returns the QR code (PNG data URL) plus the manual
   entry key. **Nothing is written to the database yet** — this prevents
   leaving a half-configured plaintext path on disk if the user abandons setup.
3. The user scans the QR code with an authenticator app (Aegis, 2FAS, Google
   Authenticator, Authy, 1Password, …) and types the first 6-digit code.
4. The wizard calls `POST /api/auth/2fa/verify-setup`. The server verifies
   the code against the cookie's secret, then atomically:
   - Encrypts the secret with AES-256-GCM and writes `users.totp_secret`
   - Sets `users.totp_enabled_at = now()`
   - Generates 10 backup codes, hashes them, writes the hashes
   - Marks the current `sessions.totp_verified_at = now()` so the user is
     not bounced to `/login/2fa` on the next page load
   - Deletes the setup cookie
5. The 10 plaintext backup codes are returned **exactly once** in the response
   and rendered in the UI with download/copy buttons. They are never refetched.

### Logging in with 2FA active

1. User signs in with their OAuth provider as usual. Auth.js creates a fresh
   session row with `totp_verified_at = NULL`.
2. The first request into a protected route hits the `(app)` layout gate
   (`app/(app)/layout.tsx`). The gate sees `users.totp_enabled_at IS NOT NULL`
   and `sessions.totp_verified_at IS NULL`, and redirects to `/login/2fa`.
3. The user enters either a 6-digit TOTP code or a 10-character backup code.
   The form calls `POST /api/auth/2fa/verify`.
4. On success, the server marks `sessions.totp_verified_at = now()` for the
   current session row and the user is redirected to `/dashboard`.

### Disabling 2FA

1. User opens **Settings → Two-factor authentication** and clicks **Disable**.
2. The user enters a current 6-digit code (or backup code) as
   re-authentication. Knowing the OAuth session cookie alone is **not**
   sufficient.
3. `POST /api/auth/2fa/disable` verifies the code, then atomically clears
   `users.totp_secret`, `users.totp_enabled_at`, and all rows in
   `totp_backup_codes` for the user.

The disable endpoint returns `403 TOTP_REQUIRED_BY_ADMIN` when
`REQUIRE_2FA=true`. The button is also hidden in the UI in that case, so
client and server agree.

### Regenerating backup codes

1. User enters a current 6-digit code (backup codes are not accepted here for
   clarity — using one would consume one of the codes being replaced).
2. `POST /api/auth/2fa/regenerate-backup-codes` verifies the code, deletes
   all existing backup codes for the user, and inserts 10 fresh ones. The
   plaintext is returned exactly once.

## Admin enforcement (`REQUIRE_2FA`)

Set `REQUIRE_2FA=true` to make 2FA mandatory for every account on this Momo
instance. Behaviour:

- Users **without** any second factor are redirected to `/setup/2fa` on
  every request to a protected route. The page lives outside the `(app)`
  route group so it does not loop into itself. The only escape is the
  sign-out button.
- Users **with** an active second factor are unaffected by enforcement —
  they go through the normal `/login/2fa` flow on each new session.
- The disable endpoint returns 403; the disable button is hidden in the UI.
- The setting takes effect immediately on the next request — no migration
  is needed for existing users.

Setting `REQUIRE_2FA=true` without `TOTP_ENCRYPTION_KEY` will fail at
startup with a Zod validation error from `lib/env.ts`.

## API key exemption

Personal Access Tokens (`Authorization: Bearer momo_live_…`) bypass the 2FA
gate completely. The reasoning:

- An API key is itself a separately-issued, revocable, per-user credential.
  Forcing a 30-second-rotating TOTP code on top of a long-lived bearer
  token would break every programmatic integration without adding real
  security.
- API keys cannot be used to disable 2FA, regenerate backup codes, or
  perform any of the `/api/auth/2fa/*` endpoints — those routes use
  `auth()` directly and reject `Authorization` headers.

If you need stricter behaviour, the helper `resolveVerifiedApiUser()` in
`lib/api-auth.ts` is available for opt-in enforcement on individual routes.
It still exempts Bearer tokens; cookie-based callers without verified 2FA
get `401 TOTP_REQUIRED`.

## Recovery for a locked-out user

If a user loses both their authenticator app **and** all backup codes,
they cannot log in on their own. The operator must clear the 2FA columns
directly in the database:

```sql
UPDATE users
SET totp_secret = NULL,
    totp_enabled_at = NULL
WHERE email = '<user-email>';

DELETE FROM totp_backup_codes
WHERE user_id = (SELECT id FROM users WHERE email = '<user-email>');
```

After this the user can log in via OAuth and re-enroll. If `REQUIRE_2FA=true`
is set, they will be hard-locked to `/setup/2fa` on the very next request
and must immediately re-enroll before doing anything else.

## Database schema

See [database.md](database.md) for the full schema. The 2FA-relevant
additions:

- `users.totp_secret` — `text`, AES-256-GCM ciphertext (`iv:tag:cipher`,
  base64 segments separated by `:`). NULL when 2FA is off.
- `users.totp_enabled_at` — `timestamptz`. **Source of truth** for "is 2FA
  active". NULL means off, even if `totp_secret` is non-NULL.
- `sessions.totp_verified_at` — `timestamptz`. NULL on every fresh session
  until the user passes the `/login/2fa` challenge.
- `totp_backup_codes` — table with `(user_id, code_hash, used_at,
  created_at)`. Codes are SHA-256 hashed (mirrors `api_keys.key_hash`),
  cascade-deleted when the user is deleted, and single-use via `used_at`.

Migration: [`drizzle/0014_past_romulus.sql`](../drizzle/0014_past_romulus.sql).

## Files of interest

| File | Role |
|---|---|
| `lib/totp.ts` | All TOTP business logic + the `userHasSecondFactor` helper |
| `lib/utils/crypto.ts` | `encryptSecret`/`decryptSecret`/`hashBackupCode` |
| `lib/env.ts` | `TOTP_ENCRYPTION_KEY` + `REQUIRE_2FA` validation |
| `lib/api-auth.ts` | Optional `resolveVerifiedApiUser()` helper |
| `app/(app)/layout.tsx` | Server-side enforcement gate |
| `app/api/auth/2fa/*` | Five HTTP endpoints |
| `app/(auth)/login/2fa/page.tsx` | Login-time challenge |
| `app/setup/2fa/page.tsx` | Forced setup page (REQUIRE_2FA hard-lock) |
| `components/settings/security-section.tsx` | Settings UI entry point |
| `components/settings/totp-setup-wizard.tsx` | QR + verify wizard |
| `components/auth/totp-verify-form.tsx` | Login-time form |

## See also

- [environment-variables.md](environment-variables.md#two-factor-authentication-totp) — env var reference
- [api.md](api.md) — endpoint reference for `/api/auth/2fa/*`
- [database.md](database.md) — schema reference
- [`docs-site/two-factor-auth.md`](../docs-site/two-factor-auth.md) — end-user guide
