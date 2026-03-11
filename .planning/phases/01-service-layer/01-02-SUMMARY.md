---
phase: 01-service-layer
plan: 02
subsystem: server/services
tags: [service-layer, refactoring, extraction, typescript]
dependency_graph:
  requires: [01-01]
  provides: [SVC-01, SVC-02, SVC-03]
  affects: [all route files, all service files]
tech_stack:
  added: []
  patterns: [service-layer, thin-adapter, asyncHandler, discriminated-union-return]
key_files:
  created:
    - server/src/services/projects.service.ts
    - server/src/services/color-schemes.service.ts
    - server/src/services/auth.service.ts
    - server/src/services/user-paints.service.ts
    - server/src/services/account.service.ts
    - server/src/services/reference.service.ts
    - server/src/services/media.service.ts
    - server/src/services/export.service.ts
    - server/src/services/admin.service.ts
  modified:
    - server/src/routes/projects.routes.ts
    - server/src/routes/color-schemes.routes.ts
    - server/src/routes/auth.routes.ts
    - server/src/routes/user-paints.routes.ts
    - server/src/routes/account.routes.ts
    - server/src/routes/reference.routes.ts
    - server/src/routes/media.routes.ts
    - server/src/routes/export.routes.ts
    - server/src/routes/admin.routes.ts
    - server/tests/auth.test.ts
    - server/tests/admin.test.ts
decisions:
  - "auth.service.ts uses unified 'Invalid or expired refresh token' message for both JWT failures and DB-not-found cases"
  - "admin.service.ts imports PaintType from @prisma/client to avoid string/enum mismatch — no any types"
  - "export.service.ts returns discriminated union { type: 'csv' | 'json' } so route sets headers without knowing CSV logic"
  - "media.service.ts throws AppError(503) for S3 not configured — error handler serializes consistently"
  - "reference.service.ts functions take no userId — public reference data has no user scoping"
metrics:
  duration: "26 min"
  completed: "2026-03-11"
  tasks_completed: 2
  files_created: 9
  files_modified: 11
---

# Phase 1 Plan 02: Extract Remaining 9 Service Modules Summary

**One-liner:** All 9 remaining route handlers fully extracted to typed service modules — auth uses UnauthorizedError/ConflictError, admin uses PaintSyncItem interface, export uses discriminated union return type.

## What Was Built

Completed the service layer extraction started in Plan 01. Every route file in the codebase is now a thin HTTP adapter: it extracts HTTP-level values (userId, params, query, body), delegates to a service function, and maps the return to an HTTP response. All business logic, Zod validation, Prisma queries, and domain error throwing live in the service layer.

### Service modules created

| Service | Functions | Notes |
|---------|-----------|-------|
| `projects.service.ts` | listProjects, createProject, getProject, updateProject, deleteProject, assignItems, unassignItems | computeCompletion is module-private |
| `color-schemes.service.ts` | listSchemes, getScheme, createScheme, updateScheme, deleteScheme | validateStepOrder module-private; $transaction in service |
| `auth.service.ts` | signup, login, refresh, logout | Throws UnauthorizedError/ConflictError instead of inline res.status() |
| `user-paints.service.ts` | listPaints, createPaint, deletePaint | PAINT_TYPES constant moved here |
| `account.service.ts` | deleteAccount | Minimal — single Prisma call |
| `reference.service.ts` | getGameSystems, getFactions, getModels, getPaintBrands, getPaints, getTechniques | No userId on any function |
| `media.service.ts` | presignUpload, presignRead | Dynamic imports stay; AppError(503) for unconfigured S3 |
| `export.service.ts` | exportItems, exportColorSchemes | exportItems returns discriminated union (csv/json) |
| `admin.service.ts` | syncPaints, exportPaints | PaintSyncItem interface replaces any |

## Verification Results

- `npx vitest run`: 175/175 tests pass
- `npx tsc --noEmit`: zero errors
- `npx eslint src/services/ --max-warnings=0`: zero warnings
- No Prisma imports in any route file
- No Express type imports in any service file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unified refresh token error message in auth.service.ts**
- **Found during:** Task 1 (test run)
- **Issue:** The plan specified `'Invalid or expired refresh token'` for both JWT verification failures and DB-not-found. The existing test expected `'Invalid refresh token'` for the JWT failure case (legacy message from the old route).
- **Fix:** Updated `tests/auth.test.ts` line 280 to expect `'Invalid or expired refresh token'` — consistent with the plan spec and with the other two refresh error tests.
- **Files modified:** `server/tests/auth.test.ts`
- **Commit:** addb3cd

**2. [Rule 1 - Bug] PaintType cast in admin.service.ts**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `PaintSyncItem.type` is `string`, but `prisma.paint.create` expects `PaintType` enum. TypeScript error TS2322.
- **Fix:** Added `import type { PaintType } from '@prisma/client'` and cast `type as PaintType` at the Prisma create call.
- **Files modified:** `server/src/services/admin.service.ts`
- **Commit:** deb0e04

**3. [Rule 1 - Bug] Fixed admin test send(null) TypeScript error**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `request(app).post(ENDPOINT).send(null)` — supertest's `send()` signature does not accept `null`. TypeScript error TS2345. Also caused a body-parser SyntaxError at runtime since strict JSON parsing rejects top-level null.
- **Fix:** Changed `send(null)` to `send({})` — an object body is equally non-array, triggers the same validation path, and is well-typed.
- **Files modified:** `server/tests/admin.test.ts`
- **Commit:** deb0e04

## Self-Check: PASSED

All 9 service files confirmed on disk. Both task commits verified in git log.