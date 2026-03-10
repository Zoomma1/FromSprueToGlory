# From Sprue to Glory — Technical Debt Milestone

## What This Is

From Sprue to Glory is a mini-SaaS for tracking Warhammer figurines through their painting lifecycle — from unopened box (Pile of Shame) to finished model. This milestone addresses accumulated technical debt to improve code quality, security, performance, and maintainability across the Express/TypeScript backend.

## Core Value

The backend must be maintainable, testable, and secure — business logic extracted from route handlers, consistent validation enforced, and critical operations protected from partial failure.

## Requirements

### Validated

- ✓ JWT authentication with refresh token rotation — existing
- ✓ Figurine item CRUD (with status tracking and images) — existing
- ✓ Project grouping of items — existing
- ✓ Color scheme management with paint steps — existing
- ✓ User custom paints (UserCustomPaint, merged client-side with reference paints) — existing
- ✓ S3/MinIO pre-signed URL media uploads — existing
- ✓ Reference data API (paints, brands, game systems, factions, techniques) — existing
- ✓ Admin and export routes — existing
- ✓ Global rate limiting (100 req/15min) — existing
- ✓ Zod validation on auth routes — existing
- ✓ Prisma singleton (`lib/prisma.ts`) — existing

### Active

- [ ] Service layer: extract business logic from all route handlers into dedicated service modules
- [ ] Pagination: add limit/offset pagination to item list and project list endpoints
- [ ] Prisma transaction: wrap color scheme step replace-all in an atomic transaction
- [ ] Auth rate limiting: add tighter rate limiting on `/api/auth` routes (login, signup, refresh)
- [ ] Ownership validation: verify colorSchemeId belongs to authenticated user before mutating steps
- [ ] Zod validation: apply uniform Zod validation across all routes (items, projects, color-schemes, user-paints, media, admin, export)
- [ ] S3 singleton: refactor S3 client to a module-level singleton (not per-request)
- [ ] Test coverage: comprehensive tests for media, export, and admin routes (happy path, error cases, edge cases, Zod validation errors)

### Out of Scope

- CSRF protection — not in this milestone (separate security pass)
- Weak password validation — not in this milestone
- Orphan cleanup on custom paint deletion — not in this milestone
- JWT refresh race condition fix — not in this milestone
- In-memory caching of reference data — not in this milestone
- PostgreSQL connection pool tuning — not in this milestone
- S3 lifecycle policies — not in this milestone

## Context

- Codebase is fully mapped in `.planning/codebase/`
- All M0–M12 milestones complete; this is the first dedicated tech debt pass
- Backend: Express + TypeScript, no service layer currently (logic in route handlers)
- Tests use Vitest + Supertest; test runner: `npm run test` in `server/`
- `createApp()` factory in `app.ts` is already testable (used by existing tests)
- S3 client currently instantiated per-request in `media.routes.ts`
- Color scheme steps use delete-all + insert strategy (non-atomic)

## Constraints

- **Tech stack**: No new dependencies unless strictly necessary — use existing Express, Prisma, Zod, Vitest
- **Compatibility**: Service extraction must not break existing API contracts (same request/response shapes)
- **Testing**: Server tests only (Vitest); no Angular/Karma scope in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All routes get service layer | Complete separation prevents partial debt | — Pending |
| Comprehensive test coverage | Happy path + errors + edge cases + Zod errors | — Pending |
| These 8 items only | Focused milestone, ship faster | — Pending |

---
*Last updated: 2026-03-10 after initialization*
