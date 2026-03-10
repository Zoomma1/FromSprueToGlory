# ARCHITECTURE.md — System Architecture

## Pattern

**Monorepo** with two independent apps in `client/` and `server/`, orchestrated via Docker Compose.

- **Backend**: REST API (Express + TypeScript), no service layer — logic lives in route handlers
- **Frontend**: Angular 19 SPA with signal-based state, lazy-loaded routes

---

## Backend Architecture

### Layers

```
index.ts          → process entry point (env, port, DB check, listen)
app.ts            → Express factory (createApp) — middleware + route mounting
routes/*.ts       → Route handlers (business logic lives here, no separate service layer)
middleware/       → Auth middleware (JWT verification)
lib/prisma.ts     → Prisma client singleton
utils/jwt.ts      → JWT sign/verify helpers
constants/        → Shared constants (status-weight.ts)
```

### Entry Points

- `server/src/index.ts` — starts server, validates DB connection
- `server/src/app.ts` — `createApp()` factory (testable; used by tests and index.ts)

### Middleware Stack (applied globally)

1. `helmet()` — security headers
2. `cors()` — CORS to `localhost:4200` (or `CORS_ORIGIN` env)
3. `rateLimit()` — 100 req / 15 min per IP
4. `express.json({ limit: '10mb' })` — body parsing

### Route Modules

| Route prefix | File | Notes |
|---|---|---|
| `/api/auth` | `auth.routes.ts` | Login, signup, refresh, logout |
| `/api/items` | `items.routes.ts` | Figurine items (CRUD) |
| `/api/projects` | `projects.routes.ts` | Projects (CRUD) |
| `/api/color-schemes` | `color-schemes.routes.ts` | Color scheme CRUD + steps |
| `/api/user-paints` | `user-paints.routes.ts` | User custom paints |
| `/api/media` | `media.routes.ts` | S3/MinIO pre-signed URLs |
| `/api/reference` | `reference.routes.ts` | Read-only reference data |
| `/api/account` | `account.routes.ts` | Profile management |
| `/api/admin` | `admin.routes.ts` | Admin operations |
| `/api/export` | `export.routes.ts` | Data export |
| `/api/health` | `app.ts` (inline) | DB health check |

### Auth Flow

1. POST `/api/auth/login` → returns access token + sets refresh token cookie
2. JWT middleware (`middleware/auth.middleware.ts`) validates `Authorization: Bearer` header
3. POST `/api/auth/refresh` → issues new access token via refresh token rotation
4. Access tokens are short-lived; refresh tokens are rotated on each use

---

## Frontend Architecture

### Pattern

Angular 19 **standalone components** with **signal-based reactive state**.

### Layers

```
main.ts               → Bootstrap
app.config.ts         → Providers (HTTP, router, Material)
app.routes.ts         → Lazy-loaded route definitions
core/
  guards/             → authGuard (route protection)
  interceptors/       → JwtInterceptor (attaches Bearer token)
  services/           → ApiService (HTTP), AuthService (auth state + tokens)
classes/              → Plain TS classes matching API response shapes
features/             → Feature components (lazy-loaded)
```

### Routing

- All routes lazy-loaded via `loadComponent()`
- Protected by `authGuard`
- Root redirects to `/dashboard`

### Routes

| Path | Component |
|---|---|
| `/dashboard` | DashboardComponent |
| `/items` | ItemsListComponent |
| `/color-schemes` | ColorSchemesListComponent |
| `/color-schemes/new` | SchemeDetailComponent |
| `/color-schemes/:mode/:id` | SchemeDetailComponent |
| `/projects` | ProjectsListComponent |
| `/projects/:id` | ProjectDetailComponent |
| `/settings` | SettingsComponent |
| `/auth/login` | LoginComponent |
| `/auth/signup` | SignupComponent |

### State Management

- Angular signals (`signal()`, `computed()`) — no NgRx
- Key pattern: `paints` + `customPaints` → `allPaints` computed merged signal
- Auth state managed in `AuthService` with signals

### Data Flow (typical API request)

```
Component
  → calls ApiService method
  → JwtInterceptor adds Authorization header
  → HTTP request to Express API
  → auth.middleware validates JWT
  → route handler queries Prisma
  → Prisma → PostgreSQL
  → response flows back up
```

---

## Data Layer

- **ORM**: Prisma with PostgreSQL 16
- **Migrations**: `npx prisma migrate dev`
- **Schema**: `server/prisma/schema.prisma`
- **Seed**: `server/prisma/seed.ts`

### Key Models

- `User` — auth, profile
- `Item` — figurine (has status, project, images)
- `Project` — groups items
- `ColorScheme` + `ColorSchemeStep` — paint guides
- `Paint` + `PaintBrand` — reference paint catalog
- `UserCustomPaint` — user-private custom paints
- Reference tables: `GameSystem`, `Faction`, `Technique`

---

## Infrastructure

- Docker Compose: `dev-db` (Postgres) + `dev-back` (Express) + `pgAdmin` + `MinIO`
- MinIO as local S3 for media storage (pre-signed URLs)
- Frontend runs via `ng serve` (not containerized in dev)
