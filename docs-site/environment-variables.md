---
layout: default
title: Environment Variables
description: All environment variables for configuring a self-hosted Momo instance.
---

# Environment Variables

All environment variables for Momo are documented here. Copy `.env.example` to `.env.local` and fill in the values before starting the app.

---

## Required Variables

These must be set for the application to start.

| Variable | Type | Description |
|---|---|---|
| `DATABASE_URL` | string (URL) | PostgreSQL connection string — `postgresql://user:pass@host:port/db` |
| `AUTH_SECRET` | string (min 32 chars) | Secret for signing Auth.js JWTs and cookies. Generate with `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` \| `false` | **Required in production behind a reverse proxy.** Auth.js v5 rejects requests from hosts it doesn't recognise unless this is `true`. Set for all Docker Compose + Caddy/nginx deployments and all Kubernetes clusters. Leave `false` for local development without a proxy. |

---

## OAuth Providers

At least one provider must be configured for login to work.

| Variable | Required | Description |
|---|---|---|
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth App Client Secret |
| `DISCORD_CLIENT_ID` | Optional | Discord Application Client ID |
| `DISCORD_CLIENT_SECRET` | Optional | Discord Application Client Secret |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret |
| `MICROSOFT_CLIENT_ID` | Optional | Microsoft Application (Client) ID — **private accounts only** (Outlook.com, Hotmail, Live, Xbox). Work / school / Microsoft 365 accounts are intentionally not supported (tenant pinned to `consumers`). See the [Microsoft setup guide](/momo/oauth-setup#microsoft-private-accounts-only). |
| `MICROSOFT_CLIENT_SECRET` | Optional | Microsoft Client Secret **Value** — make sure you copy the *Value* column in the Azure portal, **not** the *Secret ID* (very common mistake). |
| `OIDC_CLIENT_ID` | Optional | Generic OIDC Client ID (Authentik, Keycloak, Zitadel, etc.) |
| `OIDC_CLIENT_SECRET` | Optional | Generic OIDC Client Secret |
| `OIDC_ISSUER` | Optional | OIDC Issuer URL. Setting this activates the OIDC login button. |

See the [OAuth Setup guide](/momo/oauth-setup) for provider-specific registration instructions.

---

## Web Push / VAPID

Required only if you want push notification support.

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | VAPID public key (exposed to the browser for push subscriptions) |
| `VAPID_PRIVATE_KEY` | — | VAPID private key (server-side only, never exposed to the browser) |
| `VAPID_CONTACT` | `mailto:admin@example.com` | Contact email or URL for VAPID |

Generate a VAPID key pair:

```bash
npx web-push generate-vapid-keys
```

The output will look like:

```
Public Key:
BExamplePublicKeyHere...

Private Key:
ExamplePrivateKeyHere...
```

Copy each value to the corresponding variable in `.env.local`.

---

## Email Notifications (SMTP)

Optional. These variables enable the **Email** notification channel that users can opt into from **Settings → Additional Notification Channels**. The channel is hidden in the UI when `SMTP_HOST` is unset, so leaving these blank is a safe no-op.

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | — | SMTP server hostname (e.g. `smtp.gmail.com`). Leave empty to disable email notifications. |
| `SMTP_PORT` | `587` | SMTP port. `587` for STARTTLS, `465` for implicit TLS. |
| `SMTP_USER` | — | SMTP authentication username. Optional if your SMTP server allows unauthenticated relay (e.g. local Mailpit). |
| `SMTP_PASS` | — | SMTP authentication password / app password. |
| `SMTP_FROM` | — | Sender address used as the `From:` header, e.g. `"Momo <noreply@momotask.app>"`. Required for delivery. |
| `SMTP_SECURE` | `false` | `true` for implicit TLS (port 465), `false` for STARTTLS (port 587). |

**Gmail with App Password:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx          # 16-char Google App Password
SMTP_FROM="Momo <you@gmail.com>"
SMTP_SECURE=false
```

**Mailpit (local development, no auth):**

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="Momo <noreply@localhost>"
SMTP_SECURE=false
```

Run Mailpit with `docker run -p 1025:1025 -p 8025:8025 axllent/mailpit` and view captured emails at `http://localhost:8025`.

> The other notification channels (ntfy.sh, Pushover, Telegram) are configured per user in the settings UI — no environment variables needed.

---

## Cron Job Protection

| Variable | Default | Description |
|---|---|---|
| `CRON_SECRET` | — | Bearer token required by `POST /api/cron`. Include as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. If unset, the cron route is unprotected. |

Protect the cron route in production:

```bash
CRON_SECRET=$(openssl rand -hex 32)
```

Call the unified cron dispatcher:

```bash
curl -X POST https://your-domain.com/api/cron \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Application

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the application. Used for notification links, the PWA, and **SEO** (`robots.txt`, `sitemap.xml`, Open Graph tags, JSON-LD). Set this to your real HTTPS origin in production or search engines will index `localhost`. |
| `NEXTAUTH_URL` | `http://localhost:3000` | Auth.js callback base URL. Must exactly match the Homepage URL and Authorized redirect URI configured in each OAuth provider app. In production: `https://your-domain.com` |
| `NODE_ENV` | `development` | Runtime environment: `development`, `production`, or `test`. Set to `production` in all production deployments. |
| `DISABLE_UPDATE_CHECK` | `false` | Set to `true` to disable the automatic update check. When enabled, Momo queries the GitHub Releases API once per 24 hours and shows a banner in the Admin panel when a newer version is available. Disable this for air-gap or offline installations where outbound access to `api.github.com` is not permitted. |

In production, set both `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to your public HTTPS domain:

```env
NEXT_PUBLIC_APP_URL=https://momo.example.com
NEXTAUTH_URL=https://momo.example.com
```

---

## Two-Factor Authentication

Optional. The TOTP feature is fully self-contained — no external services required.

| Variable | Default | Description |
|---|---|---|
| `TOTP_ENCRYPTION_KEY` | — | AES-256-GCM key used to encrypt TOTP secrets at rest in the database. **Required** as soon as any user enables 2FA, or when `REQUIRE_2FA=true`. Must be exactly 64 hex characters (32 bytes). Generate with `openssl rand -hex 32`. **Treat this as critical secret material** — rotating it invalidates every existing TOTP secret and forces every user to re-enroll. |
| `REQUIRE_2FA` | `false` | When `true`, every user must register a second factor (TOTP **or** Passkey) before they can access any protected route. Existing users without a second factor are hard-locked to a forced setup page on their next login. Removing the last remaining second factor is blocked, both in the UI and by a `403` at the API. |
| `WEBAUTHN_RP_ID` | hostname of `NEXT_PUBLIC_APP_URL` | WebAuthn Relying Party ID. Must be the eTLD+1 hostname of your site (no scheme, no port, no path) — for example `momotask.app`, or `localhost` during development. A mismatch with the actual origin breaks passkey registration and login. |
| `WEBAUTHN_RP_NAME` | `Momo` | Display name shown in the OS / browser passkey prompt. Purely cosmetic. |

> Setting `REQUIRE_2FA=true` without `TOTP_ENCRYPTION_KEY` will refuse to start. Make sure both are present.

End-user guide → [Two-Factor Authentication](/momo/two-factor-auth) · [Passkeys](/momo/passkeys)
Operator guide → [Self-Hosting → Enforcing two-factor authentication](/momo/self-hosting#enforcing-two-factor-authentication)

---

## Admin Access

| Variable | Default | Description |
|---|---|---|
| `ADMIN_USER_IDS` | — | Comma-separated list of user UUIDs that can access the `/admin` aggregate-statistics page. If unset or empty, the admin page is inaccessible to everyone. |

Example with two admins:

```env
ADMIN_USER_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

Find a user's UUID in the database with `SELECT id, email FROM users;`.

---

## Legal Pages (DSGVO / § 5 TMG)

Required for publicly accessible deployments in Germany and recommended everywhere. These values are rendered on `/impressum` and `/datenschutz`. If unset, those pages show a configuration warning instead of legal content.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_IMPRINT_NAME` | Public deployments | Full legal name of the operator (§ 5 TMG) |
| `NEXT_PUBLIC_IMPRINT_ADDRESS` | Public deployments | Street address, postcode, city |
| `NEXT_PUBLIC_IMPRINT_EMAIL` | Public deployments | Contact / data protection email address |
| `NEXT_PUBLIC_IMPRINT_PHONE` | Optional | Phone number (recommended for § 5 TMG) |

---

## Docker Compose

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `password` | PostgreSQL password used by `docker-compose.yml` for the `db` service. Must match the password in `DATABASE_URL`. |

---

## Complete Example

A minimal `.env.local` for local development with GitHub OAuth:

```env
# Database
DATABASE_URL=postgresql://momo:password@db:5432/momo
POSTGRES_PASSWORD=password

# Auth
AUTH_SECRET=replace-this-with-openssl-rand-base64-32-output
AUTH_TRUST_HOST=false

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

A production `.env.local` with all features enabled (behind a reverse proxy):

```env
# Database
DATABASE_URL=postgresql://momo:strongpassword@db:5432/momo
POSTGRES_PASSWORD=strongpassword

# Auth
AUTH_SECRET=your-32-byte-base64-secret
AUTH_TRUST_HOST=true

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# VAPID (push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT=mailto:admin@example.com

# Email notifications (optional — enables the Email channel in user settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-smtp-app-password
SMTP_FROM="Momo <you@gmail.com>"
SMTP_SECURE=false

# Cron protection
CRON_SECRET=your-hex-cron-secret

# Two-factor authentication (required if any user enables 2FA, or REQUIRE_2FA=true)
TOTP_ENCRYPTION_KEY=64-hex-characters-from-openssl-rand-hex-32
REQUIRE_2FA=false

# Passkeys (optional — auto-derived from NEXT_PUBLIC_APP_URL when unset)
WEBAUTHN_RP_ID=momo.example.com
WEBAUTHN_RP_NAME=Momo

# URLs
NEXT_PUBLIC_APP_URL=https://momo.example.com
NEXTAUTH_URL=https://momo.example.com
NODE_ENV=production

# Legal pages (required for public deployments in Germany)
NEXT_PUBLIC_IMPRINT_NAME=Max Mustermann
NEXT_PUBLIC_IMPRINT_ADDRESS=Musterstraße 1, 12345 Berlin
NEXT_PUBLIC_IMPRINT_EMAIL=kontakt@example.com
NEXT_PUBLIC_IMPRINT_PHONE=+49 30 123456
```
