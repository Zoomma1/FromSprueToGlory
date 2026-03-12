# Requirements: From Sprue to Glory — Technical Debt Milestone

**Defined:** 2026-03-10
**Core Value:** The backend must be maintainable, testable, and secure — business logic extracted from route handlers, consistent validation enforced, and critical operations protected from partial failure.

## v1 Requirements

### Service Layer

- [x] **SVC-01**: All route handlers delegate business logic to a corresponding service module (items, projects, color-schemes, user-paints, auth, media, admin, export, reference, account) — *items extracted in 01-01*
- [x] **SVC-02**: Service modules are independently importable and testable without Express context — *items.service.test.ts (19 tests, no HTTP)*
- [x] **SVC-03**: Existing API contracts (request/response shapes) remain unchanged after extraction — *175 tests pass, zero regressions*

### Pagination

- [x] **PAG-01**: Item list endpoint (`GET /api/items`) accepts `limit` and `offset` query parameters and returns paginated results with total count
- [x] **PAG-02**: Project list endpoint (`GET /api/projects`) accepts `limit` and `offset` query parameters and returns paginated results with total count
- [x] **PAG-03**: Pagination parameters have sensible defaults (e.g., limit=20, offset=0) and are validated via Zod

### Transactions

- [x] **TXN-01**: Color scheme step replace-all operation (delete + insert) is wrapped in a single Prisma transaction
- [x] **TXN-02**: If any step insert fails, the transaction rolls back and the original steps are preserved

### Auth Rate Limiting

- [x] **ARL-01**: `/api/auth/login` has a dedicated rate limit stricter than the global limit (e.g., 10 req/15min per IP)
- [x] **ARL-02**: `/api/auth/signup` has a dedicated rate limit stricter than the global limit
- [x] **ARL-03**: `/api/auth/refresh` has a dedicated rate limit stricter than the global limit

### Ownership Validation

- [x] **OWN-01**: All color scheme step mutation endpoints verify the `colorSchemeId` belongs to the authenticated user before executing
- [x] **OWN-02**: Unauthorized access to another user's color scheme steps returns 403 (not 404 or 500)

### Zod Validation

- [x] **ZOD-01**: All item routes have Zod validation on request body and query parameters
- [x] **ZOD-02**: All project routes have Zod validation on request body and query parameters
- [x] **ZOD-03**: All color-scheme routes have Zod validation on request body and query parameters
- [x] **ZOD-04**: All user-paints routes have Zod validation on request body
- [x] **ZOD-05**: All media routes have Zod validation on request body
- [x] **ZOD-06**: All admin routes have Zod validation on request body and query parameters
- [x] **ZOD-07**: All export routes have Zod validation on query parameters
- [x] **ZOD-08**: Zod validation errors return a consistent response shape (400 with structured error detail)

### S3 Singleton

- [x] **S3S-01**: S3/MinIO client is instantiated once at module load (singleton) and reused across all requests
- [x] **S3S-02**: S3 client credentials are never logged (no full config object logging)

### Test Coverage

- [x] **TST-01**: `media.routes.ts` has comprehensive tests: pre-signed URL generation (happy path), invalid input (400), unauthorized (401), S3 error simulation
- [x] **TST-02**: `export.routes.ts` has comprehensive tests: successful export (happy path), unauthorized (401), invalid query params (400), empty dataset edge case
- [ ] **TST-03**: `admin.routes.ts` has comprehensive tests: each admin operation (happy path), unauthorized (401), forbidden non-admin (403), invalid input (400)
- [ ] **TST-04**: Zod validation error responses are tested for all newly validated routes (confirm 400 shape)
- [ ] **TST-05**: Service modules extracted in SVC-01 have unit tests for core business logic paths

## v2 Requirements

### Security (deferred)

- **SEC-01**: CSRF protection middleware on state-mutating endpoints
- **SEC-02**: Server-side password complexity validation (min length, character rules)
- **SEC-03**: Orphan cleanup on UserCustomPaint deletion (cascade or explicit cleanup)

### Performance (deferred)

- **PERF-01**: In-memory caching for reference data (paints, brands, game systems)
- **PERF-02**: Field projection on item list queries (select summary fields only)
- **PERF-03**: PostgreSQL connection pool tuning

## Out of Scope

| Feature | Reason |
|---------|--------|
| CSRF protection | Separate security milestone |
| Password complexity | Separate security milestone |
| Orphan cleanup | Low-impact, separate pass |
| JWT refresh race condition | Complex fix, separate investigation |
| Reference data caching | Performance milestone, not this pass |
| S3 lifecycle policies | Ops concern, not this pass |
| Angular/client tests | Server-only scope for this milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SVC-01 | Phase 1 | Complete |
| SVC-02 | Phase 1 | Complete |
| SVC-03 | Phase 1 | Complete |
| PAG-01 | Phase 2 | Complete |
| PAG-02 | Phase 2 | Complete |
| PAG-03 | Phase 2 | Complete |
| TXN-01 | Phase 3 | Complete |
| TXN-02 | Phase 3 | Complete |
| ARL-01 | Phase 3 | Complete |
| ARL-02 | Phase 3 | Complete |
| ARL-03 | Phase 3 | Complete |
| OWN-01 | Phase 3 | Complete |
| OWN-02 | Phase 3 | Complete |
| ZOD-01 | Phase 2 | Complete |
| ZOD-02 | Phase 2 | Complete |
| ZOD-03 | Phase 2 | Complete |
| ZOD-04 | Phase 2 | Complete |
| ZOD-05 | Phase 2 | Complete |
| ZOD-06 | Phase 2 | Complete |
| ZOD-07 | Phase 2 | Complete |
| ZOD-08 | Phase 2 | Complete |
| S3S-01 | Phase 3 | Complete |
| S3S-02 | Phase 3 | Complete |
| TST-01 | Phase 4 | Complete |
| TST-02 | Phase 4 | Complete |
| TST-03 | Phase 4 | Pending |
| TST-04 | Phase 4 | Pending |
| TST-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 after initial definition*
