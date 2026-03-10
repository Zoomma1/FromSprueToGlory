# STRUCTURE.md — Directory Layout & Organization

## Root

```
From sprue to glory/
├── client/                  # Angular 19 frontend
├── server/                  # Express + Prisma backend
├── docker-compose.yml       # Infra: Postgres, pgAdmin, MinIO, backend
├── .planning/               # GSD planning docs
└── README.md
```

---

## Server (`server/`)

```
server/
├── src/
│   ├── index.ts             # Entry point: env, DB check, listen
│   ├── app.ts               # Express factory: middleware + route mounting
│   ├── routes/              # One file per resource
│   │   ├── auth.routes.ts
│   │   ├── items.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── color-schemes.routes.ts
│   │   ├── user-paints.routes.ts
│   │   ├── media.routes.ts
│   │   ├── reference.routes.ts
│   │   ├── account.routes.ts
│   │   ├── admin.routes.ts
│   │   └── export.routes.ts
│   ├── middleware/
│   │   └── auth.middleware.ts   # JWT verification
│   ├── lib/
│   │   └── prisma.ts            # Prisma client singleton
│   ├── utils/
│   │   └── jwt.ts               # sign/verify helpers
│   ├── constants/
│   │   └── status-weight.ts     # Item status ordering
│   └── types/
│       └── express.d.ts         # Express Request augmentation (userId)
├── prisma/
│   ├── schema.prisma            # Database schema
│   ├── seed.ts                  # Reference data seed
│   └── migrations/              # Prisma migration history
├── tests/                       # Vitest integration tests
│   ├── auth.test.ts
│   ├── items.test.ts
│   ├── projects.test.ts
│   ├── color-schemes.test.ts
│   ├── user-paints.test.ts
│   ├── account.test.ts
│   ├── admin.test.ts
│   ├── reference.test.ts
│   └── health.test.ts
├── scripts/
│   └── import.ts               # Data import utility
├── prisma.config.ts
├── vitest.config.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Client (`client/`)

```
client/
├── src/
│   ├── main.ts                  # Bootstrap
│   ├── environments/
│   │   └── environment.ts       # API URL config
│   └── app/
│       ├── app.component.ts     # Root shell component
│       ├── app.config.ts        # Providers
│       ├── app.routes.ts        # Route definitions (lazy-loaded)
│       ├── classes/             # TS classes matching API shapes
│       │   ├── color-scheme.ts
│       │   ├── factions.ts
│       │   ├── game-system.ts
│       │   ├── items.ts
│       │   ├── model.ts
│       │   ├── paint-brand.ts
│       │   ├── paint.ts
│       │   ├── project.ts
│       │   ├── technique.ts
│       │   └── user-custom-paint.ts
│       ├── core/                # Shared infrastructure
│       │   ├── guards/
│       │   │   └── auth.guard.ts
│       │   ├── interceptors/
│       │   │   └── jwt.interceptor.ts   # Adds Authorization header
│       │   └── services/
│       │       ├── api.service.ts       # HTTP wrapper
│       │       └── auth.service.ts      # Auth state + token management
│       └── features/            # Feature modules (lazy-loaded)
│           ├── auth/
│           │   ├── login/
│           │   └── signup/
│           ├── dashboard/
│           ├── items/
│           │   ├── item-form/           # Dialog
│           │   └── items-list/
│           ├── color-schemes/
│           │   ├── color-schemes-list/
│           │   └── scheme-detail/       # Create + edit view
│           ├── projects/
│           │   ├── project-detail/
│           │   ├── project-form-dialog/
│           │   └── project-list/
│           └── settings/
├── karma.conf.js
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Route files (server) | `<resource>.routes.ts` | `color-schemes.routes.ts` |
| Test files (server) | `<resource>.test.ts` | `color-schemes.test.ts` |
| Component files | `<name>.component.ts` | `scheme-detail.component.ts` |
| Spec files | `<name>.component.spec.ts` | `scheme-detail.component.spec.ts` |
| Service files | `<name>.service.ts` | `auth.service.ts` |
| Class files | `<name>.ts` | `paint.ts`, `color-scheme.ts` |
| Directories | kebab-case | `color-schemes/`, `item-form/` |

---

## Key File Locations

| Purpose | Path |
|---|---|
| Server entry | `server/src/index.ts` |
| Express app config | `server/src/app.ts` |
| Auth middleware | `server/src/middleware/auth.middleware.ts` |
| Prisma client | `server/src/lib/prisma.ts` |
| DB schema | `server/prisma/schema.prisma` |
| Angular routes | `client/src/app/app.routes.ts` |
| HTTP service | `client/src/app/core/services/api.service.ts` |
| Auth service | `client/src/app/core/services/auth.service.ts` |
| JWT interceptor | `client/src/app/core/interceptors/jwt.interceptor.ts` |
| Environment config | `client/src/environments/environment.ts` |

---

## Adding New Features

**New API route:**
1. Create `server/src/routes/<resource>.routes.ts`
2. Register in `server/src/app.ts` with `app.use('/api/<resource>', ...)`
3. Add test in `server/tests/<resource>.test.ts`

**New Angular feature:**
1. Create `client/src/app/features/<feature>/<component>/<name>.component.ts`
2. Add lazy route in `client/src/app/app.routes.ts`
3. Add spec file alongside component
