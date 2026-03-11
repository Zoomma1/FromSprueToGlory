# Technology Stack

**Analysis Date:** 2026-03-10

## Languages

**Primary:**
- TypeScript 5.7.3 - All application code in `src/`, tests in `tests/`, full type safety enabled
- JavaScript (Node.js) - Build output and scripts

**Secondary:**
- SQL - Prisma migrations and raw queries for complex operations

## Runtime

**Environment:**
- Node.js (version not pinned, infer from dev setup — typically 18+)

**Package Manager:**
- npm (inferred from package-lock.json pattern)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Express.js 4.21.2 - HTTP server framework for REST API
  - Entry: `src/index.ts` (process management)
  - App factory: `src/app.ts` (middleware & route mounting)

**Database ORM:**
- Prisma 6.4.1 - Type-safe database client
  - Schema: `prisma/schema.prisma`
  - Client: `@prisma/client` 6.4.1
  - Migrations: `npx prisma migrate dev` (development), `prisma migrate deploy` (production)

**Testing:**
- Vitest 3.0.5 - Unit & integration test runner
  - Config: `vitest.config.ts` (Node.js environment, globals enabled)
  - Run: `npm test` (single run), `npm test:watch` (watch mode)
  - Test files: `tests/**/*.test.ts`

**Build/Dev:**
- TypeScript 5.7.3 - Compilation to CommonJS
  - Config: `tsconfig.json` (ES2020 target, strict mode enabled)
  - Build: `npm run build` → outputs to `dist/`
  - Watch dev: `npm run dev` (tsx watch)

## Key Dependencies

**Critical:**
- `@aws-sdk/client-s3` 3.992.0 - AWS S3 client for file uploads
- `@aws-sdk/s3-request-presigner` 3.992.0 - Pre-signed URL generation (required for media routes)
- `jsonwebtoken` 9.0.2 - JWT token generation & verification (auth backbone)
- `bcryptjs` 2.4.3 - Password hashing (login security)
- `zod` 3.24.2 - Schema validation for all API inputs

**Security & Infrastructure:**
- `helmet` 8.0.0 - HTTP security headers (sets CSP, X-Frame-Options, etc.)
- `cors` 2.8.5 - Cross-Origin Resource Sharing configuration
  - Configured: `src/app.ts` with dynamic CORS_ORIGIN env var
- `express-rate-limit` 7.5.0 - Rate limiting middleware
  - Limit: 100 requests per 15 minutes (global)

**Development Tools:**
- `tsx` 4.19.2 - TypeScript executor for scripts (seed data, imports)
- `eslint` 9.20.0 + `typescript-eslint` 8.24.0 - Linting with TypeScript support
  - Config: `eslint.config.mjs`
  - Rules: no-unused-vars (warn with `_` prefix ignored), no-explicit-any (warn)
- `prettier` 3.5.1 - Code formatter (no explicit config file — uses defaults)
- `supertest` 7.2.2 - HTTP assertions for testing

## Configuration

**Environment:**
- Managed via `dotenv` 16.4.7 — loads `.env` at startup (`src/index.ts`)
- See **INTEGRATIONS.md** for required env vars by service

**Build:**
- TypeScript compilation: `tsconfig.build.json` (production build config)
- Output directory: `dist/` (from `outDir` in tsconfig)
- No bundler (outputs CommonJS modules directly)

## Platform Requirements

**Development:**
- Node.js 18+ (inferred from ES2020 target and modern package versions)
- PostgreSQL 16 (via Docker: `postgres:16-alpine`)
- Optional: MinIO for local S3-compatible storage (`minio/minio:latest` in docker-compose)
- pgAdmin for database management (optional, in docker-compose)

**Production:**
- Node.js 18+ runtime
- PostgreSQL 16+ database (managed externally or containerized)
- AWS S3 or S3-compatible service (MinIO) for file storage
- HTTPS reverse proxy recommended (Helmet configured but not enforced)

---

*Stack analysis: 2026-03-10*
