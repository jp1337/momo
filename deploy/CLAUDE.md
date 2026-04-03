# deploy/

## Purpose
Kubernetes manifests for production deployment on a self-hosted cluster.

## Contents
- `namespace.yaml` — `momo` namespace definition
- `deployment.yaml` — App deployment: image, replicas, env vars from Secret, liveness probe
- `service.yaml` — ClusterIP service exposing port 3000
- `ingress.yaml` — Ingress with TLS termination
- `postgres-statefulset.yaml` — PostgreSQL StatefulSet with persistent volume
- `secret.example.yaml` — Template for the Kubernetes Secret (never commit real values)
- `examples/` — Additional example manifests (e.g. HPA, NetworkPolicy)

## Patterns
- All sensitive values (DATABASE_URL, AUTH_SECRET, OAuth keys, VAPID keys) come from a Kubernetes Secret
- `ADMIN_USER_IDS` must be set in the Secret/ConfigMap for admin access to work
- Image tag is updated per deployment — never use `latest` in production
