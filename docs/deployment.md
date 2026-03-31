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

4. Run database migrations:
   ```bash
   docker compose exec app npx drizzle-kit migrate
   ```

5. Open `http://localhost:3000`

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
- Runs as non-root user (`nextjs:1001`)
- Uses `output: standalone` for a minimal production bundle
- No dev dependencies in the final image
- HEALTHCHECK hits `/api/health` every 30 seconds

---

## Production Checklist

Before going live, complete all items below:

- [ ] **Generate AUTH_SECRET** — must be at least 32 random bytes:
  ```bash
  openssl rand -base64 32
  ```
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
- [ ] **Run database migrations** after every deployment that includes schema changes:
  ```bash
  docker compose exec app npx drizzle-kit migrate
  ```

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
| `postgres-statefulset.yaml` | PostgreSQL 16 StatefulSet with persistent volume |

### Apply order

```bash
kubectl apply -f deploy/examples/namespace.yaml
kubectl apply -f deploy/examples/postgres-statefulset.yaml
# Create your secret from secret.example.yaml (fill in real values, never commit)
kubectl apply -f deploy/examples/deployment.yaml
kubectl apply -f deploy/examples/service.yaml
kubectl apply -f deploy/examples/ingress.yaml
```

After the app starts, run migrations:

```bash
kubectl exec -n momo deployment/momo-app -- npx drizzle-kit migrate
```
