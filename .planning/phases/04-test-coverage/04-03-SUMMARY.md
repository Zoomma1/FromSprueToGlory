---
phase: 04-test-coverage
plan: 03
subsystem: test-coverage
tags: [tests, unit-tests, service-layer, projects, auth, account, reference, user-paints]
dependency_graph:
  requires: []
  provides: [TST-05]
  affects:
    - server/tests/services/projects.service.test.ts
    - server/tests/services/account.service.test.ts
    - server/tests/services/reference.service.test.ts
    - server/tests/services/auth.service.test.ts
    - server/tests/services/user-paints.service.test.ts
tech_stack:
  added: []
  patterns: [vi.mock module-level mocking, vi.clearAllMocks() in beforeEach, direct service function calls without HTTP]
key_files:
  created:
    - server/tests/services/projects.service.test.ts
    - server/tests/services/account.service.test.ts
    - server/tests/services/reference.service.test.ts
    - server/tests/services/auth.service.test.ts
    - server/tests/services/user-paints.service.test.ts
  modified: []
decisions:
  - "reference.service exports getGameSystems/getFactions/getModels/getPaintBrands/getPaints/getTechniques (not list* names as plan assumed)"
  - "user-paints.service exports listPaints/createPaint/deletePaint only (no updatePaint) — plan spec was incorrect"
  - "auth.service signup throws ConflictError (not ValidationError) for duplicate email"
  - "auth.service logout never throws — always returns message; tests verify with-token and without-token paths"
  - "projects.service deleteProject calls prisma.item.updateMany before project.delete — item mock added to Prisma mock"
metrics:
  duration: 10 min
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 5
---

# Phase 4 Plan 03: Five service unit tests Summary

57 new unit tests across 5 service files covering all exported functions with happy path, NotFoundError, ValidationError, UnauthorizedError, and ConflictError branches — no HTTP or Supertest used.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create projects, account, and reference service unit tests | 2a7f49a | projects.service.test.ts, account.service.test.ts, reference.service.test.ts |
| 2 | Create auth and user-paints service unit tests | 0dd51d3 | auth.service.test.ts, user-paints.service.test.ts |

## What Was Built

**Task 1 — projects.service.test.ts (18 tests):**
- listProjects: data/total envelope, empty result, pagination defaults, ValidationError on invalid params
- getProject: returns project with completion field, NotFoundError when missing
- createProject: creates with userId, ValidationError on missing/empty name and unknown fields
- updateProject: updates, NotFoundError on wrong owner, ValidationError on empty name
- deleteProject: calls item.updateMany before project.delete, NotFoundError when missing

**Task 1 — account.service.test.ts (2 tests):**
- deleteAccount: calls prisma.user.delete with correct id, resolves void

**Task 1 — reference.service.test.ts (9 tests):**
- getGameSystems / getPaintBrands / getTechniques: call findMany, return array
- getFactions: no where clause without gameSystemId; filters when provided
- getModels: no where clause without factionId; filters when provided
- getPaints: no filter without args; filters by brandId; filters by type

**Task 2 — auth.service.test.ts (18 tests):**
- login: happy path returns tokens; UnauthorizedError on missing user and wrong password; ValidationError on missing fields
- signup: returns tokens; hashes password; ConflictError on duplicate email; ValidationError on invalid email/short password
- refresh: returns new tokens; deletes old token; UnauthorizedError on missing/expired DB token and JWT failure; ValidationError on missing field
- logout: calls deleteMany with token when provided; returns message without deleting when no token

**Task 2 — user-paints.service.test.ts (10 tests):**
- listPaints: calls findMany with userId, returns array, handles empty
- createPaint: creates with userId, ValidationError on missing/empty name and unknown fields
- deletePaint: deletes, NotFoundError on missing paint or wrong-owner lookup

## Deviations from Plan

**1. [Rule 1 - Bug] reference.service function names differ from plan spec**
- Found during: Task 1
- Issue: Plan used list* names; actual exports are get* names. getPaints also accepts a type param not in plan.
- Fix: Tests use actual exported names; getTechniques and getPaints type-filter tests added.

**2. [Rule 1 - Bug] user-paints.service has no updatePaint function**
- Found during: Task 2
- Issue: Plan specified testing updateUserPaint; service only exports listPaints/createPaint/deletePaint.
- Fix: Tests cover the three real functions only.

**3. [Rule 1 - Bug] auth.service signup throws ConflictError not ValidationError**
- Found during: Task 2
- Issue: Plan said ValidationError for duplicate email; service throws ConflictError.
- Fix: Test asserts ConflictError for duplicate email case.

**4. [Rule 1 - Bug] auth.service logout never throws**
- Found during: Task 2
- Issue: Plan said UnauthorizedError when token not found; logout uses deleteMany and always returns a message.
- Fix: Tests verify both with-token and without-token paths; no error assertion.

## Self-Check

### Files exist:
- server/tests/services/projects.service.test.ts: created
- server/tests/services/account.service.test.ts: created
- server/tests/services/reference.service.test.ts: created
- server/tests/services/auth.service.test.ts: created
- server/tests/services/user-paints.service.test.ts: created

### Commits:
- 2a7f49a: test(04-03): add unit tests for projects, account, and reference services
- 0dd51d3: test(04-03): add unit tests for auth and user-paints services

### Test results: 286 passed, 0 failed (confirmed by user)

## Self-Check: PASSED