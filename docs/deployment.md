# Deployment Guide

## Quick Start (Docker Compose)

The recommended way to self-host Momo.

### Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A domain name (optional, but recommended for production)
- At least one OAuth App configured (see [OAuth Setup](./oauth-setup.md))

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

4. Open `http://localhost:3000`

> **Migrations run automatically.** The container applies all pending database migrations via `scripts/migrate.mjs` before the Next.js server starts. No manual migration step is needed.

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
- `docker-entrypoint.sh` runs `scripts/migrate.mjs` (programmatic Drizzle migrations) before starting `server.js` — no manual migration step needed
- HEALTHCHECK hits `/api/health` every 30 seconds (`start-period: 30s` to allow migrations to complete)

---

## Cron Service (Push Notifications)

The `docker-compose.yml` includes a `cron` service that triggers push notifications every 5 minutes:

```yaml
cron:
  image: alpine:3
  # sleeps until the next 5-minute mark, then POSTs to /api/cron/daily-quest
```

**How it works:**
- Fires every 5 minutes at the exact 5-minute boundary (06:00, 06:05, 06:10, …)
- The app filters users whose `notificationTime` falls in the current 5-minute bucket
- Users can set any time with 5-minute granularity (e.g. 06:30, 08:45)
- All times are **UTC** — adjust accordingly for your timezone (CET = UTC+1, CEST = UTC+2)
- Each run is logged to the `cron_runs` table (30-day retention)
- Cron status is visible on the **Admin page** and via `GET /api/health` (`cron.minutesSinceLastRun`)

**Requirements:** `CRON_SECRET` must be set in `.env.local` and match the app's `CRON_SECRET`.

**Start the cron service:**
```bash
docker compose up -d   # starts app + db + cron together
```

**Check cron logs:**
```bash
docker compose logs -f cron
```

---

## Production Checklist

Before going live, complete all items below:

- [ ] **Generate AUTH_SECRET** — must be at least 32 random bytes:
  ```bash
  openssl rand -base64 32
  ```
- [ ] **Set AUTH_TRUST_HOST=true** — required when the app runs behind any reverse proxy (nginx, Caddy, Traefik) or in Kubernetes. Auth.js v5 rejects requests from unrecognised hosts unless this is set.
- [ ] **Set all required environment variables** — see [Environment Variables](./environment-variables.md)
- [ ] **Generate VAPID keys** for push notifications:
  ```bash
  npx web-push generate-vapid-keys
  ```
- [ ] **Register OAuth apps** for your production domain (callback URLs must match):
  - GitHub: `https://your-domain.com/api/auth/callback/github`
  - Discord: `https://your-domain.com/api/auth/callback/discord`
  - Google: `https://your-domain.com/api/auth/callback/google`
- [ ] **Set CRON_SECRET** to protect cron endpoints from unauthorized access:
  ```bash
  openssl rand -hex 32
  ```
- [ ] **Configure TLS** — use a reverse proxy (nginx, Caddy) or cert-manager in Kubernetes
- [ ] **Configure HSTS** — the app sets `Strict-Transport-Security` headers automatically
- [ ] **Never commit real secrets** to git — use `.env.local` (gitignored) or a secrets manager
- [ ] **Migrations run automatically** — no manual step needed. Check `docker compose logs app` after deployment to confirm migrations completed successfully.

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

See [kubernetes.md](./kubernetes.md) for deploying to a Kubernetes cluster.

Example manifests are in [`deploy/examples/`](../deploy/examples/):

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `momo` namespace |
| `deployment.yaml` | App deployment with 2 replicas, liveness/readiness probes |
| `service.yaml` | ClusterIP service for the app |
| `ingress.yaml` | Ingress with TLS (cert-manager + ingress-nginx) |
| `secret.example.yaml` | Template for required Kubernetes secrets |
| `postgres-statefulset.yaml` | PostgreSQL 18 StatefulSet with persistent volume |

### Apply order

```bash
kubectl apply -f deploy/examples/namespace.yaml
kubectl apply -f deploy/examples/postgres-statefulset.yaml
# Create your secret from secret.example.yaml (fill in real values, never commit)
kubectl apply -f deploy/examples/deployment.yaml
kubectl apply -f deploy/examples/service.yaml
kubectl apply -f deploy/examples/ingress.yaml
```

Migrations run automatically when each pod starts — no manual step needed. Check pod logs to confirm:

```bash
kubectl logs -n momo deployment/momo-app --tail=20
```

---

## DSGVO / Legal Compliance

Operators of publicly accessible Momo instances are legally responsible for:

1. **Impressum (§5 TMG)** — required in Germany for any publicly accessible website
2. **Datenschutzerklärung (DSGVO Art. 13/14)** — required whenever personal data is processed

### Configuring Legal Pages

Set the following environment variables before deploying:

```bash
NEXT_PUBLIC_IMPRINT_NAME="Max Mustermann"
NEXT_PUBLIC_IMPRINT_ADDRESS="Musterstraße 1, 12345 Berlin"
NEXT_PUBLIC_IMPRINT_EMAIL="kontakt@example.com"
NEXT_PUBLIC_IMPRINT_PHONE="+49 30 123456"   # optional
```

Once configured, the pages are available at:
- `/impressum` — Impressum (§5 TMG)
- `/datenschutz` — Datenschutzerklärung (DSGVO)

Both pages are publicly accessible without authentication and are linked from the login page footer.

### Cookie Banner

**Not required.** Momo only uses technically necessary cookies:
- `next-auth.session-token` — authentication session
- `locale` — UI language preference

No analytics, tracking, or advertising cookies are used.

### User Rights (implemented in the app)

| DSGVO Right | Implementation |
|---|---|
| Art. 17 — Right to erasure | Settings → Delete account |
| Art. 15/20 — Access / portability | Settings → Export data (JSON download) |

### Note

The Datenschutzerklärung template provided at `/datenschutz` is a generic boilerplate for
OAuth-only apps without tracking. Operators should review the content and adapt it to their
specific deployment (server location, data retention policies, etc.). When in doubt, consult
a legal professional or use a generator like E-Recht24.

See [docs/gdpr.md](gdpr.md) for a full DSGVO compliance guide.
