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

---

## Kubernetes

See [kubernetes.md](./kubernetes.md) for deploying to a Kubernetes cluster.
