---
phase: 1
slug: service-layer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.0.5 |
| **Config file** | `server/vitest.config.ts` |
| **Quick run command** | `cd server && npx vitest run` |
| **Full suite command** | `cd server && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd server && npx vitest run`
- **After every plan wave:** Run `cd server && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-* | 01 | 1 | SVC-01, SVC-03 | integration (HTTP via Supertest) | `cd server && npx vitest run` | ✅ existing | ⬜ pending |
| 1-01-* | 01 | 2 | SVC-02 | unit (direct service call) | `cd server && npx vitest run tests/services/` | ❌ W0 | ⬜ pending |
| 1-02-* | 02 | 1 | SVC-01, SVC-03 | integration (HTTP via Supertest) | `cd server && npx vitest run` | ✅ existing | ⬜ pending |
| 1-02-* | 02 | 2 | SVC-02 | unit (direct service call) | `cd server && npx vitest run tests/services/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `server/tests/services/items.service.test.ts` — unit tests for items service (direct function calls, no HTTP) — covers SVC-02 for items

*Additional `tests/services/*.service.test.ts` files added per plan as services are extracted. Only items is required before Plan 1 execution.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification via the existing Supertest integration test suite and new unit tests for SVC-02.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
