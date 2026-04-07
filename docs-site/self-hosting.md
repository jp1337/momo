---
layout: default
title: Self-Hosting
description: Everything you need to run Momo on your own server — Docker Compose, environment variables, OAuth, and Kubernetes.
---

# Self-Hosting Momo

All guides for running Momo on your own infrastructure.

<div class="features-grid" style="margin-top: 1.5rem;">
  <a href="/momo/getting-started" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">🚀</div>
    <h3>Getting Started</h3>
    <p>Run Momo locally in under 10 minutes with Docker Compose. Start here.</p>
  </a>
  <a href="/momo/deployment" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">🐳</div>
    <h3>Deployment</h3>
    <p>Production setup — Docker Compose with a reverse proxy, automatic updates via Watchtower.</p>
  </a>
  <a href="/momo/environment-variables" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">⚙️</div>
    <h3>Environment Variables</h3>
    <p>Complete reference for all configuration options — database, auth, push notifications, and more.</p>
  </a>
  <a href="/momo/oauth-setup" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">🔐</div>
    <h3>OAuth Setup</h3>
    <p>Register OAuth apps for GitHub, Discord, Google, or any OIDC provider (Authentik, Keycloak, etc.).</p>
  </a>
  <a href="/momo/two-factor-auth" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">🛡️</div>
    <h3>Two-Factor Auth</h3>
    <p>Optional TOTP for end users, plus an instance-wide enforcement switch (<code>REQUIRE_2FA=true</code>).</p>
  </a>
  <a href="/momo/kubernetes" class="feature-card" style="text-decoration: none; display: block;">
    <div class="icon">☸️</div>
    <h3>Kubernetes</h3>
    <p>Deploy to a Kubernetes cluster with the provided manifests.</p>
  </a>
</div>

---

## Quick reference

### Minimum setup

```bash
git clone https://github.com/jp1337/momo.git && cd momo
cp .env.example .env.local
# Set DATABASE_URL, AUTH_SECRET, and at least one OAuth provider
docker compose up -d
```

### Required environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| At least one OAuth provider | `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`, or Discord/Google/OIDC |

> **Behind a reverse proxy?** Also set `AUTH_TRUST_HOST=true`.

Full reference → [Environment Variables](/momo/environment-variables)

### Enforcing two-factor authentication

If you want to require every user on your instance to set up TOTP 2FA before they can use Momo:

1. Generate an encryption key for the TOTP secrets:

   ```bash
   openssl rand -hex 32
   ```

2. Add both lines to your `.env.local`:

   ```
   TOTP_ENCRYPTION_KEY=<the 64-character hex string from above>
   REQUIRE_2FA=true
   ```

3. Restart Momo (`docker compose up -d`).

From the next sign-in onwards, every account is sent to a forced setup page until they enroll an authenticator app. Existing users get the same prompt — no migration is needed. The "disable 2FA" button in the user settings is hidden while `REQUIRE_2FA=true` is set.

> **⚠️ Plan for recovery first.** Once a user has 2FA on, losing both their authenticator app and all their backup codes means they cannot self-recover. You as the operator can clear their 2FA columns directly in the database. The exact SQL is in the [technical guide](https://github.com/jp1337/momo/blob/main/docs/two-factor-auth.md#recovery-for-a-locked-out-user). Make sure your users know to keep backup codes safe **before** you flip the switch.

> **⚠️ Treat `TOTP_ENCRYPTION_KEY` as critical.** Rotating it invalidates every existing TOTP secret — every user would need to re-enroll. Back it up alongside your database password.

Full end-user guide → [Two-Factor Authentication](/momo/two-factor-auth)

### Container images

Available on three registries — pick whichever you prefer:

```
ghcr.io/jp1337/momo:latest
docker.io/kermit1337/momo:latest
quay.io/jp1337/momo:latest
```
