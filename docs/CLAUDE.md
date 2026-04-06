# docs/

## Purpose
Technical documentation for developers and self-hosters. NOT the user-facing documentation site (that's `docs-site/`).

## Contents
- `api.md` — Full API route reference with request/response schemas, rate limits, auth info
- `database.md` — All DB tables with column descriptions, migration instructions
- `deployment.md` — Docker Compose + Kubernetes deployment guide, production checklist
- `environment-variables.md` — Every env var with type, default, description
- `oauth-setup.md` — Step-by-step OAuth provider setup (GitHub, Discord, Google, OIDC)
- `gdpr.md` — DSGVO/GDPR compliance guide for operators (data export, deletion, legal pages)
- `alexa.md` — Alexa Skill setup and Account Linking documentation

## When to update
- New API endpoint added → `api.md`
- DB schema changed → `database.md`
- New env var introduced → `environment-variables.md`
- Deployment config changed → `deployment.md`
