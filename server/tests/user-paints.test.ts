//
// User Custom Paints Route Tests (TDD — written before implementation)
//
// Covers:
//   GET  /api/user-paints     → list own custom paints (auth required)
//   POST /api/user-paints     → create a custom paint  (auth required)
//   DELETE /api/user-paints/:id → delete own custom paint (auth required)
//

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ──────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    userCustomPaint: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    colorSchemeStep: { deleteMany: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    paintBrand: { findUnique: vi.fn() },
    paint: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../src/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('tok'),
  generateRefreshToken: vi.fn().mockReturnValue('rtok'),
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' }),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────
const AUTH_HEADER = { Authorization: 'Bearer tok' };

const mockCustomPaint = {
  id: 'cp-1',
  userId: 'user-1',
  name: 'My Custom Red',
  type: 'BASE',
  notes: 'Slightly orange-tinted red',
  createdAt: new Date().toISOString(),
};

// ─── Tests ────────────────────────────────────────────────
describe('GET /api/user-paints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    const app = createApp();
    const res = await request(app).get('/api/user-paints');
    expect(res.status).toBe(401);
  });

  it('should return the list of custom paints for the authenticated user', async () => {
    vi.mocked(prisma.userCustomPaint.findMany).mockResolvedValue([mockCustomPaint] as never);
    const app = createApp();

    const res = await request(app)
      .get('/api/user-paints')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('My Custom Red');
    expect(prisma.userCustomPaint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });

  it('should return an empty array when user has no custom paints', async () => {
    vi.mocked(prisma.userCustomPaint.findMany).mockResolvedValue([] as never);
    const app = createApp();

    const res = await request(app)
      .get('/api/user-paints')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/user-paints', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/user-paints')
      .send({ name: 'My Paint' });
    expect(res.status).toBe(401);
  });

  it('should return 400 when name is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ type: 'BASE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 when name is empty', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when type is not a valid PaintType', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: 'My Paint', type: 'INVALID_TYPE' });
    expect(res.status).toBe(400);
  });

  it('should create and return a custom paint with name only', async () => {
    vi.mocked(prisma.userCustomPaint.create).mockResolvedValue(
      { ...mockCustomPaint, type: null, notes: null } as never,
    );
    const app = createApp();

    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: 'My Custom Red' });

    expect(res.status).toBe(201);
    expect(prisma.userCustomPaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'My Custom Red',
        }),
      }),
    );
  });

  it('should create a custom paint with all optional fields', async () => {
    vi.mocked(prisma.userCustomPaint.create).mockResolvedValue(mockCustomPaint as never);
    const app = createApp();

    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: 'My Custom Red', type: 'BASE', notes: 'Slightly orange-tinted red' });

    expect(res.status).toBe(201);
    expect(prisma.userCustomPaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'My Custom Red',
          type: 'BASE',
          notes: 'Slightly orange-tinted red',
        }),
      }),
    );
    expect(res.body.name).toBe('My Custom Red');
  });

  it('should return 400 when body has an unknown field', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: 'My Paint', extraField: 'x' });
    expect(res.status).toBe(400);
  });

  it('should create a custom paint with null type when type is omitted', async () => {
    vi.mocked(prisma.userCustomPaint.create).mockResolvedValue(
      { ...mockCustomPaint, type: null } as never,
    );
    const app = createApp();

    await request(app)
      .post('/api/user-paints')
      .set(AUTH_HEADER)
      .send({ name: 'Unnamed Type Paint' });

    expect(prisma.userCustomPaint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: null }),
      }),
    );
  });
});

describe('DELETE /api/user-paints/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 401 when not authenticated', async () => {
    const app = createApp();
    const res = await request(app).delete('/api/user-paints/cp-1');
    expect(res.status).toBe(401);
  });

  it('should return 404 when paint does not exist', async () => {
    vi.mocked(prisma.userCustomPaint.findFirst).mockResolvedValue(null as never);
    const app = createApp();

    const res = await request(app)
      .delete('/api/user-paints/cp-999')
      .set(AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('should return 404 when paint belongs to another user', async () => {
    vi.mocked(prisma.userCustomPaint.findFirst).mockResolvedValue(null as never);
    const app = createApp();

    const res = await request(app)
      .delete('/api/user-paints/cp-other-user')
      .set(AUTH_HEADER);

    expect(res.status).toBe(404);
  });

  it('should delete the paint and return 204', async () => {
    vi.mocked(prisma.userCustomPaint.findFirst).mockResolvedValue(mockCustomPaint as never);
    vi.mocked(prisma.userCustomPaint.delete).mockResolvedValue(mockCustomPaint as never);
    const app = createApp();

    const res = await request(app)
      .delete('/api/user-paints/cp-1')
      .set(AUTH_HEADER);

    expect(res.status).toBe(204);
    expect(prisma.userCustomPaint.delete).toHaveBeenCalledWith({ where: { id: 'cp-1' } });
  });

  it('should only delete paints belonging to the authenticated user', async () => {
    vi.mocked(prisma.userCustomPaint.findFirst).mockResolvedValue(mockCustomPaint as never);
    vi.mocked(prisma.userCustomPaint.delete).mockResolvedValue(mockCustomPaint as never);
    const app = createApp();

    await request(app)
      .delete('/api/user-paints/cp-1')
      .set(AUTH_HEADER);

    expect(prisma.userCustomPaint.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cp-1', userId: 'user-1' } }),
    );
  });
});