# Phase 1: Service Layer - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract business logic from all 10 route handlers into dedicated service modules. Pure refactoring — no new features, no API contract changes. Route handlers become thin routing glue; services own validation, business logic, and DB queries.

Routes in scope: items, projects, color-schemes, user-paints, auth, media, admin, export, reference, account.

</domain>

<decisions>
## Implementation Decisions

### Service Responsibility
- Services own: Zod schema definitions, request validation, business logic, all Prisma queries
- Route handlers own: auth middleware (already separate), extract `userId` from `req.userId`, call service, send HTTP response
- `userId` is passed as a parameter to services — services are user-aware and own user-scoped DB queries
- Route handlers contain no business logic — just call service, get result, `res.json(result)` / `res.status(X).json(result)`

### Error Signaling
- Services throw custom typed errors (never return `{ error }` objects)
- Error classes live in `server/src/lib/errors.ts` (new file, alongside `prisma.ts`)
- Minimum error types: `NotFoundError` (404), `ValidationError` (400), `ForbiddenError` (403), `ConflictError` (409)
- A shared Express error-handler middleware in `app.ts` catches all thrown errors and maps them to HTTP responses
- Route handlers have no try-catch — they just `await service.doThing(...)` and the middleware handles failures

### File Naming & Location
- New directory: `server/src/services/`
- Naming convention: `<resource>.service.ts` — e.g. `items.service.ts`, `auth.service.ts`
- Mirrors the existing `routes/` naming exactly

### Extraction Strategy
- **Plan 1 (pattern setter):** Create `errors.ts` + extract `items.routes.ts` + add error middleware to `app.ts`. Establishes the full pattern.
- **Plan 2 (bulk):** Extract remaining 9 routes following the established pattern.
- Tests updated inline per plan — existing tests run after each plan as the safety net; no dedicated test plan

### Claude's Discretion
- Exact class hierarchy for custom errors (extends Error, extends HttpError, etc.)
- Whether to export a typed `AppError` base class or keep errors flat
- How to handle Zod `ZodError` wrapping inside `ValidationError`

</decisions>

<specifics>
## Specific Ideas

No specific references or "I want it like X" requirements — standard service layer extraction.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `server/src/lib/prisma.ts`: Prisma singleton — already imported in all routes, same import path works in services
- `server/src/middleware/auth.middleware.ts`: Already separate — stays in route handlers, not touched by this phase
- `server/src/utils/jwt.ts`: Auth-specific utilities — stays in auth service

### Established Patterns
- No barrel files — direct imports (services import prisma directly, routes import service directly)
- kebab-case file naming with `.service.ts` suffix matches existing conventions
- Strict TypeScript — no `any` (ESLint enforced); service function signatures must be fully typed
- Every route currently starts with `const userId = req.userId as string;` — this line stays in route handlers, userId flows into service as a param

### Integration Points
- `server/src/app.ts`: Add error middleware at the bottom (after all route mounts) — `app.use(errorHandler)`
- `server/src/routes/*.routes.ts`: Each route file imports its service, replaces inline logic with service calls
- `server/tests/*.test.ts`: Tests hit the HTTP layer via Supertest — should pass unchanged if API contracts are preserved

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-service-layer*
*Context gathered: 2026-03-10*
