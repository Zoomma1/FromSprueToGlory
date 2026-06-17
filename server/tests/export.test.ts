import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// ─── Prisma mock ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    item: { findMany: vi.fn() },
    colorScheme: { findMany: vi.fn() },
    userOwnedPaint: { findMany: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    paintBrand: { findUnique: vi.fn() },
    paint: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userCustomPaint: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    colorSchemeStep: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// ─── Auth mock ───────────────────────────────────────────
vi.mock('../src/utils/jwt', () => ({
  generateAccessToken: vi.fn().mockReturnValue('tok'),
  generateRefreshToken: vi.fn().mockReturnValue('rtok'),
  verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' }),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

// ─── S3 mock (needed by media routes loaded via createApp) ─
vi.mock('../src/lib/s3', () => ({ getS3Client: vi.fn().mockReturnValue({}) }));
vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3/mock'),
}));

// ─── Fixtures ─────────────────────────────────────────────
const mockItem = {
  name: 'Space Marine',
  status: 'OWNED',
  gameSystem: { name: 'Warhammer 40K' },
  faction: { name: 'Ultramarines' },
  model: { name: 'Primaris Intercessor' },
  quantity: 1,
  price: 9.99,
  currency: 'EUR',
  store: 'GW Store',
  tags: ['starter'],
  notes: 'First mini',
  purchaseDate: new Date('2024-01-15'),
  createdAt: new Date('2024-01-16'),
  statusHistory: [],
};

const app = createApp();
const server = app.listen(0);
afterAll(() => {
    server.close();
});
const AUTH_HEADER = { Authorization: 'Bearer valid-token' };

// ─── GET /api/export/items ────────────────────────────────
describe('GET /api/export/items', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(server).get('/api/export/items');
    expect(res.status).toBe(401);
  });

  it('returns 200 with JSON array when format=json', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

    const res = await request(server).get('/api/export/items?format=json').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('returns 200 with default JSON format when format param is omitted', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

    const res = await request(server).get('/api/export/items').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 200 with Content-Type text/csv when format=csv', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

    const res = await request(server).get('/api/export/items?format=csv').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('returns Content-Disposition: attachment when format=csv', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

    const res = await request(server).get('/api/export/items?format=csv').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns CSV with only header row when dataset is empty', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(server).get('/api/export/items?format=csv').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.text).toContain('name,status,gameSystem');
    expect(res.text.trim().split('\n')).toHaveLength(1);
  });
});

// ─── GET /api/export/color-schemes ───────────────────────
describe('GET /api/export/color-schemes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(server).get('/api/export/color-schemes');
    expect(res.status).toBe(401);
  });

  it('returns 200 with array on happy path', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'cs-1', name: 'Test Scheme', steps: [] },
    ]);

    const res = await request(server).get('/api/export/color-schemes').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('returns 200 with empty array when no schemes', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(server).get('/api/export/color-schemes').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── GET /api/export/owned-paints ────────────────────────
describe('GET /api/export/owned-paints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(server).get('/api/export/owned-paints');
    expect(res.status).toBe(401);
  });

  it('returns 200 with WPF-aligned JSON array on happy path', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        userId: 'user-1',
        paintId: 'paint-1',
        paint: {
          name: 'Abaddon Black',
          code: null,
          hex: '#231F20',
          type: 'BASE',
          brand: { name: 'Citadel Colour' },
        },
      },
    ]);

    const res = await request(server).get('/api/export/owned-paints').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({
      name: 'Abaddon Black',
      brand: 'Citadel Colour',
      set: null,
      hex: '#231F20',
      r: 35,
      g: 31,
      b: 32,
      type: 'BASE',
      code: null,
    });
  });

  it('returns 200 with empty array when user has no owned paints', async () => {
    const { prisma } = await import('../src/lib/prisma');
    (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(server).get('/api/export/owned-paints').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
