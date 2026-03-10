# Technology Stack

**Analysis Date:** 2026-03-10

## Languages

**Primary:**
- TypeScript 5.7+ - Used across client, server, and build tooling for type-safe code
- HTML5 - Angular templates and component markup
- SCSS - Styling for Angular components

**Secondary:**
- JavaScript (ES2022) - Runtime and config files
- SQL - PostgreSQL migrations and Prisma schemas

## Runtime

**Environment:**
- Node.js 18.19+ (required by project)
- Browser (ES2022 target)

**Package Manager:**
- npm (via package.json)
- Lockfile: `package-lock.json` (standard npm format)

## Frameworks

**Frontend:**
- Angular 19.2.19 - Main UI framework
- Angular Material 19.2.19 - Component library for Material Design
- Angular CDK 19.2.19 - Component Dev Kit utilities
- Angular Service Worker 19.2.19 - PWA support
- RxJS 7.8.0 - Reactive programming library

**Backend:**
- Express 4.21.2 - HTTP server framework
- Prisma 6.4.1 - ORM and database client

**Testing:**
- Vitest 3.0.5 - Server-side test runner (configured in server/vitest.config.ts, runs via `npm run test`)
- Karma 6.4.0 - Client-side test runner (Angular/Jasmine)
- Jasmine 5.6.0 - Assertion library for Karma tests
- Supertest 7.2.2 - HTTP assertion library for Express API testing

**Build/Dev:**
- @angular-devkit 19.2.22 - Angular build tools
- @angular/cli 19.2.22 - Angular development server and build CLI
- TypeScript compiler (tsc) - Direct compilation for server builds
- tsx 4.19.2 - TypeScript execution for development (`npm run dev` in server)

## Key Dependencies

**Critical:**
- @prisma/client 6.4.1 - Type-safe database operations; why it matters: generates TypeScript types directly from schema, prevents SQL injection
- express 4.21.2 - HTTP server routing and middleware
- bcryptjs 2.4.3 - Password hashing for user authentication
- jsonwebtoken 9.0.2 - JWT generation and verification for stateless auth
- zod 3.24.2 - Schema validation and runtime type checking

**Security:**
- helmet 8.0.0 - Express security headers (CORS, X-Frame-Options, CSP, etc.)
- express-rate-limit 7.5.0 - Rate limiting middleware (15 min window, max 100 requests per IP)
- cors 2.8.5 - CORS middleware (configured with CORS_ORIGIN env var)
- bcryptjs 2.4.3 - Prevents plain-text password storage

**AWS/S3 Integration:**
- @aws-sdk/client-s3 3.992.0 - AWS S3 client for object storage
- @aws-sdk/s3-request-presigner 3.992.0 - Presigned URL generation for secure direct uploads

**Documentation:**
- swagger-jsdoc 6.2.8 - JSDoc to OpenAPI converter
- swagger-ui-express 5.0.1 - Swagger UI server endpoint

**Utilities:**
- dotenv 16.4.7 - Environment variable loading (.env file support)
- tslib 2.3.0 - TypeScript helpers
- zone.js 0.15.0 - Angular change detection and async handling

## Configuration

**Environment:**
- .env file in project root (see `.env.example`)
- Loaded via dotenv in `server/src/index.ts` before app creation
- Database: `DATABASE_URL` (PostgreSQL connection string)
- Auth: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (optional for MinIO)
- Server: `PORT`, `NODE_ENV`, `CORS_ORIGIN`
- All values defaulted (see `src/utils/jwt.ts` for JWT defaults, `src/app.ts` for CORS defaults)

**Build:**
- `server/tsconfig.json` - TypeScript config for backend (target: ES2020, module: commonjs)
- `server/tsconfig.build.json` - Build-specific config (excludes tests)
- `client/tsconfig.json` - Angular TypeScript config (target: ES2022, module: ES2022)
- `client/tsconfig.app.json` - Angular app-specific config
- `client/tsconfig.spec.json` - Angular test-specific config
- `client/angular.json` - Angular CLI build configuration (SCSS support, PWA config, Karma tests)

## Platform Requirements

**Development:**
- Node.js ≥ 18.19
- Docker & Docker Compose (for PostgreSQL, pgAdmin, MinIO)
- npm (bundled with Node.js)
- Windows 11 / WSL2 (based on project environment)

**Production:**
- Node.js runtime (same version as development)
- PostgreSQL 16+ database (or compatible)
- S3-compatible storage (AWS S3, MinIO, etc.) for media
- Docker containers for easy deployment (Dockerfile setup not shown but docker-compose.yml suggests containerization)

---

*Stack analysis: 2026-03-10*
