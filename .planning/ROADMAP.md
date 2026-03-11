# Roadmap: From Sprue to Glory — Technical Debt Milestone

## Overview

This milestone eliminates accumulated technical debt across the Express/TypeScript backend. Four sequential phases address structural concerns in order of dependency: first the service layer (foundation for testability), then uniform validation and pagination (contract quality), then security and atomicity hardening (correctness), and finally comprehensive test coverage that verifies the full stack of improvements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Service Layer** - Extract business logic from all route handlers into dedicated, independently testable service modules (completed 2026-03-11)
- [x] **Phase 2: Validation and Pagination** - Apply uniform Zod validation across all routes and add limit/offset pagination to list endpoints (completed 2026-03-11)
- [ ] **Phase 3: Security and Atomicity** - Wrap color scheme step mutations in transactions, tighten auth rate limits, enforce ownership checks, and convert S3 client to singleton
- [ ] **Phase 4: Test Coverage** - Add comprehensive Vitest tests for media, export, and admin routes plus unit tests for extracted service modules

## Phase Details

### Phase 1: Service Layer
**Goal**: Business logic is fully extracted from route handlers into dedicated service modules, making the backend independently testable and maintainable
**Depends on**: Nothing (first phase)
**Requirements**: SVC-01, SVC-02, SVC-03
**Success Criteria** (what must be TRUE):
  1. Every route handler (items, projects, color-schemes, user-paints, auth, media, admin, export, reference, account) delegates to a corresponding service module — no business logic remains in the handler itself
  2. A service module can be imported and called in a Vitest test without starting Express or requiring HTTP
  3. All existing API endpoints return identical request/response shapes before and after the extraction (no contract breakage)
**Plans**: TBD

### Phase 2: Validation and Pagination
**Goal**: All routes enforce Zod validation with consistent error shapes, and list endpoints expose paginated results
**Depends on**: Phase 1
**Requirements**: PAG-01, PAG-02, PAG-03, ZOD-01, ZOD-02, ZOD-03, ZOD-04, ZOD-05, ZOD-06, ZOD-07, ZOD-08
**Success Criteria** (what must be TRUE):
  1. Sending an invalid body or query parameter to any item, project, color-scheme, user-paint, media, admin, or export route returns a 400 response with a structured Zod error detail (not a generic 500)
  2. `GET /api/items` and `GET /api/projects` accept `limit` and `offset` query parameters and return paginated results alongside a total count
  3. Omitting `limit` and `offset` from list requests uses sensible defaults (limit=20, offset=0) without error
  4. Every route that previously lacked Zod validation now rejects malformed input with a consistent 400 shape
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Shared pagination schema (paginationSchema in lib/pagination.ts)
- [ ] 02-02-PLAN.md — Items and projects pagination + strict schemas
- [ ] 02-03-PLAN.md — Color-schemes and user-paints strict schemas
- [ ] 02-04-PLAN.md — Zod validation for media, admin, and export routes (gap closure)

### Phase 3: Security and Atomicity
**Goal**: Color scheme step mutations are atomic, auth endpoints are rate-limited, ownership is enforced, and the S3 client is a singleton
**Depends on**: Phase 2
**Requirements**: TXN-01, TXN-02, ARL-01, ARL-02, ARL-03, OWN-01, OWN-02, S3S-01, S3S-02
**Success Criteria** (what must be TRUE):
  1. If any step insert fails during a color scheme step replace-all, the original steps are preserved (no partial state written to the database)
  2. Sending more than the configured threshold of requests to `/api/auth/login`, `/api/auth/signup`, or `/api/auth/refresh` within 15 minutes triggers a 429 response before the global limit is reached
  3. Attempting to mutate another user's color scheme steps returns 403 (not 404, not 500, not silent success)
  4. The S3/MinIO client is instantiated once at module load; no per-request constructor calls occur and credentials are not emitted in logs
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 0 test stubs (color-schemes.service.test.ts, 403 cases, 429 todos, S3S todos)
- [ ] 03-02-PLAN.md — TXN verification + OWN two-step ownership fix in color-schemes.service.ts
- [ ] 03-03-PLAN.md — ARL: auth rate limiter in app.ts + 429 integration tests
- [ ] 03-04-PLAN.md — S3S: lib/s3.ts singleton + media.service.ts refactor + S3S passing tests

### Phase 4: Test Coverage
**Goal**: Media, export, and admin routes have comprehensive Vitest test suites, and extracted service modules have unit tests for core logic paths
**Depends on**: Phase 3
**Requirements**: TST-01, TST-02, TST-03, TST-04, TST-05
**Success Criteria** (what must be TRUE):
  1. `npm run test` in `server/` passes with test files covering media routes (pre-signed URL generation, invalid input, unauthorized, S3 error), export routes (happy path, unauthorized, invalid params, empty dataset), and admin routes (each operation, unauthorized, forbidden non-admin, invalid input)
  2. Zod validation 400 responses are asserted in tests for every route newly validated in Phase 2 (correct status code and error shape)
  3. Service modules extracted in Phase 1 have unit tests exercising core business logic without HTTP or Prisma (mocked at the service boundary)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Service Layer | 2/2 | Complete   | 2026-03-11 |
| 2. Validation and Pagination | 4/4 | Complete   | 2026-03-11 |
| 3. Security and Atomicity | 1/4 | In Progress|  |
| 4. Test Coverage | 0/TBD | Not started | - |
