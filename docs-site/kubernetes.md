---
layout: default
title: Kubernetes
description: Deploying Momo to a Kubernetes cluster using the provided example manifests.
---

# Kubernetes Deployment

This guide covers deploying Momo to a Kubernetes cluster. Example manifests are included in the `deploy/examples/` directory of the repository.

## Prerequisites

- A working Kubernetes cluster (1.25+)
- `kubectl` configured and pointing at your cluster
- [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) installed in your cluster
- [cert-manager](https://cert-manager.io/) installed with a `ClusterIssuer` named `letsencrypt-prod`
- A domain name pointing at your cluster's ingress IP

---

## Manifest Overview

| File | Purpose |
|---|---|
| `namespace.yaml` | Creates the `momo` namespace |
| `postgres-statefulset.yaml` | PostgreSQL 16 StatefulSet with a persistent volume |
| `secret.example.yaml` | Template for all required secrets — **fill in and apply, never commit** |
| `deployment.yaml` | App deployment with 2 replicas, liveness/readiness probes, non-root security context |
| `service.yaml` | ClusterIP service exposing the app on port 3000 |
| `ingress.yaml` | Ingress with TLS via cert-manager |

---

## Step-by-Step Deployment

### Step 1 — Create the namespace

```bash
kubectl apply -f deploy/examples/namespace.yaml
```

### Step 2 — Deploy PostgreSQL

```bash
kubectl apply -f deploy/examples/postgres-statefulset.yaml
```

Wait for the database to be ready:

```bash
kubectl rollout status statefulset/momo-postgres -n momo
```

### Step 3 — Create secrets

Copy the example secret template and fill in real values:

```bash
cp deploy/examples/secret.example.yaml secret.yaml
# Edit secret.yaml — fill in every CHANGE_ME value
```

The required fields in `secret.yaml`:

```yaml
stringData:
  DATABASE_URL: "postgresql://momo:yourpassword@momo-postgres:5432/momo"
  AUTH_SECRET: "generate with: openssl rand -base64 32"
  NEXT_PUBLIC_APP_URL: "https://momo.example.com"

  # At least one OAuth provider
  GITHUB_CLIENT_ID: ""
  GITHUB_CLIENT_SECRET: ""

  # VAPID keys for push notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: ""
  VAPID_PRIVATE_KEY: ""
  VAPID_CONTACT: "mailto:admin@example.com"

  # Cron protection
  CRON_SECRET: "generate with: openssl rand -hex 32"
```

Apply the secret:

```bash
kubectl apply -f secret.yaml -n momo
```

**Delete the file immediately after applying — never commit it:**

```bash
rm secret.yaml
```

### Step 4 — Update the ingress domain

Edit `deploy/examples/ingress.yaml` and replace `momo.example.com` with your actual domain:

```yaml
spec:
  tls:
    - hosts:
        - momo.example.com  # change this
      secretName: momo-tls
  rules:
    - host: momo.example.com  # change this
```

### Step 5 — Deploy the application

```bash
kubectl apply -f deploy/examples/deployment.yaml
kubectl apply -f deploy/examples/service.yaml
kubectl apply -f deploy/examples/ingress.yaml
```

### Step 6 — Run database migrations

Wait for the app pod to be running, then run migrations:

```bash
kubectl rollout status deployment/momo-app -n momo
kubectl exec -n momo deployment/momo-app -- npx drizzle-kit migrate
```

### Step 7 — Verify

```bash
kubectl get pods -n momo
kubectl get ingress -n momo
```

The app should be accessible at `https://momo.example.com` once cert-manager provisions the TLS certificate (usually within 1-2 minutes).

---

## Deployment Details

### App Deployment

The `deployment.yaml` includes:

- **2 replicas** with pod anti-affinity to spread across nodes
- **Resource limits:** 512Mi memory, 500m CPU per pod
- **Liveness probe:** GET `/api/health` every 30s — restarts the container if it fails 3 times
- **Readiness probe:** GET `/api/health` every 10s — removes the pod from the service if it fails
- **Non-root security context:** runs as user `1001` (`nextjs`)
- All secrets injected via `envFrom: secretRef: name: momo-secrets`

### PostgreSQL StatefulSet

- PostgreSQL 16 with a persistent volume claim
- Data is stored in a `PersistentVolumeClaim` — survives pod restarts
- Accessible within the cluster at `momo-postgres:5432`

### Ingress

- Requires ingress-nginx and cert-manager
- cert-manager automatically provisions a Let's Encrypt certificate
- All HTTP traffic is redirected to HTTPS

---

## Updating Momo

To deploy a new version:

```bash
# Pull the latest image
kubectl set image deployment/momo-app momo=ghcr.io/jp1337/momo:latest -n momo

# Or trigger a rollout if using imagePullPolicy: Always
kubectl rollout restart deployment/momo-app -n momo
```

After updates that include database changes, run migrations:

```bash
kubectl exec -n momo deployment/momo-app -- npx drizzle-kit migrate
```

---

## Rotating the AUTH_SECRET

```bash
kubectl patch secret momo-secrets -n momo \
  --type=merge \
  -p '{"stringData":{"AUTH_SECRET":"your-new-secret"}}'

kubectl rollout restart deployment/momo-app -n momo
```

All existing user sessions will be invalidated and users will need to sign in again.

---

## Scaling

To increase the number of replicas:

```bash
kubectl scale deployment/momo-app --replicas=3 -n momo
```

Momo is stateless — all state is in PostgreSQL. You can scale horizontally without any additional configuration.

---

## Viewing Logs

```bash
# All app pods
kubectl logs -n momo -l app=momo --tail=100 -f

# Specific pod
kubectl logs -n momo <pod-name> --tail=100 -f
```

---

## Secrets Management (Advanced)

For production clusters, consider using a dedicated secrets solution instead of plain Kubernetes Secrets:

- **[Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)** — encrypt secrets before committing to git
- **[External Secrets Operator](https://external-secrets.io/)** — sync from AWS Secrets Manager, Vault, etc.
- **[HashiCorp Vault](https://www.vaultproject.io/)** — full secrets management solution

These integrate transparently with the `momo-secrets` Secret referenced in `deployment.yaml`.
