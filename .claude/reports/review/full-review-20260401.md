# Full Review Summary: momo — Delta Review seit 2026-03-31

**Review Date:** 2026-04-01
**Reviewed By:** Claude Code Review System
**Base Commit:** f2388b8 (docs: Phase 8 GitHub Pages)
**Head Commit:** bb4de8a (chore(deploy): split multi-arch build)
**Commits reviewed:** fc0bcf5, 0254124, d6c002f, 35fa9e5, df29bde, 8fea82d, 93a1ed2, 3b137bd, bb4de8a

## Levels Completed
- [x] L1: Peer Review → `.claude/reports/review/L1-peer-20260401.md`
- [x] L2: Architecture Review → `.claude/reports/review/L2-arch-20260401.md`
- [x] L3: Security Review → `.claude/reports/security/L3-security-20260401.md`
- [x] L4: Reliability Review → `.claude/reports/sre/L4-reliability-20260401.md`

---

## Blocking Issues (Must Fix)

| ID | Level | Issue | Location | Severity |
|----|-------|-------|----------|----------|
| B-03/D-01 | L1/L3 | DELETE /buy returns HTTP 404 for "not marked as bought" — should be 409 Conflict | `app/api/wishlist/[id]/buy/route.ts:64-69` | BLOCKING |
| B-02/CI-01 | L1/L4 | docs.yml: `actions/checkout@v6` und `actions/configure-pages@v6` existieren nicht | `.github/workflows/docs.yml` | BLOCKING |
| B-02/A-01/CI-02 | L1/L2/L4 | Keine conditional guards für Docker Hub / Quay.io logins in merge job | `.github/workflows/build-and-publish.yml:143-154` | BLOCKING |

**Note:** B-01/A-02 (kermit1337 als "falscher" Username) ist kein Bug — `kermit1337` ist der korrekte Docker Hub Username des Entwicklers (explizit bestätigt).

---

## Non-Blocking Issues (Should Fix)

| ID | Level | Issue | Location | Priority |
|----|-------|-------|----------|----------|
| CI-03 | L4 | Artifact retention 1 Tag — Re-runs nach 24h schlagen fehl | `build-and-publish.yml` | HIGH |
| CI-04 | L4 | Kein `timeout-minutes` auf build job — hängender Runner blockiert 6h | `build-and-publish.yml` | HIGH |
| CI-05 | L4 | imagetools create für alle 3 Registries in einem Aufruf — kein Failure Isolation | `build-and-publish.yml` | MEDIUM |
| D-02 | L3 | lint job hat kein explizites `permissions: {}` — erbt Repository-Default | `build-and-publish.yml` | MEDIUM |
| D-03 | L3 | docs.yml verwendet mutable Action-Tags (security: Tag-Redirect möglich) | `.github/workflows/docs.yml` | MEDIUM |
| N-02 | L1 | serialize-javascript override `>=7.0.5` sollte `^7.0.5` sein | `package.json` | LOW |
| N-04 | L1 | CHANGELOG.md nicht für die 9 Commits aktualisiert | `CHANGELOG.md` | LOW |

---

## Accepted Risks (Tech Debt)

| ID | Issue | Reason |
|----|-------|--------|
| D-04 | lodash 4.17.21 hat GHSA-xxjr-mmjv-4gpg (Prototype Pollution, CVSS 6.5) | Nur build-time (workbox-build), kein runtime-Risiko. Kein gepatchtes lodash 4.x verfügbar. |

---

## What Was Correctly Fixed

- **SEC-04** — error.message leak in wishlist buy/discard Routes behoben ✓
- **SEC-06** — serialize-javascript CVE via npm override behoben ✓
- **L2-arch-20260331** — CI lint/typecheck Gate nachgezogen ✓
- **FM-16** — arm64 QEMU durch native Runner ersetzt ✓

---

## Verdict
- [ ] **APPROVED**
- [x] **CHANGES REQUESTED** — 3 Blocking Issues müssen behoben werden

---

## Report Links
- L1: `.claude/reports/review/L1-peer-20260401.md`
- L2: `.claude/reports/review/L2-arch-20260401.md`
- L3: `.claude/reports/security/L3-security-20260401.md`
- L4: `.claude/reports/sre/L4-reliability-20260401.md`
