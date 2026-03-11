---
phase: 03-security-and-atomicity
plan: "01"
subsystem: tests
tags: [tdd, wave-0, ownership, rate-limiting, s3-singleton, transactions]
dependency_graph:
  requires: []
  provides:
    - "Failing test stubs for OWN-01 (service layer ownership ForbiddenError)"
    - "Failing test stubs for OWN-02 (route layer 403 ownership enforcement)"
    - "Todo stubs for ARL-01/02/03 (auth rate limiting)"
    - "Todo stubs for S3S-01/02 (S3 singleton)"
  affects:
    - server/tests/services/color-schemes.service.test.ts
    - server/tests/color-schemes.test.ts
    - server/tests/auth.test.ts
    - server/tests/media.test.ts
tech_stack:
  added: []
  patterns:
    - "Wave 0 TDD: write failing tests before implementation"
    - "it.todo() for stubs that require infrastructure not yet built"
    - "vi.mock() at module level before imports for correct hoisting"
key_files:
  created:
    - server/tests/services/color-schemes.service.test.ts
  modified:
    - server/tests/color-schemes.test.ts
    - server/tests/auth.test.ts
    - server/tests/media.test.ts
decisions:
  - "it.todo() used for ARL and S3S stubs — createApp({ skipAuthRateLimit: false }) and lib/s3.ts don't exist yet, so full tests would error not fail"
  - "OWN-02 route tests intentionally fail (get 200/204 instead of 403) because the mock returns a non-null value with wrong userId — service currently uses findFirst({ where: { id, userId } }) so it sees null for wrong-owner; the route mock bypasses that check"
metrics:
  duration: "2 min"
  completed: "2026-03-11"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
---

# Phase 3 Plan 01: Wave 0 TDD Stubs Summary

Wave 0 test stubs for Phase 3 security and atomicity work. All target tests are RED (failing with assertion errors, not TypeScript errors), enforcing TDD discipline for Plans 02-04.

## What Was Built

**New file:** `server/tests/services/color-schemes.service.test.ts`
- 5 test cases covering OWN-01 (ForbiddenError vs NotFoundError) and TXN-02 (transaction error propagation)
- Currently 2 tests fail (ownership ForbiddenError — service uses combined `findFirst({ id, userId })` query)
- 1 test already passes (TXN-02 — $transaction mock rejects correctly)
- 2 NotFoundError tests pass (null returns NotFoundError as expected)

**Modified:** `server/tests/color-schemes.test.ts`
- Added `describe('Ownership enforcement (OWN-02)')` block after DELETE tests
- 2 failing tests: PUT and DELETE expecting 403 when scheme belongs to `other-user`
- Currently returns 200/204 — red as expected

**Modified:** `server/tests/auth.test.ts`
- Added `describe('Auth Rate Limiting (ARL-01/02/03)')` block at end of file
- 3 `it.todo()` stubs for login/signup/refresh 429 responses
- Compile and show as todo (not failing) — full tests require Plan 03's `createApp` options flag

**Modified:** `server/tests/media.test.ts`
- Added `describe('S3 Singleton (S3S-01/02)')` block at end of file
- 3 `it.todo()` stubs for singleton and credential leak assertions
- Full tests require Plan 04's `lib/s3.ts` singleton

## Full Suite Results

| Metric | Value |
|--------|-------|
| Total tests | 216 |
| Passing | 206 |
| Failing (expected red) | 4 |
| Todo stubs | 6 |
| Regressions | 0 |

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f70c86a | test(03-01): add failing service stubs for TXN-02 and OWN-01 |
| Task 2 | 4a09d30 | test(03-01): add Wave 0 failing and todo stubs for OWN-02, ARL, S3S |
