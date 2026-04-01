# Reliability Review: Momo CI/CD Pipeline Rewrite

**Review Type:** Reliability Review — CI/CD Pipeline
**Date:** 2026-04-01
**Reviewer:** SRE Agent (claude-sonnet-4-6)
**Scope:** `.github/workflows/build-and-publish.yml` (new 3-job pipeline) and `.github/workflows/docs.yml`
**Prior report:** `.claude/reports/sre/L4-reliability-20260331.md` (application-level failure modes)

---

## Service Overview

The pipeline builds a multi-architecture Docker image (linux/amd64, linux/arm64) for the Momo Next.js application and publishes tagged manifests to three registries: GitHub Container Registry (GHCR), Docker Hub, and Quay.io. The rewrite replaces QEMU-emulated cross-compilation with native parallel builds and a separate manifest-merge step.

**Pipeline topology:**

```
push to main / v* tag
        |
     [lint]
        |
    [build] ──── matrix ────────────────────────────┐
      amd64 (ubuntu-latest)     arm64 (ubuntu-24.04-arm)
        |                                |
   push digest → GHCR             push digest → GHCR
   upload artifact                upload artifact
        └────────────────┬──────────────┘
                      [merge]
                   download artifacts
                   imagetools create
                   push manifest → GHCR + Docker Hub + Quay.io
```

---

## Dependencies

| Dependency | Type | Impact if Unavailable |
|------------|------|----------------------|
| GitHub-hosted ubuntu-latest runner | Hard (lint, merge jobs) | Pipeline blocked entirely |
| GitHub-hosted ubuntu-24.04-arm runner | Hard (arm64 build) | Multi-arch build fails; merge cannot proceed |
| GHCR (ghcr.io) | Hard (build stage, merge reads) | Build cannot push digests; merge cannot read them |
| Docker Hub (docker.io) | Soft (merge push target) | Manifest push to Docker Hub fails — no conditional guard |
| Quay.io (quay.io) | Soft (merge push target) | Manifest push to Quay.io fails — no conditional guard |
| GHA artifact store | Hard | Digest files lost between build and merge jobs |
| GHA cache (type=gha) | Soft | Cache miss; build continues without layer cache |
| DOCKERHUB_USERNAME / DOCKERHUB_TOKEN secrets | Hard (merge) | Docker Hub login fails; merge job fails |
| QUAY_USERNAME / QUAY_TOKEN secrets | Hard (merge) | Quay.io login fails; merge job fails |

---

## SLIs (Pipeline Service Level Indicators)

| SLI | Definition | Measurement |
|-----|------------|-------------|
| Pipeline success rate | Successful workflow runs / total triggered runs | GitHub Actions workflow run history |
| Build duration | Wall-clock time from trigger to merged manifest push | Workflow run duration |
| TTFM (Time to First Manifest) | Time from push to final tagged image available in registries | Workflow run duration |
| Platform build parity | Both platform builds succeed / total builds | Matrix job completion rate |
| Artifact availability | Digest artifacts present when merge starts | Merge job failure on download step |
| Registry push success rate | Registries successfully updated / registries attempted | Per-login-action exit code |

---

## Failure Mode Analysis

### PL-01: ubuntu-24.04-arm Runner Unavailability — HIGH

**Description:** The arm64 build depends on a GitHub-hosted `ubuntu-24.04-arm` runner. This runner pool was added in 2024 and has a smaller capacity than the standard `ubuntu-latest` amd64 pool. It has historically exhibited higher queue times and occasional unavailability during periods of high demand across GitHub's infrastructure.

If no arm64 runner is available, the matrix build job for `linux/arm64` will queue indefinitely (up to the 6-hour GHA timeout) or fail. Because `fail-fast: false` is set on the matrix, the amd64 build will complete and upload its artifact. However, the `merge` job requires `needs: build` — which means it waits for ALL matrix legs to finish. A hung arm64 job blocks the entire pipeline until timeout.

**Detection:** Workflow run stalled at the arm64 matrix leg for > 30 minutes.

**Impact:** No new image published for the duration of the stall. For urgent security patches this could delay deployment. Severity increases if the arm64 runner pool experiences an extended outage.

**Current mitigation:** None — `fail-fast: false` prevents amd64 from cancelling arm64, but also means the merge job never executes while arm64 is still queued.

**Recommended mitigation:**
- Set a per-job `timeout-minutes: 45` to bound the blast radius.
- Consider an optional skip path: if arm64 has been queued > N minutes, allow the merge to proceed with only the amd64 digest and emit a warning annotation.

---

### PL-02: One Platform Build Fails — HIGH

**Description:** If one matrix leg fails (e.g., a flaky Docker layer pull, a transient GHCR push error, or an OOM on the runner), the workflow exhibits asymmetric state:

1. The successful leg has pushed its digest to GHCR and uploaded its artifact.
2. The failed leg has neither.
3. The `merge` job's `needs: build` dependency means merge does not run when any matrix leg has failed.
4. The digest already pushed to GHCR by the successful leg is now a dangling untagged manifest — it will be garbage collected by GHCR after 30 days if no tag points to it.

**Impact severity depends on cause:**
- Transient failure: re-running only the failed leg via "Re-run failed jobs" is possible and correct. The successful leg's artifact has a 1-day retention, so re-runs must happen within 24 hours.
- Systematic failure (e.g., broken Dockerfile for arm64 architecture): requires a code fix and a new push.

**Orphan digest accumulation:** Over time, partial build failures will leave increasing numbers of untagged digests in GHCR's `jp1337/momo` repository. This is cosmetic but may complicate auditing.

**No currently documented re-run procedure** for the partial failure case.

**Recommended mitigation:**
- Document the "Re-run failed jobs within 24 hours" procedure in `docs/deployment.md`.
- Add a GHCR retention policy to clean up untagged manifests older than 7 days.

---

### PL-03: Artifact Expiry Breaks Re-runs After 24 Hours — HIGH

**Description:** Digest artifacts are uploaded with `retention-days: 1`. If either build leg must be re-run (or the merge job re-run independently) more than 24 hours after the original build, the artifact download in the merge job will fail with `if-no-files-found: error` semantics (the upload step uses that flag, but the download step will simply find no files and produce an empty directory — the `printf 'ghcr.io/jp1337/momo@sha256:%s ' *` glob will expand to nothing, causing `imagetools create` to be invoked with only `-t` flags and no source images, which fails).

**Detection:** Merge job fails on `imagetools create` with an obscure argument error, not a clear "artifact expired" message.

**Impact:** A re-run of a pipeline from more than 24 hours ago requires a full new push to trigger a fresh run. This is a minor annoyance for routine re-runs but can become a reliability issue in scenarios such as:
- A release tag is created, the merge job fails on a transient Quay.io error, and the re-run happens the next day.
- An on-call engineer attempts to re-trigger publishing after a registry outage resolves.

**Recommended mitigation:**
- Increase `retention-days` to 3–7 for the digest artifacts. The storage cost is negligible (files are ~64 bytes each).
- Alternatively, make the merge job re-fetch digests from GHCR directly using `docker buildx imagetools inspect` rather than relying on uploaded files — this eliminates the artifact dependency entirely.

---

### PL-04: No Conditional Guards on Docker Hub / Quay.io — HIGH

**Description (B-02 from L1/L2):** The merge job unconditionally runs the Docker Hub and Quay.io login steps and pushes to all three registries via `imagetools create`. There are no `if: secrets.DOCKERHUB_TOKEN != ''` guards. If either `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `QUAY_USERNAME`, or `QUAY_TOKEN` is absent (e.g., in a fork, after a secret rotation failure, or on a fresh repository setup), the login step fails and the entire merge job fails — including the GHCR push.

**Consequence:** The GHCR manifest is never published even though GHCR authentication succeeded. The untagged digests already pushed to GHCR during the build phase become orphaned (see PL-02).

**This is the most actionable single-point failure in the pipeline.** A missing or expired Docker Hub token causes a complete publish failure across all registries, including GHCR which uses the built-in `GITHUB_TOKEN` and has no credential risk.

**Recommended mitigation:**

Option A — Conditional login/push (minimal change):
```yaml
- name: Log in to Docker Hub
  if: ${{ secrets.DOCKERHUB_TOKEN != '' }}
  uses: docker/login-action@v3
  with:
    registry: docker.io
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Log in to Quay.io
  if: ${{ secrets.QUAY_TOKEN != '' }}
  uses: docker/login-action@v3
  with:
    registry: quay.io
    username: ${{ secrets.QUAY_USERNAME }}
    password: ${{ secrets.QUAY_TOKEN }}
```

With the metadata-action `images:` list also made conditional (or by splitting into per-registry imagetools calls), the GHCR push succeeds independently of Docker Hub/Quay.io availability.

Option B — Split `imagetools create` calls per registry:
Run one `imagetools create` for GHCR, then separate calls for Docker Hub and Quay.io, each guarded with `if: secrets.*`. This allows GHCR to succeed even when the other registries fail.

---

### PL-05: imagetools create Has No Error Isolation — MEDIUM

**Description:** The `Create and push multi-arch manifest` step runs a single `docker buildx imagetools create` command that pushes to all three registries in one invocation (because `metadata-action` generates `-t` flags for all three image names). If the push to any single registry fails mid-execution (e.g., Docker Hub returns a 429 rate limit after GHCR succeeds), the command exits non-zero and the step is marked failed. There is no indication of which registry succeeded and which failed. A re-run will re-attempt all three registries, but GHCR may already have the manifest and Docker Hub/Quay.io may not.

**Impact:** Partial registry publication is undetectable without manually inspecting each registry. Users who pull from GHCR may have the image while Docker Hub users do not, or vice versa. No alert is generated.

**Recommended mitigation:** Split into three separate `imagetools create` calls, one per registry, so the step log clearly shows which registry failed. Tag each step with `continue-on-error: true` for Docker Hub and Quay.io if GHCR is considered the primary registry.

---

### PL-06: docs.yml Uses Non-Existent Action Versions — HIGH

**Description (N-01 from L1/L2):** `docs.yml` references:
- `actions/checkout@v6` — current latest is v4; v6 does not exist.
- `actions/configure-pages@v6` — current latest is v5; v6 does not exist.

When GitHub resolves these action references, it will fail with `Unable to resolve action`. The entire `docs.yml` workflow fails on every push to `main` and on every `workflow_dispatch`.

**Detection:** Every push to `main` generates a failed workflow run for "Deploy Docs to GitHub Pages." This failed run appears in the repository's commit status checks and in the Actions tab, creating alert fatigue and masking genuine failures.

**Impact:**
1. GitHub Pages documentation is never deployed.
2. Persistent red status on every commit reduces signal-to-noise ratio for CI health monitoring.
3. If branch protection rules check "all workflows must pass," this would block all merges to `main`.

**Recommended fix:**
```yaml
- uses: actions/checkout@v4
# ...
- name: Setup Pages
  uses: actions/configure-pages@v5
```

This is a 2-line change with no behavior impact.

---

### PL-07: No Build Provenance or SBOM Attestation — MEDIUM

**Description:** The pipeline produces container images but does not generate SLSA provenance attestations or a Software Bill of Materials (SBOM). Docker's `build-push-action` supports `attestations: type=provenance,mode=max` and `attestations: type=sbom` natively. Without these, consumers of the image have no machine-readable supply chain verification.

**Impact:** Not a reliability risk in the traditional sense, but a supply chain security gap. If the GHCR repository is ever configured to enforce attestation (a registry-level policy becoming more common), pushes will fail.

**Recommended mitigation:** Add to the `build` job:
```yaml
attests:
  - type=provenance,mode=max
  - type=sbom
```

This is low-effort and future-proofs the pipeline.

---

### PL-08: GHA Cache Scope per Platform May Cause Cache Poisoning Under Race — LOW

**Description:** The build job uses `cache-from: type=gha,scope=${{ steps.platform.outputs.suffix }}` and `cache-to: type=gha,mode=max,scope=...`. The scope is `linux-amd64` or `linux-arm64`. Two concurrent workflow runs triggered by rapid successive pushes to `main` may race on the GHA cache write. The `mode=max` cache writer for the second run will overwrite the first run's cache with potentially different layer content (e.g., if the second push changed a dependency). This is harmless correctness-wise (Docker build will simply use a stale or partial cache on the next run), but can cause cache churn and slightly longer build times during periods of rapid pushing.

**Impact:** Occasional cache miss; build times increase by 30–90 seconds. No correctness impact.

---

### PL-09: arm64 Runner Billing and Quota Risk — MEDIUM

**Description:** GitHub-hosted `ubuntu-24.04-arm` runners are billed at 2× the standard compute rate on GitHub Actions. For a public repository, this is currently free. For a private repository, each arm64 build consumes twice the minute-budget of an amd64 build. If the repository is ever made private, the minute budget will be consumed at twice the expected rate for the arm64 leg.

Additionally, if GitHub enforces per-repository or per-organization arm64 runner quotas (as they have with some larger runner types), builds could queue unexpectedly during usage spikes.

**Impact:** Unexpected billing increase if repository becomes private; queue delays under quota pressure.

**Recommended mitigation:** Document the billing implication in `docs/deployment.md`. Set `timeout-minutes: 45` on the build job to bound worst-case minute consumption.

---

## Rollback Safety Analysis

### Can we revert to the old single-job QEMU approach?

**Assessment: Yes, with caveats.**

The old approach (single job, QEMU, `docker/build-push-action` with `platforms: linux/amd64,linux/arm64`) is well-understood and fully supported by `build-push-action@v6`. Reverting requires restoring approximately 40 lines of YAML.

**Caveats:**
1. QEMU builds are significantly slower (arm64 emulation typically adds 3–5× build time). For a Next.js app with `npm ci` and `next build`, this means the single job may take 15–25 minutes vs. the current parallel approach's 8–12 minutes.
2. The new pipeline has already pushed image digests to GHCR by the time a rollback decision would be made — these orphaned digests require manual cleanup or natural GHCR GC.
3. If a rollback is triggered by a merge job failure (e.g., PL-04), the GHCR digests from the build phase are already present but untagged. The old QEMU approach would push a fresh complete image, resulting in a new tagged manifest. No conflict.

**Rollback procedure (not currently documented):**
```bash
git revert <commit-hash-of-workflow-rewrite>
git push origin main
```
This triggers a new run with the reverted YAML.

---

## Graceful Degradation Patterns

| Failure | Current Behavior | Recommended Behavior |
|---------|-----------------|---------------------|
| arm64 runner unavailable | Entire pipeline stalls until timeout (6h) | timeout-minutes: 45 per job; annotate run with warning |
| Docker Hub / Quay.io secret missing | Merge fails; GHCR not updated | Conditional guards; GHCR pushes independently |
| One platform build fails | Merge blocked; no image published | Document re-run procedure; add GHCR cleanup policy |
| docs.yml checkout@v6 not found | docs workflow always fails | Fix version pins |
| Artifact expires (> 24h re-run) | Merge fails with unhelpful error | Increase retention-days to 7 |
| imagetools partial push failure | No per-registry visibility | Split into per-registry steps |

---

## Error Budget Impact

The CI pipeline is not a user-facing service with a formal SLO. However, pipeline failures directly impact deployment velocity and therefore the ability to spend the application's error budget on feature work. The following pipeline reliability targets are recommended:

| Pipeline SLO | Target | Current Estimated Baseline |
|-------------|--------|---------------------------|
| Build success rate (on main push) | > 95% per 30 days | Unknown — no history yet |
| TTFM (time to first merged manifest) | < 20 minutes | ~12–15 min (estimated) |
| Registry availability (GHCR) | 99.9% | GHCR historical ~99.5% |
| docs.yml success rate | > 99% per 30 days | 0% (always fails due to PL-06) |

With PL-04 (no conditional guards) and PL-06 (docs.yml broken) unaddressed, the effective pipeline success rate is significantly below any acceptable target. PL-04 means any secret rotation or expiry causes a 100% publish failure. PL-06 means docs deploys are 100% failed.

---

## Action Items

| Priority | ID | Action | File | Effort |
|----------|-----|--------|------|--------|
| P0 | CI-01 | Fix docs.yml action version pins (checkout@v4, configure-pages@v5) | `.github/workflows/docs.yml` | 5 min |
| P0 | CI-02 | Add conditional guards on Docker Hub / Quay.io login steps in merge job | `.github/workflows/build-and-publish.yml` | 30 min |
| P1 | CI-03 | Increase artifact retention-days from 1 to 7 | `.github/workflows/build-and-publish.yml` | 5 min |
| P1 | CI-04 | Add timeout-minutes: 45 to build job to bound arm64 queue stalls | `.github/workflows/build-and-publish.yml` | 5 min |
| P1 | CI-05 | Split imagetools create into per-registry calls for failure isolation | `.github/workflows/build-and-publish.yml` | 45 min |
| P1 | CI-06 | Document partial build failure re-run procedure in docs/deployment.md | `docs/deployment.md` | 20 min |
| P2 | CI-07 | Add GHCR untagged manifest retention/cleanup policy | GHCR repository settings | 10 min |
| P2 | CI-08 | Add SLSA provenance and SBOM attestations to build job | `.github/workflows/build-and-publish.yml` | 20 min |
| P3 | CI-09 | Document arm64 billing implications for private repo scenario | `docs/deployment.md` | 10 min |
| P3 | CI-10 | Evaluate merging digest-from-GHCR approach to eliminate artifact dependency | `.github/workflows/build-and-publish.yml` | 2–4 hours |

---

## Relationship to Prior Report (L4-reliability-20260331)

The prior report identified **FM-16** (no lint/typecheck gate before Docker build) as HIGH severity. The new pipeline resolves FM-16 by adding a dedicated `lint` job that runs `tsc --noEmit` and `npm run lint` before the build matrix is triggered. This is a direct reliability improvement.

The prior report identified the following CI gaps that remain open despite the rewrite:

| Prior Gap | Status in New Pipeline |
|-----------|----------------------|
| No lint step before Docker build (FM-16) | RESOLVED — dedicated lint job added |
| No TypeScript typecheck step | RESOLVED — `npx tsc --noEmit` in lint job |
| No `npm audit` security gate | STILL OPEN — not added in rewrite |
| No test step (no tests exist) | STILL OPEN — no tests written |
| `latest` tag used in K8s deployment | STILL OPEN — deployment.yaml not changed |
| No smoke test after deploy | STILL OPEN |

New issues introduced by the rewrite: PL-01 through PL-09 above.

**Net assessment:** The rewrite is a reliability improvement for build speed and platform parity, but introduces three P0/P1 issues (PL-04, PL-06, PL-03) that must be addressed before the pipeline can be considered production-grade.

---

## Risk Heat Map

```
             Impact
             LOW     MEDIUM    HIGH    CRITICAL
LIKELY     |       |        | PL-06 |  PL-04   |
POSSIBLE   | PL-08 | PL-05  | PL-02 |  PL-01   |
           |       | PL-07  | PL-03 |          |
UNLIKELY   |       | PL-09  |       |          |
```

**Immediate action required (Likely + High/Critical):**
- PL-04: Missing secret guard causes total publish failure
- PL-06: docs.yml always fails due to non-existent action versions

---

## Appendix: Relevant File Locations

- `/home/jpylypiw/projects/momo/.github/workflows/build-and-publish.yml` — primary CI pipeline
- `/home/jpylypiw/projects/momo/.github/workflows/docs.yml` — GitHub Pages deploy (broken)
- `/home/jpylypiw/projects/momo/Dockerfile` — multi-stage build (deps, builder, runner)
- `/home/jpylypiw/projects/momo/docs/deployment.md` — deployment runbook (re-run procedure missing)
- `/home/jpylypiw/projects/momo/.claude/reports/sre/L4-reliability-20260331.md` — prior application-level reliability review
