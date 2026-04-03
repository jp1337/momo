---
layout: default
title: Deployment
description: Self-hosting Momo in production with Docker Compose or Kubernetes.
---

# Deployment

This guide covers running Momo in production. For a quick local setup, see [Getting Started](/momo/getting-started).

## Quick Start (Docker Compose)

The recommended way to self-host Momo.

### Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A domain name (optional, but recommended for production)
- At least one OAuth App configured (see [OAuth Setup](/momo/oauth-setup))

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/jp1337/momo.git
   cd momo
   ```

2. Copy and configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. Start all services:
   ```bash
   docker compose up -d
   ```

4. Run database migrations:
   ```bash
   docker compose exec app npx drizzle-kit migrate
   ```

5. Open `http://localhost:3000` (or your domain if behind a reverse proxy)

---

## Container Images

Images are published to three registries on every release:

| Registry | Image |
|---|---|
| GitHub Container Registry | `ghcr.io/jp1337/momo` |
| Docker Hub | `docker.io/jp1337/momo` |
| Quay.io | `quay.io/jp1337/momo` |

To use a pre-built image instead of building locally, replace the `build` section in `docker-compose.yml` with:

```yaml
app:
  image: ghcr.io/jp1337/momo:latest
```

---

## Dockerfile Notes

- Multi-stage build: `deps` → `builder` → `runner`
- Base image: `node:22-alpine` (Node.js 22 LTS, supported until April 2027)
- Runs as non-root user (`nextjs:1001`)
- Uses `output: standalone` for a minimal production bundle
- No dev dependencies in the final image
- Drizzle migration files (`drizzle/` + `drizzle.config.ts`) are included in the runner stage so `npx drizzle-kit migrate` works inside the container without mounting external volumes
- HEALTHCHECK hits `/api/health` every 30 seconds

---

## Production Checklist

Before going live, complete all items below:

- **Generate AUTH_SECRET** — must be at least 32 random bytes:
  ```bash
  openssl rand -base64 32
  ```
- **Set `AUTH_TRUST_HOST=true`** — required when the app runs behind any reverse proxy (nginx, Caddy, Traefik) or in Kubernetes. Auth.js v5 rejects requests from unrecognised hosts unless this is set.
- **Set all required environment variables** — see [Environment Variables](/momo/environment-variables)
- **Generate VAPID keys** for push notifications:
  ```bash
  npx web-push generate-vapid-keys
  ```
- **Register OAuth apps** for your production domain (callback URLs must match):
  - GitHub: `https://your-domain.com/api/auth/callback/github`
  - Discord: `https://your-domain.com/api/auth/callback/discord`
  - Google: `https://your-domain.com/api/auth/callback/google`
- **Set CRON_SECRET** to protect cron endpoints from unauthorized access:
  ```bash
  openssl rand -hex 32
  ```
- **Configure TLS** — use a reverse proxy (nginx, Caddy) or cert-manager in Kubernetes
- **Configure HSTS** — the app sets `Strict-Transport-Security` headers automatically
- **Never commit real secrets** to git — use `.env.local` (gitignored) or a secrets manager
- **Run database migrations** after every deployment that includes schema changes:
  ```bash
  docker compose exec app npx drizzle-kit migrate
  ```

---

## Reverse Proxy with Caddy

Caddy is the simplest way to add HTTPS in front of Momo. Create a `Caddyfile`:

```
momo.example.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically provisions a Let's Encrypt certificate. Run:

```bash
caddy run --config Caddyfile
```

> **Important:** When running behind Caddy (or any reverse proxy), set `AUTH_TRUST_HOST=true` in `.env.local`. Auth.js v5 requires this to accept requests forwarded by the proxy.

## Reverse Proxy with nginx

```nginx
server {
    listen 443 ssl;
    server_name momo.example.com;

    ssl_certificate /etc/letsencrypt/live/momo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/momo.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Important:** When running behind nginx (or any reverse proxy), set `AUTH_TRUST_HOST=true` in `.env.local`. Auth.js v5 requires this to accept requests forwarded by the proxy.

---

## AUTH_SECRET Rotation

To rotate the `AUTH_SECRET` (e.g. after a suspected compromise):

1. **Generate a new secret:**
   ```bash
   openssl rand -base64 32
   ```

2. **Update the secret in your environment:**
   - Docker Compose: update `AUTH_SECRET` in `.env.local`, then restart the app:
     ```bash
     docker compose up -d app
     ```
   - Kubernetes: update the Secret and trigger a rollout:
     ```bash
     kubectl patch secret momo-secrets -n momo \
       --type=merge \
       -p '{"stringData":{"AUTH_SECRET":"<new-secret>"}}'
     kubectl rollout restart deployment/momo-app -n momo
     ```

3. **Effect:** All existing sessions are immediately invalidated. All users will be signed out and must log in again. This is expected and safe.

4. **Frequency:** Rotate at minimum once per year. Rotate immediately if the secret is exposed.

---

## Kubernetes

For full Kubernetes deployment instructions, see the [Kubernetes guide](/momo/kubernetes).

The example manifests are in `deploy/examples/` in the repository:

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `momo` namespace |
| `deployment.yaml` | App deployment with 2 replicas, liveness/readiness probes |
| `service.yaml` | ClusterIP service for the app |
| `ingress.yaml` | Ingress with TLS (cert-manager + ingress-nginx) |
| `secret.example.yaml` | Template for required Kubernetes secrets |
| `postgres-statefulset.yaml` | PostgreSQL 18 StatefulSet with persistent volume |
