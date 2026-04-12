# Environment Variables

All environment variables for the Momo application are documented here.
Copy `.env.example` to `.env.local` and fill in the values before starting the app.

## Required Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | string (URL) | — | PostgreSQL connection string (`postgresql://user:pass@host:port/db`) |
| `AUTH_SECRET` | string (min 32 chars) | — | Secret for signing Auth.js JWTs and cookies. Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` \| `false` | `false` | **Required in production behind a reverse proxy.** Auth.js v5 rejects requests from hosts it doesn't recognise unless this is `true`. Must be set for Docker Compose + Caddy/nginx and all Kubernetes deployments. |

## OAuth Providers

At least one provider must be configured for login to work.

| Variable | Type | Required | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | string | Optional | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | string | Optional | GitHub OAuth App Client Secret |
| `DISCORD_CLIENT_ID` | string | Optional | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | string | Optional | Discord Application Client Secret |
| `GOOGLE_CLIENT_ID` | string | Optional | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | string | Optional | Google OAuth 2.0 Client Secret |
| `MICROSOFT_CLIENT_ID` | string | Optional | Microsoft Application (Client) ID. **Private accounts only** — work / school / Microsoft 365 accounts are intentionally not supported (tenant pinned to `consumers`). See [oauth-setup.md](oauth-setup.md#microsoft-private-accounts-only). |
| `MICROSOFT_CLIENT_SECRET` | string | Optional | Microsoft Client Secret **Value** (not the Secret ID — that's a common mistake). |
| `OIDC_CLIENT_ID` | string | Optional | Generic OIDC Client ID (Authentik, Keycloak, etc.) |
| `OIDC_CLIENT_SECRET` | string | Optional | Generic OIDC Client Secret |
| `OIDC_ISSUER` | string (URL) | Optional | OIDC Issuer URL. Enabling this activates the OIDC login button. |

## Web Push / VAPID

Required only if push notifications are enabled.

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | string | — | VAPID public key (exposed to browser for push subscriptions) |
| `VAPID_PRIVATE_KEY` | string | — | VAPID private key (server-side only) |
| `VAPID_CONTACT` | string | `mailto:admin@example.com` | Contact email/URL for VAPID |

Generate a VAPID key pair:
```bash
npx web-push generate-vapid-keys
```

## Email Notifications (SMTP)

SMTP credentials enable the **Email** notification channel that users can opt into from
**Settings → Additional Notification Channels**. The channel is hidden in the UI when
`SMTP_HOST` is unset, so leaving these blank is a safe no-op for instances that don't
want to host email.

| Variable | Type | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | string | — | SMTP server hostname (e.g. `smtp.gmail.com`). Leave empty to disable email notifications. |
| `SMTP_PORT` | number | `587` | SMTP port. Use `587` for STARTTLS, `465` for implicit TLS. |
| `SMTP_USER` | string | — | SMTP authentication username. Optional if your SMTP server allows unauthenticated relay (e.g. local Mailpit). |
| `SMTP_PASS` | string | — | SMTP authentication password / app password. |
| `SMTP_FROM` | string | — | Sender address used as the `From:` header, e.g. `"Momo <noreply@momotask.app>"`. Required for email delivery. |
| `SMTP_SECURE` | boolean (`true`/`false`) | `false` | `true` for implicit TLS (port 465), `false` for STARTTLS (port 587). |

### Example: Gmail with an App Password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx          # 16-char Google App Password
SMTP_FROM="Momo <you@gmail.com>"
SMTP_SECURE=false
```

### Example: Mailpit (local development)

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="Momo <noreply@localhost>"
SMTP_SECURE=false
```

Run Mailpit locally with: `docker run -p 1025:1025 -p 8025:8025 axllent/mailpit` and
inspect captured emails at `http://localhost:8025`.

## Cron Job Protection

| Variable | Type | Default | Description |
|---|---|---|---|
| `CRON_SECRET` | string | — | Bearer token required by `POST /api/cron` (unified cron dispatcher). Include as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. Optional — if unset, the cron route is unprotected. |

## Application

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Public URL of the application. Surfaces in the UI (legal pages, notification links), the PWA, and **SEO output** (`metadataBase`, `robots.txt`, `sitemap.xml`, Open Graph & Twitter Card URLs, JSON-LD `url`). Set this to the real HTTPS origin in production — otherwise search engines will index `localhost` and link previews break. See `docs/seo.md`. |
| `NEXTAUTH_URL` | string (URL) | `http://localhost:3000` | Base URL used by Auth.js to construct OAuth callback URLs. Must match the **Homepage URL** / **Authorized redirect URI** set in each OAuth provider app. In production: `https://yourdomain.com` |
| `NODE_ENV` | `development` \| `production` \| `test` | `development` | Runtime environment. **Set to `production` in production deployments** — this enables stricter CSP headers and disables the PWA service worker in dev. |
| `DISABLE_UPDATE_CHECK` | `true` \| `false` | Optional | Default `false`. When `true`, Momo skips the periodic GitHub Releases API check and the Admin panel will show a "disabled" notice instead of a version banner. Useful for air-gap / offline installations where outbound connections to `api.github.com` are blocked or undesirable. The check is cached for 24 hours per process and respects the standard 60 req/h unauthenticated GitHub rate limit. |

## Two-Factor Authentication (TOTP + Passkeys)

Optional. Both TOTP and Passkey support are fully self-contained — no
external services required.

| Variable | Type | Required | Description |
|---|---|---|---|
| `TOTP_ENCRYPTION_KEY` | string (64 hex chars) | When any user enables 2FA, or when `REQUIRE_2FA=true` | AES-256-GCM key for encrypting TOTP secrets at rest. Must be exactly 64 hex characters (32 bytes). Generate with `openssl rand -hex 32`. **Rotating this key invalidates every existing TOTP secret** — users would need to re-enroll their authenticator app. Treat it as critical secret material. |
| `REQUIRE_2FA` | `true` \| `false` | Optional | Default `false`. When `true`, every user is forced to register a second factor (TOTP or Passkey) before they can access any protected route. Existing users without a second factor are hard-locked to `/setup/2fa` on their next login. The "disable" buttons in the UI are hidden when removing the last remaining factor, and the corresponding API endpoints return `403 TOTP_REQUIRED_BY_ADMIN` / `403 SECOND_FACTOR_REQUIRED_BY_ADMIN`. Setting this to `true` requires `TOTP_ENCRYPTION_KEY` to also be set — startup will fail loudly otherwise. |
| `WEBAUTHN_RP_ID` | string (hostname) | Optional | WebAuthn Relying Party ID. Must be the eTLD+1 hostname of the site — no scheme, no port, no path. Examples: `momotask.app`, `localhost`. Defaults to the hostname extracted from `NEXT_PUBLIC_APP_URL` when unset. A mismatch between this value and the actual origin the user visits will cause every passkey registration and login attempt to fail silently in the browser. |
| `WEBAUTHN_RP_NAME` | string | Optional | Display name shown in the OS / browser passkey prompt (purely cosmetic). Default: `Momo`. |

**Recovery for a locked-out user.** If a user has lost both their authenticator app and all backup codes, the only way back in is an administrative DB write that clears their 2FA columns:

```sql
-- Replace <user-email> with the actual email.
UPDATE users
SET totp_secret = NULL,
    totp_enabled_at = NULL
WHERE email = '<user-email>';

DELETE FROM totp_backup_codes
WHERE user_id = (SELECT id FROM users WHERE email = '<user-email>');
```

After this, the user can log in normally and re-enroll. Document this clearly to your users — once `REQUIRE_2FA=true` is set, account recovery requires an operator. See [two-factor-auth.md](two-factor-auth.md) for the full lifecycle.

**Revoking all passkeys for a user.** If a user has lost every device that holds their passkey and cannot receive a TOTP challenge either, delete the rows manually:

```sql
DELETE FROM authenticators
WHERE user_id = (SELECT id FROM users WHERE email = '<user-email>');
```

The user can then log in via OAuth and register a new passkey in `/settings`.

## Admin Access

| Variable | Type | Default | Description |
|---|---|---|---|
| `ADMIN_USER_IDS` | string (comma-separated UUIDs) | — | Comma-separated list of user UUIDs that have access to the `/admin` statistics page. If unset or empty, the admin page shows "Zugriff verweigert" for everyone. Example: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` |

Find a user's UUID in the database: `SELECT id, email FROM users;`

## Legal Pages (DSGVO / § 5 DDG)

Required for publicly accessible deployments. These values are rendered on `/impressum` and `/datenschutz`.
Operators of self-hosted instances must fill these in with their own details.

| Variable | Type | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_IMPRINT_NAME` | string | Public deployments | Full legal name of the operator (§5 DDG) |
| `NEXT_PUBLIC_IMPRINT_ADDRESS` | string | Public deployments | Street address, postcode, city (may include newlines) |
| `NEXT_PUBLIC_IMPRINT_EMAIL` | string | Public deployments | Contact / data protection email address |
| `NEXT_PUBLIC_IMPRINT_PHONE` | string | No | Phone number (recommended for §5 DDG, optional) |

If these variables are not set, `/impressum` and `/datenschutz` display a configuration warning instead of legal content.

See [docs/gdpr.md](gdpr.md) for a full DSGVO compliance guide.

## Docker Compose

| Variable | Type | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | string | `password` | PostgreSQL password used by docker-compose.yml |
