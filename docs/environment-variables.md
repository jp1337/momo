# Environment Variables

All environment variables for the Momo application are documented here.
Copy `.env.example` to `.env.local` and fill in the values before starting the app.

## Required Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | string (URL) | — | PostgreSQL connection string (`postgresql://user:pass@host:port/db`) |
| `AUTH_SECRET` | string (min 32 chars) | — | Secret for signing Auth.js JWTs and cookies. Generate with `openssl rand -base64 32` |

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
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | Public URL of the application |
| `NEXTAUTH_URL` | string (URL) | `http://localhost:3000` | Auth.js callback base URL |
| `NODE_ENV` | `development` \| `production` \| `test` | `development` | Runtime environment |

## Docker Compose

| Variable | Type | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | string | `password` | PostgreSQL password used by docker-compose.yml |
