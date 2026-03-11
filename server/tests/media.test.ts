import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// Mock S3 libraries so presignUpload doesn't hit real S3 but the real schema still runs
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3/mock-presigned-url'),
}));

// Ensure S3 env vars are set so isS3Configured() returns true
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.S3_BUCKET = 'test-bucket';

// Standard auth mock (same pattern as other test files)
vi.mock('../src/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('tok'),
  generateRefreshToken: vi.fn().mockReturnValue('rtok'),
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' }),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    item: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

const app = createApp();
const AUTH_HEADER = { Authorization: 'Bearer valid-token' };

describe('POST /api/media/presign-upload — Zod validation (ZOD-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 with details when body is missing', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 with details when fileName is empty string', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: '', fileType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 when fileType is not in accepted enum', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'shot.jpg', fileType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 when extra field is present (.strict())', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'shot.jpg', fileType: 'image/jpeg', extra: 'x' });
    expect(res.status).toBe(400);
  });

  it('proceeds to service when body is valid', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'shot.jpg', fileType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toBeDefined();
  });
});

describe('GET /api/export/items — Zod validation (ZOD-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 with details when format is invalid', async () => {
    const res = await request(app)
      .get('/api/export/items?format=xml')
      .set(AUTH_HEADER);
    expect(res.status).toBe(400);
    expect(res.body.details).toBeDefined();
  });

  it('returns 400 when unknown query param is present (.strict())', async () => {
    const res = await request(app)
      .get('/api/export/items?format=json&extra=x')
      .set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });

  it('returns 200 when format=csv (valid)', async () => {
    const res = await request(app)
      .get('/api/export/items?format=csv')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  it('returns 200 with default json when no format param', async () => {
    const res = await request(app)
      .get('/api/export/items')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });
});

// ─── S3 Singleton (S3S-01/02) ────────────────────────────
// Wave 0: Using it.todo() so stubs compile and are visible without blocking the suite.
// Full S3S tests require lib/s3.ts to exist (Plan 04) and mocking lib/s3 instead of
// @aws-sdk/client-s3 directly.
describe('S3 Singleton (S3S-01/02)', () => {
  it.todo('presignUpload uses getS3Client() singleton not per-request new S3Client() (S3S-01)');
  it.todo('presignRead uses getS3Client() singleton not per-request new S3Client() (S3S-01)');
  it.todo('presignUpload does not log AWS credentials on error (S3S-02)');
});
