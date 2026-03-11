---
phase: 03-security-and-atomicity
plan: 02
subsystem: api
tags: [prisma, ownership, error-handling, zod, vitest]

# Dependency graph
requires:
  - phase: 03-security-and-atomicity/03-01
    provides: ForbiddenError stub tests (RED) for updateScheme and deleteScheme
provides:
  - Two-step ownership check in updateScheme (findFirst by id, then compare userId)
  - Two-step ownership check in deleteScheme (findFirst by id, then compare userId)
  - ForbiddenError thrown on wrong-owner access (HTTP 403)
  - TXN-01/TXN-02 confirmed satisfied (transaction already present, no changes needed)
affects:
  - 03-03-security-and-atomicity (ARL — rate limiting)
  - 03-04-security-and-atomicity (S3S — singleton)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step ownership check: findFirst({ where: { id } }), then compare record.userId to caller userId"
    - "ForbiddenError (403) for wrong-owner, NotFoundError (404) for missing resource — distinct HTTP semantics"

key-files:
  created: []
  modified:
    - server/src/services/color-schemes.service.ts

key-decisions:
  - "Two-step ownership lookup chosen over combined findFirst({ where: { id, userId } }) — enables 403 vs 404 distinction"
  - "getScheme intentionally left with combined query — read operations do not need to distinguish ownership from existence"
  - "TXN-01/TXN-02 confirmed already satisfied by existing prisma.$transaction() at line 141 — no code changes required"

patterns-established:
  - "Ownership check pattern: const existing = await prisma.model.findFirst({ where: { id } }); if (!existing) throw NotFoundError; if (existing.userId !== userId) throw ForbiddenError;"

requirements-completed:
  - TXN-01
  - TXN-02
  - OWN-01
  - OWN-02

# Metrics
duration: 1min
completed: 2026-03-11
---

# Phase 3 Plan 02: Ownership Enforcement Summary

**Two-step ownership check in color-schemes service — ForbiddenError (403) for wrong-owner access, NotFoundError (404) for missing schemes, TXN confirmed unchanged.**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-11T20:36:02Z
- **Completed:** 2026-03-11T20:37:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Confirmed TXN-01 and TXN-02 already satisfied — `prisma.$transaction()` present in `updateScheme`, propagation test green
- Fixed `updateScheme` to use two-step lookup: find by `id` only, then compare `userId`, throwing `ForbiddenError` on mismatch
- Fixed `deleteScheme` with the same two-step pattern
- Added `ForbiddenError` to the import from `../lib/errors`
- All 5 service-level ownership tests pass (green)
- Both route-level 403 stub tests from Plan 01 now pass (green)
- Full test suite: 210 passed, 0 failed, 6 todo (ARL/S3S stubs from Plan 01)
- Zero TypeScript errors (`tsc --noEmit`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify TXN-01 and TXN-02** - No commit (read-and-confirm only, no code changes)
2. **Task 2: Fix two-step ownership check** - `971de93` (fix)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `server/src/services/color-schemes.service.ts` - Added `ForbiddenError` import; replaced combined `findFirst({ where: { id, userId } })` with two-step lookup in `updateScheme` and `deleteScheme`

## Decisions Made
- Two-step ownership lookup chosen over combined query — enables callers to distinguish "scheme not found" (404) from "you don't own this scheme" (403). Angular client can show different UX responses for each case.
- `getScheme` intentionally left with combined query per CONTEXT.md — read operations returning a 404 for both cases is acceptable; only mutating operations need the distinction.
- TXN-01/TXN-02 confirmed already satisfied — `prisma.$transaction()` was present at line 141, and the propagation test (TXN-02) passed without any changes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The TDD RED/GREEN cycle matched expectations precisely: 2 ForbiddenError tests were RED before the fix, all 5 service tests were GREEN after.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- OWN-01 and OWN-02 requirements fully satisfied
- TXN-01 and TXN-02 requirements confirmed satisfied
- Ready for Phase 03 Plan 03 (ARL — dedicated auth rate limiting)
- ARL requires `createApp` options flag for test isolation — that infrastructure work is planned in 03-03

## Self-Check: PASSED

- `server/src/services/color-schemes.service.ts` — FOUND
- `.planning/phases/03-security-and-atomicity/03-02-SUMMARY.md` — FOUND
- Commit `971de93` — FOUND

---
*Phase: 03-security-and-atomicity*
*Completed: 2026-03-11*
