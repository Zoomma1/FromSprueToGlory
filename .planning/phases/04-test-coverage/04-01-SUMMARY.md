---
phase: 04-test-coverage
plan: 01
subsystem: auth
tags: [admin, middleware, schema, migration, tests, three-tier-auth]
dependency_graph:
  requires: []
  provides: [TST-03]
  affects:
    - server/prisma/schema.prisma
    - server/src/middleware/admin.middleware.ts
    - server/src/app.ts
    - server/tests/admin.test.ts
tech_stack:
  added: []
  patterns: [adminMiddleware async DB lookup, asyncHandler wrapper, three-tier auth 401/403/200]
key_files:
  created:
    - server/src/middleware/admin.middleware.ts
    - server/prisma/migrations/20260312150500_add_isadmin_to_user/migration.sql
  modified:
    - server/prisma/schema.prisma
    - server/src/app.ts
    - server/tests/admin.test.ts
decisions:
  - "adminMiddleware throws ForbiddenError (not returns 403 directly) — asyncHandler wraps it for error propagation"
  - "app.ts uses authMiddleware + asyncHandler(adminMiddleware) chain before adminRoutes"
  - "admin.test.ts rewritten: beforeEach mocks prisma.user.findUnique to return admin user; 401/403/200 tests added for both endpoints"
metrics:
  duration: 15 min
  completed_date: "2026-03-12"
  tasks_completed: 2
  files_modified: 5
---

# Phase 4 Plan 01: Admin Middleware Summary

Added `isAdmin Boolean @default(false)` to the Prisma User model, created `adminMiddleware` that loads the user from DB and throws ForbiddenError if not admin, wired it into `app.ts`, and rewrote `admin.test.ts` with full three-tier auth coverage (401/403/200). 22 tests pass.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add isAdmin schema + migration + create adminMiddleware | 762073e | schema.prisma, migration.sql, admin.middleware.ts |
| 2 | Wire middleware into app.ts + rewrite admin.test.ts | 762073e | app.ts, admin.test.ts |

## What Was Built

**schema.prisma:** `isAdmin Boolean @default(false)` added to User model. Migration applied via `npx prisma migrate dev`.

**admin.middleware.ts:** Async middleware that queries `prisma.user.findUnique({ where: { id: req.userId } })` and throws `ForbiddenError('Admin access required')` if user is missing or `isAdmin=false`.

**app.ts:** `/api/admin` route mount updated from bare `adminRoutes` to `authMiddleware, asyncHandler(adminMiddleware), adminRoutes` — enforces JWT auth (401) then admin check (403).

**admin.test.ts:** Rewritten with:
- Auth tier describe block: 401 (no header) and 403 (non-admin user) for both endpoints
- All existing business logic tests updated to include `Authorization: Bearer valid-token` header and `beforeEach` mock for `prisma.user.findUnique` returning admin user

## Self-Check

### Files exist:
- server/prisma/schema.prisma: isAdmin field present ✓
- server/src/middleware/admin.middleware.ts: created ✓
- server/src/app.ts: adminMiddleware wired ✓
- server/tests/admin.test.ts: 22 tests, three-tier coverage ✓

### Commits:
- 762073e: feat(04-01) — wire adminMiddleware + rewrite admin.test.ts

### Test results: 291 passed, 0 failed

## Self-Check: PASSED
