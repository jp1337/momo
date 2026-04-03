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

## Cron Job Protection

| Variable | Type | Default | Description |
|---|---|---|---|
| `CRON_SECRET` | string | — | Bearer token required by `/api/cron/*` routes. Include as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. Optional — if unset, cron routes are unprotected. |

## Application

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Public URL shown in the UI (e.g. in legal pages) |
| `NEXTAUTH_URL` | string (URL) | `http://localhost:3000` | Base URL used by Auth.js to construct OAuth callback URLs. Must match the **Homepage URL** / **Authorized redirect URI** set in each OAuth provider app. In production: `https://yourdomain.com` |
| `NODE_ENV` | `development` \| `production` \| `test` | `development` | Runtime environment. **Set to `production` in production deployments** — this enables stricter CSP headers and disables the PWA service worker in dev. |

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
