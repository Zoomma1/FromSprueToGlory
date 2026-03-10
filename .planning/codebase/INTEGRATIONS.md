# External Integrations

**Analysis Date:** 2026-03-10

## APIs & External Services

**AWS S3 Integration:**
- AWS S3 - File storage for miniature photos and color scheme reference images
  - SDK/Client: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (env vars)
  - Implementation: Presigned URLs (client directly uploads to S3, backend generates secure time-limited URLs)
  - Endpoints: `POST /api/media/presign-upload` (generates upload URL), `GET /api/media/presign-read/:key` (generates read URL)
  - Status: Optional in development (endpoints return 503 if not configured); required in production

**MinIO (Local S3 Alternative):**
- MinIO S3-compatible storage
  - Configured via Docker Compose service `minio` (profile: `with-minio`)
  - Endpoint: `http://localhost:9000` (API), `http://localhost:9001` (console)
  - Credentials: `minioadmin` / `minioadmin` (default)
  - Uses same AWS SDK configuration with `S3_ENDPOINT` env var pointing to MinIO
  - `forcePathStyle: true` required for MinIO compatibility (see `server/src/routes/media.routes.ts` line 67)

## Data Storage

**Databases:**
- PostgreSQL 16 (production) / PostgreSQL 16-alpine (Docker development)
  - Connection: `DATABASE_URL=postgresql://sprue:sprue_secret@localhost:5432/sprue_to_glory?schema=public`
  - Client: Prisma @prisma/client 6.4.1
  - Container: `sprue_postgres` (docker-compose.yml service `postgres`)
  - Data volume: `pgdata` persistent volume

**File Storage:**
- S3 or MinIO for item photos and color scheme reference images
  - Stored as object keys (e.g., `users/{userId}/{timestamp}-{fileName}`)
  - Local filesystem not used; all media must go through presigned URLs

**Caching:**
- None configured (no Redis, in-memory cache detected)

## Authentication & Identity

**Auth Provider:**
- Custom JWT (no external provider like Auth0, Firebase, Okta)
  - Implementation: JWT + Refresh Token Rotation pattern
  - Access tokens: 15 minutes default (`JWT_EXPIRES_IN=15m`)
  - Refresh tokens: 7 days default (`JWT_REFRESH_EXPIRES_IN=7d`)
  - Storage (server): Refresh tokens stored in `refresh_tokens` table (Prisma model at `server/prisma/schema.prisma` line 67)
  - Signing: HS256 algorithm (symmetrical, secrets in env vars)
  - Endpoints:
    - `POST /api/auth/signup` - Create user account (bcrypt password hashing)
    - `POST /api/auth/login` - Login, returns access + refresh tokens
    - `POST /api/auth/refresh` - Exchange refresh token for new access token
    - `POST /api/auth/logout` - Clear refresh token (invalidates session)
  - Protection: All protected routes use `authMiddleware` (see `server/src/middleware/auth.middleware.ts`) which verifies Bearer token in Authorization header

**Password Security:**
- bcryptjs 2.4.3 for password hashing (see usage in auth routes)
- Salting handled by bcryptjs automatically

## Monitoring & Observability

**Error Tracking:**
- None configured (no Sentry, DataDog, etc.)
- Console.error used in development (see `server/src/routes/media.routes.ts` lines 86, 132)

**Logs:**
- Console logging (stdout)
- Health check endpoint: `GET /api/health` returns database status and timestamp (server/src/app.ts lines 56-78)
- Database connectivity verified on server start (server/src/index.ts lines 23-40)

**Debugging:**
- TypeScript source maps in development (tsconfig options)
- Express request/response logging via middleware (none custom detected; relies on Express defaults)

## CI/CD & Deployment

**Hosting:**
- Not detected; assumes self-hosted or cloud provider agnostic (Dockerfile not provided in repo)
- Docker Compose suggests containerized deployment path

**CI Pipeline:**
- GitHub Actions workflows likely (`.github/workflows/` directory exists but files not examined)
- Local test commands available:
  - Server: `npm run test` (Vitest), `npm run lint` (ESLint)
  - Client: `npm run test` (Karma), `npm run lint` (angular-eslint)

**Build Pipeline:**
- Server: `npm run build` → tsc compilation to `dist/`, run via `npm start` (node dist/index.js)
- Client: `npm run build` → Angular build to `dist/client/`, PWA manifest included (ngsw-config.json)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Asymmetric secret for access token signing
- `JWT_REFRESH_SECRET` - Asymmetric secret for refresh token signing
- `CORS_ORIGIN` - Allowed frontend origin (default: `http://localhost:4200`)
- `PORT` - Server port (default: `3000`)

**Optional env vars (S3 media):**
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET` - S3 bucket name
- `S3_REGION` - AWS region (default: `us-east-1`)
- `S3_ENDPOINT` - For MinIO; leave empty for AWS

**Development convenience vars:**
- `NODE_ENV` - Set to `development` (default; no hardening)
- `JWT_EXPIRES_IN` - Token TTL (default: `15m`, overridable per env)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token TTL (default: `7d`, overridable per env)

**Secrets location:**
- `.env` file in project root (loaded by `dotenv` in server/src/index.ts)
- NOT committed (listed in .gitignore)
- `.env.example` provided as template

## Webhooks & Callbacks

**Incoming:**
- None detected (no Stripe, PayPal, GitHub webhooks)

**Outgoing:**
- None detected (no external API calls beyond S3)

## Database Schema Integration Points

**Key tables for external systems:**
- `users` - User accounts; refresh tokens stored in `refresh_tokens` table
- `items` - Pile of Shame entries; `photoKey` field stores S3 object key (not public URL)
- `color_schemes` - Painting recipes; `referencePhotoKey` stores S3 object key
- `user_custom_paints` - Private paint catalog per user (added in recent milestone for user-defined paints)

**Enum types:**
- `ItemStatus` - WANT, BOUGHT, ASSEMBLED, WIP, FINISHED (workflow states)
- `PaintType` - BASE, LAYER, SHADE, DRY, CONTRAST, TECHNICAL, AIR, METALLIC, INK, PRIMER, VARNISH, TEXTURE, OTHER

---

*Integration audit: 2026-03-10*
