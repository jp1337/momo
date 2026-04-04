# Tech Debt Registry

Items deferred from code reviews. Fix before they compound.

---

- [ ] **TD-001**: CSP nonce hardening — eliminate `unsafe-inline` + `worker-src blob:` combination
  - **Impact:** Medium
  - **Source:** L3-security-20260404.md (MEDIUM-2), L3-security-20260331.md

- [ ] **TD-002**: Unit tests for `lib/date-utils.ts` — timezone boundary cases (DST, UTC±, midnight)
  - **Impact:** Medium
  - **Source:** L2-arch-20260404.md, L4-reliability-20260404.md

- [ ] **TD-003**: Extract `useTaskCompletion(onRefresh)` hook to eliminate duplication between TaskList and TopicDetailView
  - **Impact:** Medium
  - **Source:** L2-arch-20260404.md, L4-reliability-20260404.md (R-11)

- [ ] **TD-004**: Centralise `coinsEarned` CustomEvent contract — shared const for event name + typed detail shape
  - **Impact:** Low
  - **Source:** L2-arch-20260404.md, L4-reliability-20260404.md (R-12)

- [ ] **TD-005**: Statement timeout for migrate.mjs catalog queries — prevent indefinite block on cold DB
  - **Impact:** Medium
  - **Source:** L4-reliability-20260404.md (R-02)

- [ ] **TD-006**: `notes` / `description` field max-length validation in Zod validators
  - **Impact:** Low
  - **Source:** L3-security-20260404.md (LOW-2)
