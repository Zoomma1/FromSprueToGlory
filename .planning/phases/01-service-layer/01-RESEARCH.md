# Phase 1: Service Layer - Research

**Researched:** 2026-03-10
**Domain:** Express/TypeScript service layer extraction — pure backend refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Service Responsibility**
- Services own: Zod schema definitions, request validation, business logic, all Prisma queries
- Route handlers own: auth middleware (already separate), extract `userId` from `req.userId`, call service, send HTTP response
- `userId` is passed as a parameter to services — services are user-aware and own user-scoped DB queries
- Route handlers contain no business logic — just call service, get result, `res.json(result)` / `res.status(X).json(result)`

**Error Signaling**
- Services throw custom typed errors (never return `{ error }` objects)
- Error classes live in `server/src/lib/errors.ts` (new file, alongside `prisma.ts`)
- Minimum error types: `NotFoundError` (404), `ValidationError` (400), `ForbiddenError` (403), `ConflictError` (409)
- A shared Express error-handler middleware in `app.ts` catches all thrown errors and maps them to HTTP responses
- Route handlers have no try-catch — they just `await service.doThing(...)` and the middleware handles failures

**File Naming & Location**
- New directory: `server/src/services/`
- Naming convention: `<resource>.service.ts` — e.g. `items.service.ts`, `auth.service.ts`
- Mirrors the existing `routes/` naming exactly

**Extraction Strategy**
- Plan 1 (pattern setter): Create `errors.ts` + extract `items.routes.ts` + add error middleware to `app.ts`. Establishes the full pattern.
- Plan 2 (bulk): Extract remaining 9 routes following the established pattern.
- Tests updated inline per plan — existing tests run after each plan as the safety net; no dedicated test plan

### Claude's Discretion
- Exact class hierarchy for custom errors (extends Error, extends HttpError, etc.)
- Whether to export a typed `AppError` base class or keep errors flat
- How to handle Zod `ZodError` wrapping inside `ValidationError`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SVC-01 | All route handlers delegate business logic to a corresponding service module (items, projects, color-schemes, user-paints, auth, media, admin, export, reference, account) | Service module pattern, route-to-service wiring, Express error middleware |
| SVC-02 | Service modules are independently importable and testable without Express context | No Express types in service signatures; pure function/async function exports; Prisma mock pattern already in place |
| SVC-03 | Existing API contracts (request/response shapes) remain unchanged after extraction | Tests already cover all HTTP shapes via Supertest; run existing test suite as regression guard |
</phase_requirements>

---

## Summary

This phase is a pure refactoring of the existing Express/TypeScript backend. All business logic currently living in 10 route handler files gets moved into parallel service modules under `server/src/services/`. The routes become thin HTTP adapters: they extract `userId`, call a service function, and forward the result. A new `errors.ts` file defines typed error classes that services throw, and a new Express error-handler middleware in `app.ts` maps those errors to HTTP status codes.

No new dependencies are needed — the existing stack (Express, Prisma, Zod, Vitest, Supertest) handles everything. The existing test suite exercises the full HTTP stack via Supertest and mocked Prisma; those tests continue to be the regression safety net throughout the phase. The tests do not need structural changes, only Prisma mock updates when new service functions need additional mock entries.

The single most important architectural concern is keeping service function signatures completely free of Express types (`Request`, `Response`, `NextFunction`). This is what makes SVC-02 achievable: a service function takes plain TypeScript values and returns plain TypeScript values (or throws a typed error). The route handler is the only place where HTTP objects exist.

**Primary recommendation:** Start by creating `errors.ts` + the `items` service as the pattern-setter. Every other service is a mechanical repetition of that pattern. Run `npx vitest run` after each route extraction to catch regressions immediately.

---

## Standard Stack

### Core (no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express | ^4.21.2 | HTTP framework — routes stay, error middleware added | Already in use |
| TypeScript | ^5.7.3 | Strict typing for service signatures | Already in use, strict mode on |
| Zod | ^3.24.2 | Schema validation — moves from routes into services | Already in use |
| Prisma | ^6.4.1 | All DB queries — services import `prisma` singleton directly | Already in use |
| Vitest | ^3.0.5 | Test runner | Already in use |
| Supertest | ^7.2.2 | HTTP integration tests | Already in use |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure (after Phase 1)

```
server/src/
├── lib/
│   ├── prisma.ts        # Prisma singleton (unchanged)
│   └── errors.ts        # NEW — typed error classes
├── middleware/
│   └── auth.middleware.ts  # unchanged
├── routes/
│   └── *.routes.ts      # thin HTTP adapters — no business logic
├── services/
│   └── *.service.ts     # NEW — all business logic lives here
├── utils/
│   └── jwt.ts           # unchanged
└── app.ts               # updated — add errorHandler middleware
```

### Pattern 1: Error Class Hierarchy

**Recommendation:** Use a single `AppError` base class with `statusCode` property. Flat subclasses (no deep inheritance) are simpler to match in the error handler and easier to `instanceof`-check in tests.

```typescript
// server/src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required in TypeScript when extending Error)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public readonly details?: unknown,
  ) {
    super(400, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}
```

**Why `Object.setPrototypeOf`:** TypeScript classes extending `Error` (or any built-in) lose the correct prototype chain when transpiled to ES5/older targets. The `Object.setPrototypeOf` call restores it so `instanceof AppError` and `instanceof NotFoundError` both work correctly in tests and the error handler.

**Confidence:** HIGH — this is a well-known TypeScript pattern documented in the official handbook.

### Pattern 2: Express Error Handler Middleware

The error handler catches everything thrown by async route handlers. Express 4 requires explicit wrapping or a library for async errors unless you call `next(err)` manually. Since route handlers will have **no try-catch**, the planner must decide how uncaught async errors reach the error handler.

**Two valid approaches:**

**Option A — `express-async-errors` package (one-line install):**
```bash
npm install express-async-errors
```
Import it once at the top of `app.ts` and it monkey-patches Express to automatically forward async rejections to `next(err)`:
```typescript
import 'express-async-errors'; // must be first import
```
This is the cleanest approach. Route handlers genuinely need no try-catch.

**Option B — Manual `next(err)` in routes:**
Each route handler catches errors and calls `next(err)`:
```typescript
router.get('/', async (req, res, next) => {
  try {
    const result = await itemsService.listItems(userId, filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
```
This keeps zero new dependencies but adds boilerplate to every route.

**Recommendation:** Option A (`express-async-errors`) — it's a tiny package (3KB), widely used, and eliminates all try-catch boilerplate from routes. The CONTEXT.md says "Route handlers have no try-catch", which is only achievable cleanly with this approach.

**Confidence for `express-async-errors` approach:** MEDIUM — decision is within Claude's Discretion per CONTEXT.md. Verify the package is still maintained before committing.

**Error handler middleware (goes at the bottom of `createApp()`, after all route mounts):**
```typescript
// server/src/app.ts (addition)
import { AppError } from './lib/errors';
import type { ErrorRequestHandler } from 'express';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    // ValidationError may carry details
    const body: Record<string, unknown> = { error: err.message };
    if ('details' in err && err.details !== undefined) {
      body.details = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }
  // Unexpected errors — don't leak internals
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

// Add after all app.use('/api/...') lines:
app.use(errorHandler);
```

### Pattern 3: Service Module Structure

A service module exports one function per operation. No class, no singleton — plain async functions that take typed parameters and return typed results (or throw AppError subclasses).

```typescript
// server/src/services/items.service.ts
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';

// Schemas move here from the route file
const createItemSchema = z.object({ /* ... */ });
export type CreateItemInput = z.infer<typeof createItemSchema>;

export async function listItems(
  userId: string,
  filters: ListItemsFilters,
): Promise<Item[]> {
  // ... Prisma query (no Express types anywhere)
  return prisma.item.findMany({ where: { userId, ...buildWhere(filters) } });
}

export async function getItem(userId: string, id: string): Promise<Item> {
  const item = await prisma.item.findFirst({ where: { id, userId }, include: { ... } });
  if (!item) throw new NotFoundError('Item not found');
  return item;
}

export async function createItem(userId: string, body: unknown): Promise<Item> {
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.flatten());
  return prisma.item.create({ data: { ...parsed.data, userId } });
}
```

### Pattern 4: Thin Route Handler (after extraction)

```typescript
// server/src/routes/items.routes.ts (after extraction)
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as itemsService from '../services/items.service';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const items = await itemsService.listItems(userId, req.query);
  res.json(items);
});

router.get('/:id', async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const item = await itemsService.getItem(userId, req.params.id as string);
  res.json(item);
});

router.post('/', async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const item = await itemsService.createItem(userId, req.body);
  res.status(201).json(item);
});
// etc.
```

### Anti-Patterns to Avoid

- **Importing Express types in services:** `Request`, `Response`, `NextFunction` must never appear in `services/`. This breaks SVC-02 (independent testability).
- **Returning error objects from services:** `return { error: 'Not found' }` requires the route to inspect the result. Throw instead — the error handler catches it.
- **Keeping Zod schemas in route files:** If schemas stay in routes, services can't validate input. Schemas must move with the logic they validate.
- **Using `any` in service function signatures:** ESLint enforces `no-any`. Use `unknown` for unvalidated input bodies, then narrow with Zod.
- **Partial extraction (some logic in service, some in route):** Creates two places to look for business logic. Move everything; leave only `userId` extraction and HTTP response in the route.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async error forwarding to Express error handler | Custom wrapper functions | `express-async-errors` package (or `next(err)` pattern) | Monkey-patching Express is tricky to get right |
| TypeScript Error subclass `instanceof` | Custom type guards | `Object.setPrototypeOf` in constructor | Standard fix, well-documented |
| Zod flatten format in ValidationError details | Custom error formatter | `parsed.error.flatten()` | Already used consistently in existing routes |

---

## Common Pitfalls

### Pitfall 1: TypeScript `instanceof` fails for custom Error subclasses

**What goes wrong:** `err instanceof NotFoundError` returns `false` in the error handler, so every error falls through to the 500 branch.
**Why it happens:** TypeScript compiles class extends to ES5 prototype chain manipulation; built-in classes like `Error` don't correctly propagate the prototype when transpiled.
**How to avoid:** Add `Object.setPrototypeOf(this, new.target.prototype)` in the `AppError` base class constructor (shown in Pattern 1 above).
**Warning signs:** Tests expecting 404 get 500 instead.

### Pitfall 2: Express 4 async errors are silently swallowed

**What goes wrong:** A thrown error from a service in an async route handler is never caught by the error middleware — the request hangs or Express logs a warning.
**Why it happens:** Express 4 does not natively catch promise rejections from async route handlers. Only synchronous throws and explicit `next(err)` calls reach the error handler.
**How to avoid:** Use `express-async-errors` (import once in `app.ts`) or wrap each handler in try/catch calling `next(err)`.
**Warning signs:** Supertest tests hang on timeout instead of receiving an error response.

### Pitfall 3: Zod `ValidationError` details lose structure

**What goes wrong:** The 400 response body has `{ error: 'Validation failed' }` but no `details` field, breaking existing test assertions like `expect(res.body.error).toBe('Validation failed')` — or tests that check for `details`.
**Why it happens:** The `ValidationError` constructor accepts `details` but the error handler must explicitly serialize it.
**How to avoid:** The error handler checks for `details` property on the error and includes it in the response. Existing tests check `res.body.error === 'Validation failed'` — preserve that key. If existing tests also check `res.body.details`, carry `details` through (see error handler pattern above).
**Warning signs:** Tests that check `res.body.details` start failing after extraction.

### Pitfall 4: Test Prisma mock is missing new method calls

**What goes wrong:** A service function calls a Prisma method not in the mock setup (e.g. `prisma.refreshToken.findFirst`), causing tests to error with "not a function".
**Why it happens:** The mock in `items.test.ts` manually declares every Prisma model method. Services may call different combinations than the original route.
**How to avoid:** When extracting a route, audit all Prisma calls in the service and verify they exist in the test's `vi.mock('../src/lib/prisma', ...)` object.
**Warning signs:** `TypeError: prisma.X is not a function` in test output.

### Pitfall 5: `admin.routes.ts` uses `any` — ESLint will block the service

**What goes wrong:** `admin.routes.ts` currently uses `any` (e.g. `item: any`) which ESLint already flags. When moving this logic to a service, TypeScript strict mode + `no-any` ESLint rule will prevent compilation.
**Why it happens:** The admin route was written before ESLint `no-any` was enforced, or was excepted. The service layer enforces it fully.
**How to avoid:** Type the paint sync payload explicitly in `admin.service.ts`. A minimal type like `{ name: string; brandSlug: string; type: string; code?: string }` is sufficient.
**Warning signs:** ESLint errors during `npm run lint` or TypeScript errors during `npm run build`.

### Pitfall 6: `reference.routes.ts` has no auth — service still needs to work without userId

**What goes wrong:** Reference routes don't call `authMiddleware` and don't have `req.userId`. If the reference service is templated the same as others (taking `userId`), it will receive `undefined`.
**Why it happens:** Reference data is shared across all users — no user scoping needed.
**How to avoid:** `reference.service.ts` functions take no `userId` parameter. They're the simplest services in the codebase.

---

## Code Examples

### Verified pattern — existing test mock structure to preserve

The existing tests mock Prisma at `'../src/lib/prisma'` and JWT at `'../src/utils/jwt'`. Services import from the same paths. The mock continues to intercept correctly after extraction — no changes to `vi.mock()` paths needed.

```typescript
// From server/tests/items.test.ts (existing — stays valid after extraction)
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
    // ...
  },
}));
```

When a service calls `prisma.item.findMany(...)`, it resolves through the same mock because `vi.mock` intercepts at the module path level, not the import location.

### Verified pattern — existing response shapes to preserve

The existing routes return these shapes. Services must return data that routes can forward unchanged:

| Route | Current response | Test assertion to preserve |
|-------|-----------------|---------------------------|
| GET /api/items | `Item[]` | `res.body[0].name` |
| GET /api/items/:id | `Item` with includes | `res.body.id` |
| POST /api/items | `Item` | `res.status === 201`, `res.body.name` |
| PUT /api/items/:id | `Item` | `res.body.name` |
| DELETE /api/items/:id | `204` no body | `res.status === 204` |
| PATCH /api/items/:id/status | `Item` with new status | `res.body.status === 'BOUGHT'` |
| 404 not found | `{ error: 'X not found' }` | `res.body.error === 'Item not found'` |
| 400 validation | `{ error: 'Validation failed', details: ... }` | `res.body.error === 'Validation failed'` |

**Critical:** The 404/400 error shapes are tested by string assertion. The error handler must produce exactly `{ error: err.message }` — not `{ message: ... }` or `{ statusCode: ..., error: ... }`.

---

## Route-by-Route Complexity Assessment

Understanding relative complexity guides plan sequencing:

| Route file | Complexity | Notes |
|------------|-----------|-------|
| `items.routes.ts` | HIGH | 7 handlers, filtering, sorting, status history, transaction — ideal pattern-setter |
| `color-schemes.routes.ts` | HIGH | Step validation logic, `validateStepOrder()` helper, transaction on PUT |
| `projects.routes.ts` | MEDIUM | `computeCompletion()` pure function, standard CRUD |
| `auth.routes.ts` | MEDIUM | bcrypt, JWT generation, refresh token rotation, try-catch on verifyRefreshToken |
| `user-paints.routes.ts` | LOW | 3 handlers, simple CRUD |
| `account.routes.ts` | LOW | 1 handler, single Prisma call |
| `reference.routes.ts` | LOW | No auth, no userId, read-only queries |
| `media.routes.ts` | MEDIUM | Dynamic S3 import, `isS3Configured()` check — keep as service private helper |
| `export.routes.ts` | MEDIUM | CSV formatting logic, two endpoints |
| `admin.routes.ts` | MEDIUM | `any` types to fix, loop over paint array, two endpoints |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Logic in route handlers | Logic in service modules | This is exactly the refactoring this phase performs |
| No error hierarchy | Typed `AppError` subclasses | Eliminates scattered `res.status(X).json({ error })` calls |
| Try-catch in each route | Global error handler middleware | Single place to map errors to HTTP; routes stay clean |

**Note on Express 5:** Express 5 (released 2024) natively handles async errors — no `express-async-errors` needed. However, this project uses `express@^4.21.2`. The `^` range will NOT upgrade to Express 5 automatically. Staying on Express 4 throughout this phase is safe and correct.

---

## Open Questions

1. **`express-async-errors` vs manual `next(err)`**
   - What we know: CONTEXT.md says "Route handlers have no try-catch"
   - What's unclear: Whether adding one small package is acceptable given the "no new dependencies" project decision recorded in STATE.md
   - Recommendation: Planner should choose between (a) using `express-async-errors` (cleanest, but one new dep) or (b) manual `next(err)` wrapping (zero deps, slight boilerplate). If the no-new-dependencies constraint is hard, go with option B.

2. **Auth route's internal try-catch**
   - What we know: `auth.routes.ts` has a try-catch around `verifyRefreshToken` that maps to a 401. This is distinct from business logic — it's error signaling for a JWT verification failure.
   - What's unclear: Should this become a `throw new UnauthorizedError(...)` inside the service, requiring a new `UnauthorizedError` class?
   - Recommendation: Add `UnauthorizedError` (401) to `errors.ts` — auth is a first-class case.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0.5 |
| Config file | `server/vitest.config.ts` |
| Quick run command | `cd server && npx vitest run` |
| Full suite command | `cd server && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SVC-01 | All route handlers delegate to services — no business logic in routes | integration (HTTP via Supertest) | `cd server && npx vitest run` | All 9 test files exist |
| SVC-02 | Service modules importable without Express | unit (direct function call) | `cd server && npx vitest run tests/services/` | Wave 0 gap — new test files needed |
| SVC-03 | Existing API contracts unchanged | integration (HTTP via Supertest) | `cd server && npx vitest run` | All 9 test files exist — run unchanged |

### Sampling Rate

- **Per task commit:** `cd server && npx vitest run`
- **Per wave merge:** `cd server && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `server/tests/services/items.service.test.ts` — covers SVC-02 for items service (direct function call, no HTTP)
- [ ] Additional `tests/services/*.service.test.ts` files may be added per plan, but only `items` is needed before Plan 1 execution

*(All existing `tests/*.test.ts` integration tests cover SVC-01 and SVC-03 without modification.)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: all 10 route files in `server/src/routes/`, `server/src/app.ts`, `server/src/lib/prisma.ts`, `server/src/middleware/auth.middleware.ts`
- Existing test files: `server/tests/*.test.ts` — confirmed Supertest + mocked Prisma pattern
- `server/vitest.config.ts` — confirmed test runner configuration
- `server/package.json` — confirmed all dependency versions
- `.planning/phases/01-service-layer/01-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- TypeScript handbook on extending built-in classes — `Object.setPrototypeOf` pattern for Error subclasses
- Express 4 async error handling — `express-async-errors` widely documented approach

### Tertiary (LOW confidence — verify before using)
- `express-async-errors` package maintenance status — check npm before adding

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, versions confirmed from package.json
- Architecture patterns: HIGH — derived directly from existing codebase patterns and locked CONTEXT.md decisions
- Pitfalls: HIGH — identified from direct code inspection (admin `any` types, reference no-auth, Error subclass issue)
- Async error handling approach: MEDIUM — within Claude's Discretion; two valid options documented

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable stack — no fast-moving libraries involved)
