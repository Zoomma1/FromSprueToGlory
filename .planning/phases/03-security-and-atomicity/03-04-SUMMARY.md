---
phase: 03-security-and-atomicity
plan: 04
subsystem: infra
tags: [s3, aws-sdk, singleton, media, minio]

# Dependency graph
requires:
  - phase: 03-01
    provides: S3S todo stubs in media.test.ts and S3 env var setup
provides:
  - S3Client lazy singleton in lib/s3.ts (getS3Client())
  - media.service.ts refactored to use getS3Client() with static imports
  - 3 passing S3S-01/02 tests replacing it.todo() stubs
affects: [any future code that creates S3 presigned URLs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy singleton for optional external services: module-level variable, null when env missing, constructed on first call"
    - "Callers check null and throw 503 — decouples availability check from construction"

key-files:
  created:
    - server/src/lib/s3.ts
  modified:
    - server/src/services/media.service.ts
    - server/tests/media.test.ts

key-decisions:
  - "S3Client singleton uses module-level variable (not globalThis) — S3Client has no connection pool, hot-reload resilience not needed"
  - "getS3Client() returns null (not throws) when env missing — callers decide error semantics (503)"
  - "Static imports for @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner replace dynamic import workaround — aws-sdk is always installed"
  - "media.test.ts mocks lib/s3 (not @aws-sdk/client-s3) for S3S tests — service boundary is now getS3Client(), not the SDK"

patterns-established:
  - "Optional infrastructure singleton: lib/s3.ts pattern mirrors lib/prisma.ts but returns null instead of crashing on missing config"

requirements-completed: [S3S-01, S3S-02]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 3 Plan 04: S3 Client Singleton Summary

**S3Client lazy singleton in lib/s3.ts eliminates per-request construction; media.service.ts uses static imports and getS3Client() with 503 on null; all 3 S3S-01/02 test stubs now pass**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-11T21:43:26Z
- **Completed:** 2026-03-11T21:48:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `server/src/lib/s3.ts` with lazy singleton `getS3Client()` — null when env vars missing, constructs once on first call, reuses thereafter
- Refactored `media.service.ts` to use `getS3Client()` with static imports, removing the dynamic `await import()` workaround and the `isS3Configured()` helper
- Replaced 3 `it.todo()` stubs in `media.test.ts` with passing S3S-01/02 tests (singleton called, 503 on null, no credential logging)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server/src/lib/s3.ts lazy singleton** - `2b4e007` (feat)
2. **Task 2: Refactor media.service.ts and replace S3S todo stubs** - `38b297c` (feat)

## Files Created/Modified
- `server/src/lib/s3.ts` — new lazy singleton; `getS3Client()` returns `S3Client | null`
- `server/src/services/media.service.ts` — removed `isS3Configured()` and dynamic imports; uses `getS3Client()` and static AWS SDK imports
- `server/tests/media.test.ts` — mocks `lib/s3` instead of `@aws-sdk/client-s3` for S3Client; 3 new S3S passing tests

## Decisions Made
- Module-level variable (not `globalThis`) for the singleton: `S3Client` has no connection pool, so hot-reload survival is unnecessary
- `getS3Client()` returns `null` rather than throwing: keeps the singleton dumb; callers own the 503 decision
- Static imports replace `await import()`: the dynamic import was a workaround for optional aws-sdk installation that no longer applies
- Tests mock `../src/lib/s3` not `@aws-sdk/client-s3`: after refactor the service boundary is `getS3Client()`, making the SDK mock irrelevant for S3 availability tests

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- S3S-01 and S3S-02 requirements fully satisfied
- Phase 3 is now complete: TXN (01), OWN (02), ARL (03), S3S (04) all done
- Full test suite: 216/216 passing, zero regressions

---
*Phase: 03-security-and-atomicity*
*Completed: 2026-03-11*
