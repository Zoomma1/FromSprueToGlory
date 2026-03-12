import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { getS3Client } from '../src/lib/s3';

// Mock @aws-sdk/client-s3 for PutObjectCommand and GetObjectCommand only.
// S3Client is no longer constructed in media.service.ts — it comes from lib/s3.
vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3/mock-presigned-url'),
}));

// Mock lib/s3 — the service calls getS3Client() from here
vi.mock('../src/lib/s3', () => ({
  getS3Client: vi.fn().mockReturnValue({}),
}));

// Ensure S3 env vars are set so tests that need a configured S3 work
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
    // Restore default: S3 is configured
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValue({});
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
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValue({});
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

// ─── presignRead (TST-01) ────────────────────────────────
describe('GET /api/media/presign-read/:key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValue({});
  });

  it('returns 200 with readUrl on happy path', async () => {
    const res = await request(app)
      .get('/api/media/presign-read/users/user-1/photo.jpg')
      .set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.readUrl).toBeDefined();
  });

  it('returns 401 when no auth header is provided', async () => {
    const res = await request(app).get('/api/media/presign-read/users/user-1/photo.jpg');
    expect(res.status).toBe(401);
  });

  it('returns 503 when getS3Client returns null', async () => {
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const res = await request(app)
      .get('/api/media/presign-read/users/user-1/photo.jpg')
      .set(AUTH_HEADER);
    expect(res.status).toBe(503);
  });

  it('returns 400 when the key path is missing', async () => {
    const res = await request(app).get('/api/media/presign-read/').set(AUTH_HEADER);
    expect(res.status).toBe(400);
  });
});

// ─── S3 Singleton (S3S-01/02) ────────────────────────────
describe('S3 Singleton (S3S-01/02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default: S3 is configured
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValue({});
  });

  it('presignUpload calls getS3Client() instead of constructing new S3Client (S3S-01)', async () => {
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'test.jpg', fileType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(getS3Client).toHaveBeenCalled();
  });

  it('presignUpload returns 503 when getS3Client returns null (S3S-01)', async () => {
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);
    const res = await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'test.jpg', fileType: 'image/jpeg' });
    expect(res.status).toBe(503);
  });

  it('presignUpload catch block does not log client or credentials (S3S-02)', async () => {
    const consoleSpy = vi.spyOn(console, 'error');
    (getS3Client as ReturnType<typeof vi.fn>).mockReturnValueOnce({});
    // getSignedUrl is mocked to throw
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    (getSignedUrl as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('S3 error'));
    await request(app)
      .post('/api/media/presign-upload')
      .set(AUTH_HEADER)
      .send({ fileName: 'test.jpg', fileType: 'image/jpeg' });
    // Error should be logged but not contain credential strings
    const loggedArgs = consoleSpy.mock.calls.flat().join(' ');
    expect(loggedArgs).not.toContain('test-key');
    expect(loggedArgs).not.toContain('test-secret');
    consoleSpy.mockRestore();
  });
});
