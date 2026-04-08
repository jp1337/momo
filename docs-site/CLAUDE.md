# docs-site/

## Purpose
User-facing documentation published to GitHub Pages at
`jp1337.github.io/momo`. Built with Jekyll. **Not** the technical
docs — those live in `docs/`. Per the project rule
(`feedback_user_docs` memory): every user-facing change must update
`docs-site/` alongside `docs/`.

## Contents
- `index.md` — Landing page with feature cards
- `getting-started.md` — First-day walkthrough for new users
- `features.md` — Comprehensive feature reference
- `two-factor-auth.md` — TOTP / authenticator-app guide (end-user)
- `passkeys.md` — Passkey / WebAuthn guide (end-user) — passwordless login + 2FA
- `oauth-setup.md` — Step-by-step provider setup (GitHub, Discord, Google, Microsoft, OIDC)
- `self-hosting.md` — Self-host walkthrough (Docker / bare metal)
- `deployment.md` — Production deployment guide
- `kubernetes.md` — Kubernetes-specific deployment notes
- `environment-variables.md` — User-facing env var reference (mirrors `docs/environment-variables.md` but in plain language)
- `alexa-skill.md` — Alexa Skill setup for end users
- `_config.yml` — Jekyll config + `nav` array (must be updated when adding a new top-level page)
- `_layouts/` — Jekyll layouts
- `assets/css/` — Site stylesheet
- `Gemfile` — Jekyll dependencies

## Patterns
- One Markdown file per top-level navigation entry
- Front matter at the top of every page: `layout: default`, `title:`, `description:`
- Cross-link sister pages at the bottom under `## See also`
- Use plain user language — no JSDoc references, no file paths
- Keep technical detail in `docs/` and link out to GitHub for advanced operators
- New top-level page → also add a `nav:` entry in `_config.yml`
- Cross-link from `docs-site/features.md` and `docs-site/index.md` (feature cards) when adding a major user-facing feature

## Skip
- `Gemfile.lock`, `_site/`, `.jekyll-cache/` — already excluded via `.claudeignore`
