# docs-site/

## Purpose
The **only** documentation location for Momo. Published to GitHub Pages at
`jp1337.github.io/momo`. Built with Jekyll. All user-facing and operator-facing
documentation lives here — there is no separate `docs/` directory.

Per the project rule (`feedback_user_docs` memory): every user-facing change must
update `docs-site/`.

## Contents
- `index.md` — Landing page with feature cards
- `getting-started.md` — First-day walkthrough for new users
- `features.md` — Comprehensive feature reference
- `two-factor-auth.md` — TOTP / authenticator-app guide
- `passkeys.md` — Passkey / WebAuthn guide — passwordless login + 2FA
- `oauth-setup.md` — Step-by-step provider setup (GitHub, Discord, Google, Microsoft, OIDC)
- `self-hosting.md` — Self-host walkthrough (Docker / bare metal)
- `deployment.md` — Production deployment guide
- `environment-variables.md` — Full env var reference
- `kubernetes.md` — Kubernetes-specific deployment notes
- `webhooks.md` — HTTP Alert + Task Events webhook reference
- `alexa-skill.md` — Full Alexa Skill setup guide (AWS Lambda + Account Linking)
- `_config.yml` — Jekyll config + `nav` array (must be updated when adding a new top-level page)
- `_layouts/` — Jekyll layouts
- `assets/css/` — Site stylesheet
- `Gemfile` — Jekyll dependencies

## Patterns
- One Markdown file per top-level navigation entry
- Front matter at the top of every page: `layout: default`, `title:`, `description:`
- Cross-link sister pages at the bottom under `## See also`
- Write in plain English — no JSDoc references, no internal file paths
- New top-level page → also add a `nav:` entry in `_config.yml`
- Cross-link from `docs-site/features.md` and `docs-site/index.md` when adding a major user-facing feature

## Skip
- `Gemfile.lock`, `_site/`, `.jekyll-cache/` — already excluded via `.claudeignore`
