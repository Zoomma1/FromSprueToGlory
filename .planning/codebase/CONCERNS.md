# CONCERNS.md — Technical Debt, Bugs & Areas of Concern

## Tech Debt

### Express Type Workaround
- `server/src/types/express.d.ts` augments `Request` to add `userId` — functional but a workaround for missing proper typed middleware chaining.

### No Service Layer
- Business logic lives directly in route handlers. As complexity grows, this makes reuse and testing harder. No separation between HTTP handling and business logic.

### Orphan Cleanup on Custom Paint Deletion
- When a `UserCustomPaint` is deleted, `ColorSchemeStep` rows referencing it via `userCustomPaintId` may be left with dangling FKs (depending on DB constraints). No cascade or cleanup logic confirmed.

### Missing Server-Side Validation on Some Routes
- Zod validation is present for auth but may not be uniformly applied across all routes (items, projects, color-schemes).

---

## Security Considerations

### S3 Credential Logging Risk
- MinIO/S3 credentials configured via env vars. If logging is careless (e.g., logging full config objects), credentials could leak to console logs.

### CSRF Gap
- No CSRF protection middleware visible. Refresh token in cookie is HttpOnly but CSRF tokens are not used — potentially vulnerable to CSRF attacks on state-mutating endpoints.

### XSS via localStorage
- If any auth tokens or sensitive data are stored in localStorage (vs. HttpOnly cookies), XSS could expose them.

### Weak Password Validation
- No minimum password complexity rules enforced server-side (length, character requirements).

### Insufficient Auth Rate Limiting
- Global rate limit is 100 req/15min for all routes. Auth endpoints (login, signup) should have tighter rate limiting to prevent brute-force attacks.

### Missing colorSchemeId Ownership Validation
- Some color scheme step endpoints may not verify that the `colorSchemeId` belongs to the authenticated user before mutating steps.

---

## Known Bugs

### Orphaned Paint References
- If a `Paint` or `UserCustomPaint` is deleted, `ColorSchemeStep` records referencing it may have null FKs with no UI indication.

### Unnecessary Parameter Array Checks
- Some route handlers may defensively check array parameters that cannot be arrays given Zod schemas — dead validation code.

---

## Performance Bottlenecks

### Duplicate S3 Client Instantiation
- S3/MinIO client may be instantiated per-request rather than as a singleton, causing unnecessary overhead.

### Over-fetched Items
- Item list queries may fetch all fields including large text/metadata when list views only need summary fields. No field selection/projection visible.

### Missing Pagination
- Item and project list endpoints appear to return all records. No pagination, cursor, or limit/offset parameters confirmed — will degrade at scale.

### Uncached Reference Data
- Reference data (paints, brands, game systems, factions, techniques) is fetched from DB on every request. These are mostly static and would benefit from in-memory caching or a cache layer.

---

## Fragile Areas

### Color Scheme Step Replacement Strategy
- Steps use a replace-all strategy: delete all existing steps, insert new ones. This is simple but non-atomic — a failure mid-operation could leave the scheme with no steps. Should be wrapped in a Prisma transaction.

### JWT Refresh Race Conditions
- If multiple concurrent requests trigger token refresh simultaneously, there's potential for refresh token invalidation race conditions (double-spend). No mutex or queuing mechanism observed.

### localStorage Parse Errors
- If token storage in localStorage is corrupted or manually edited, JSON.parse could throw. Error handling for this edge case may be missing.

### Large Untested Component
- `SchemeDetailComponent` (`client/src/app/features/color-schemes/scheme-detail/`) is the most complex component (paint step editor) but has minimal test coverage.

---

## Test Coverage Gaps

### Zero Coverage on Several Server Routes
- `media.routes.ts`, `export.routes.ts`, `admin.routes.ts` — no corresponding test files found or tests are minimal.

### Minimal Client Service Tests
- `api.service.spec.ts` and `auth.service.spec.ts` exist but may not cover error paths, token refresh logic, or interceptor edge cases.

### Untested Media Flows
- S3 pre-signed URL generation and upload confirmation flows have no integration tests.

### Untested Zod Validation Errors
- Validation error response shapes from Zod may not be covered in tests, risking silent regressions.

---

## Scaling Limits

### PostgreSQL Connection Pool
- Default Prisma connection pool may be insufficient under concurrent load. Not tuned for production traffic.

### Reference Data Volume
- As the paint catalog grows (thousands of paints across brands), unfiltered reference queries will slow down.

### S3 Storage
- No lifecycle policies or cleanup for orphaned media files (if items/images are deleted, S3 objects may persist).

---

## Dependencies at Risk

| Dependency | Risk |
|---|---|
| Angular 19 | Rapid release cadence; staying current requires regular upgrades |
| Prisma | Still evolving rapidly; migrations between major versions can be breaking |
| `jsonwebtoken` | Check for security advisories; JWT libraries are high-value targets |
| `express-rate-limit` | Config should be reviewed for correctness in reverse-proxy setups |

---

## Missing Features (Future Debt)

- No audit logging (who changed what, when)
- No soft deletes (items/projects permanently deleted)
- No admin panel (admin routes exist but no UI)
- No user sharing / collaboration
- No email verification on signup
- No password reset flow
