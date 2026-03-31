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
| `OIDC_CLIENT_ID` | Optional | Generic OIDC Client ID (Authentik, Keycloak, etc.) |
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

## Cron Job Protection

| Variable | Default | Description |
|---|---|---|
| `CRON_SECRET` | — | Bearer token required by `/api/cron/*` routes. Include as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. If unset, cron routes are unprotected. |

Protect cron routes in production:

```bash
CRON_SECRET=$(openssl rand -hex 32)
```

Call cron routes with:

```bash
curl -X POST https://your-domain.com/api/cron/daily-quest \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Application

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the application (used for links in notifications) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Auth.js callback base URL. Must match your domain exactly. |
| `NODE_ENV` | `development` | Runtime environment: `development`, `production`, or `test` |

In production, set both `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to your public HTTPS domain:

```env
NEXT_PUBLIC_APP_URL=https://momo.example.com
NEXTAUTH_URL=https://momo.example.com
```

---

## Docker Compose

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | `password` | PostgreSQL password used by `docker-compose.yml` for the `db` service |

This variable is only needed when using the included `docker-compose.yml`. Make sure it matches the password in `DATABASE_URL`.

---

## Complete Example

A minimal `.env.local` for local development with GitHub OAuth:

```env
# Database
DATABASE_URL=postgresql://momo:password@db:5432/momo
POSTGRES_PASSWORD=password

# Auth
AUTH_SECRET=replace-this-with-openssl-rand-base64-32-output

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

A production `.env.local` with all features enabled:

```env
# Database
DATABASE_URL=postgresql://momo:strongpassword@db:5432/momo
POSTGRES_PASSWORD=strongpassword

# Auth
AUTH_SECRET=your-32-byte-base64-secret

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret

# VAPID (push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_CONTACT=mailto:admin@example.com

# Cron protection
CRON_SECRET=your-hex-cron-secret

# URLs
NEXT_PUBLIC_APP_URL=https://momo.example.com
NEXTAUTH_URL=https://momo.example.com
NODE_ENV=production
```
