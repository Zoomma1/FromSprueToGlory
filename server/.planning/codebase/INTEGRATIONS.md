# External Integrations

**Analysis Date:** 2026-03-10

## APIs & External Services

**File Storage (S3-compatible):**
- AWS S3 (or MinIO for local development)
  - SDK/Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Pre-signed URL endpoints: `POST /api/media/presign-upload`, `GET /api/media/presign-read/*`
  - Implementation: `src/routes/media.routes.ts`
  - Detection: Checks for `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`
  - Graceful fallback: Returns 503 if S3 not configured

## Data Storage

**Databases:**
- PostgreSQL 16 (primary)
  - Connection: `DATABASE_URL` env var (Prisma datasource)
  - Client: Prisma 6.4.1 (ORM)
  - Schema: `prisma/schema.prisma` (13 models: User, Project, Item, ColorScheme, Paint, Technique, etc.)
  - Health check: Startup validates DB connection in `src/index.ts`

**File Storage:**
- S3/MinIO (optional, configurable per environment)
  - Upload pattern: Pre-signed URLs (frontend uploads directly to S3)
  - Storage structure: `users/{userId}/{timestamp}-{fileName}`
  - Item photos: Stored as S3 keys in `Item.photoKey` field
  - Scheme reference photos: Stored as S3 keys in `ColorScheme.referencePhotoKey` field
  - URL expiry: Upload URLs 5 minutes, read URLs 1 hour

**Caching:**
- None detected (no Redis, Memcached, or caching layer)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based (no third-party OAuth)
  - Implementation: `src/utils/jwt.ts`
  - Token types:
    - Access token: 15 minutes (default, configurable via `JWT_EXPIRES_IN`)
    - Refresh token: 7 days (default, configurable via `JWT_REFRESH_EXPIRES_IN`)
  - Secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET` env vars
  - Verification: `src/middleware/auth.middleware.ts` (Bearer token extraction & validation)

**Password Security:**
- bcryptjs 2.4.3 for hashing/comparing passwords
  - Routes: `src/routes/auth.routes.ts` (signup, login)

**Protected Routes:**
- All endpoints in `/api/media`, `/api/items`, `/api/color-schemes`, `/api/account`, `/api/user-paints`, `/api/projects` require valid JWT
- Unprotected: `/api/auth` (signup/login), `/api/reference` (read-only reference data), `/api/admin` (TODO: implement proper access control)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)
- Errors logged to console via `console.error()` in exception handlers

**Logs:**
- Console-based (stdout)
  - Startup logs: Success indicators and health check URLs
  - S3 errors: Logged with context in `src/routes/media.routes.ts`
  - Auth failures: Logged implicitly via middleware
  - Database health: Checked at startup with error reporting

**Structured Logging:**
- Not implemented (plain text console output)

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase (infer from deployment context)
- Expected: Docker or Node.js-compatible PaaS (Railway, Heroku, etc.)

**CI Pipeline:**
- Not detected in codebase (no GitHub Actions, GitLab CI, etc.)
- Build commands available: `npm run build`, `npm run migrate:prod`, `npm start`

**Docker:**
- Multi-service docker-compose available for local development
  - Services: PostgreSQL (5432), pgAdmin (5050), MinIO (9000/9001)
  - Profile: MinIO optional (enable with `--profile with-minio`)
  - No Dockerfile detected (app runs on host Node.js in dev)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (Prisma datasource)
- `JWT_SECRET` - Signing key for access tokens (fallback: `dev-secret-change-me`)
- `JWT_REFRESH_SECRET` - Signing key for refresh tokens (fallback: `dev-refresh-secret-change-me`)

**Optional env vars:**
- `PORT` - Server listening port (default: 3000)
- `NODE_ENV` - Environment name (dev/prod, logged at startup)
- `CORS_ORIGIN` - Allowed origin for CORS (default: `http://localhost:4200`)
- `JWT_EXPIRES_IN` - Access token expiry (default: `15m`)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiry (default: `7d`)

**S3 Configuration (optional):**
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret key
- `S3_BUCKET` - Bucket name
- `S3_REGION` - AWS region (default: `us-east-1`)
- `S3_ENDPOINT` - Custom endpoint (required for MinIO: `http://minio:9000`)

**Secrets location:**
- Local dev: `.env` file (loaded by `dotenv`)
- Production: Environment variables (deploy-time configuration)
- Never committed: `.env` is in `.gitignore`

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook endpoints for external services)

**Outgoing:**
- None detected (no calls to external webhooks or notification services)

**Export Functionality:**
- Route exists: `/api/export` (mounted in `src/app.ts`)
- Purpose: Likely CSV/JSON export of user data (implementation in `src/routes/export.routes.ts`)
- Details: Not inspected

---

*Integration audit: 2026-03-10*
