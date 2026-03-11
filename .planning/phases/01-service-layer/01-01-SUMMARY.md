---
phase: 01-service-layer
plan: 01
subsystem: api
tags: [express, typescript, zod, prisma, vitest, service-layer, error-handling]

# Dependency graph
requires: []
provides:
  - AppError base class and 5 subclasses (NotFoundError, ValidationError, ForbiddenError, ConflictError, UnauthorizedError)
  - asyncHandler utility for wrapping async Express route handlers
  - Centralized errorHandler middleware mounted in createApp()
  - items.service.ts with all items business logic extracted from route handler
  - Thin items.routes.ts delegating to service via asyncHandler
  - items.service.test.ts unit tests calling service functions directly (no HTTP)
affects:
  - 01-service-layer/01-02 (and all subsequent plans) — every route extraction follows this pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service layer: route handlers contain only userId extraction + service call + res.json()"
    - "asyncHandler wrapper: catches promise rejections and forwards to next(err)"
    - "Centralized error handler: instanceof AppError → correct HTTP status, else 500"
    - "AppError subclasses: Object.setPrototypeOf fixes TypeScript instanceof for Error subclasses"
    - "Unit tests: direct service function calls with mocked prisma, no HTTP/Supertest"

key-files:
  created:
    - server/src/lib/errors.ts
    - server/src/lib/async-handler.ts
    - server/src/services/items.service.ts
    - server/tests/services/items.service.test.ts
  modified:
    - server/src/app.ts
    - server/src/routes/items.routes.ts

key-decisions:
  - "No express-async-errors dependency — asyncHandler utility achieves same result with zero new packages"
  - "Zod schemas moved to service layer — validation is business logic, not HTTP concern"
  - "Object.setPrototypeOf in AppError constructor — required for correct instanceof at runtime in TypeScript ES5 output"
  - "ValidationError carries a details field — preserves Zod flatten() shape expected by existing tests"

patterns-established:
  - "Pattern: Route handler = userId extraction + await service.fn() + res.json(result)"
  - "Pattern: Service function = validate input (Zod) + check ownership (prisma.findFirst) + execute + return plain value or throw AppError"
  - "Pattern: Unit test = vi.mock prisma at ../../src/lib/prisma + import service + call function directly"

requirements-completed: [SVC-01, SVC-02, SVC-03]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 1 Plan 01: Service Layer Foundation Summary

**AppError error hierarchy + asyncHandler + centralized error middleware + items.service.ts extraction, establishing the service layer pattern for all subsequent route extractions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-11T09:45:39Z
- **Completed:** 2026-03-11T09:48:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created error hierarchy: AppError base + NotFoundError, ValidationError, ForbiddenError, ConflictError, UnauthorizedError with correct instanceof support
- Created asyncHandler utility that wraps async Express handlers to forward rejections to the centralized error handler
- Wired errorHandler middleware into createApp() after all route mounts — any thrown AppError now produces correct HTTP status
- Extracted all items business logic into items.service.ts (Zod schemas, Prisma calls, ownership checks, transaction)
- Rewrote items.routes.ts as a thin adapter — no Prisma imports, no Zod schemas, no business logic
- 19 new unit tests for items service pass; all 175 tests (10 test files) green with zero regressions

## Task Commits

Each task was committed atomically:

Note: Per project convention (CLAUDE.md), git operations are performed by Victor. Commit commands are provided below.

**Task 1: Create errors.ts and wire error handler into app.ts**
Files: server/src/lib/errors.ts, server/src/lib/async-handler.ts, server/src/app.ts

**Task 2 (TDD): Extract items service and update items route handler**
Files: server/src/services/items.service.ts, server/tests/services/items.service.test.ts (RED commit), server/src/routes/items.routes.ts (GREEN commit)

## Files Created/Modified
- `server/src/lib/errors.ts` — AppError base class + 5 domain subclasses
- `server/src/lib/async-handler.ts` — asyncHandler wrapper for async Express route handlers
- `server/src/app.ts` — Added errorHandler import and mount after all routes
- `server/src/services/items.service.ts` — All items business logic (listItems, getItem, createItem, updateItem, deleteItem, changeStatus, getHistory) + Zod schemas
- `server/src/routes/items.routes.ts` — Rewritten as thin HTTP adapter using asyncHandler and itemsService
- `server/tests/services/items.service.test.ts` — 19 unit tests calling service functions directly

## Decisions Made
- No express-async-errors dependency — asyncHandler utility achieves same result (catches promise rejections, forwards to next(err)) with zero new packages, consistent with "no new dependencies" project decision
- Zod schemas moved to service layer — validation is business logic, not an HTTP concern; keeps service self-contained
- Object.setPrototypeOf in AppError constructor — TypeScript compiles class extensions to ES5 which breaks instanceof for Error subclasses; this fix is required for errorHandler's instanceof checks to work at runtime
- ValidationError carries an optional details field — preserves the Zod flatten() error shape that existing integration tests assert

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in tests/admin.test.ts (argument type null not assignable — line 112) was present before this plan and is out of scope. All new files compile cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Service layer pattern fully established: errors.ts + asyncHandler + errorHandler + service file + thin route file + service unit tests
- Plan 02 can mechanically repeat this pattern for the remaining routes (auth, projects, color-schemes, user-paints, account)
- No blockers

## Self-Check: PASSED

All created files verified on disk:
- server/src/lib/errors.ts: FOUND
- server/src/lib/async-handler.ts: FOUND
- server/src/services/items.service.ts: FOUND
- server/tests/services/items.service.test.ts: FOUND
- .planning/phases/01-service-layer/01-01-SUMMARY.md: FOUND

All tests verified: 175 tests, 10 test files, 0 failures.

---
*Phase: 01-service-layer*
*Completed: 2026-03-11*
