//
// Admin Route Tests
//
// Covers every branch of POST /api/admin/paints/sync :
//   - 400 when body is not an array
//   - 400 when body is an empty array
//   - 400 when required fields are missing
//   - skips paint when brandSlug is unknown
//   - skips paint when it already exists (idempotence)
//   - creates paint when it is new
//   - handles mixed batch (create + skip + error)
//   - returns 500 on unexpected Prisma error
//

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

//  Mock Prisma
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    paintBrand: {
      findUnique: vi.fn(),
    },
    paint: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    colorSchemeStep: { deleteMany: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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

//  Fixtures
const mockBrand = { id: 'brand-citadel', slug: 'citadel', name: 'Citadel' };

const validPaint = {
  name: 'Abaddon Black',
  brandSlug: 'citadel',
  range: 'Base',
  type: 'BASE',
  code: 'CT-abaddon-black',
};

const app = createApp();
const ENDPOINT = '/api/admin/paints/sync';

//  Helpers
const mockBrandFound = () =>
  (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrand);

const mockBrandNotFound = () =>
  (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

const mockPaintNotFound = () =>
  (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

const mockPaintFound = () =>
  (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'paint-1', ...validPaint });

const mockPaintCreated = () =>
  (prisma.paint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'paint-new', ...validPaint });

//  Tests
describe('POST /api/admin/paints/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //  Validation du body
  describe('Body validation', () => {
    it('returns 400 when body is not an array', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send({ name: 'Abaddon Black' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/array/i);
    });

    it('returns 400 when body is an empty array', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send([]);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/array/i);
    });

    it('returns 400 when body is null', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send(null);

      expect(res.status).toBe(400);
    });
  });

  //  Champs manquants
  describe('Missing required fields', () => {
    it('records an error when name is missing', async () => {
      mockBrandFound();
      mockPaintNotFound();

      const res = await request(app)
        .post(ENDPOINT)
        .send([{ brandSlug: 'citadel', type: 'BASE', code: 'REF-001' }]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.created).toBe(0);
    });

    it('records an error when brandSlug is missing', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send([{ name: 'Abaddon Black', type: 'BASE', code: 'REF-001' }]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.created).toBe(0);
    });

    it('records an error when type is missing', async () => {
      const res = await request(app)
        .post(ENDPOINT)
        .send([{ name: 'Abaddon Black', brandSlug: 'citadel', code: 'REF-001' }]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.created).toBe(0);
    });
  });

  //  Brand inconnue
  describe('Unknown brand', () => {
    it('records an error when brandSlug does not exist in DB', async () => {
      mockBrandNotFound();

      const res = await request(app)
        .post(ENDPOINT)
        .send([validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0]).toMatch(/citadel/i);
      expect(res.body.created).toBe(0);
      expect(prisma.paint.create).not.toHaveBeenCalled();
    });
  });

  //  Idempotence / doublon
  describe('Idempotence', () => {
    it('skips a paint that already exists', async () => {
      mockBrandFound();
      mockPaintFound();

      const res = await request(app)
        .post(ENDPOINT)
        .send([validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(1);
      expect(res.body.created).toBe(0);
      expect(prisma.paint.create).not.toHaveBeenCalled();
    });

    it('returns skipped=2 when sending the same paint twice in one batch', async () => {
      mockBrandFound();
      mockPaintFound();

      const res = await request(app)
        .post(ENDPOINT)
        .send([validPaint, validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.skipped).toBe(2);
      expect(res.body.created).toBe(0);
    });
  });

  //  Création
  describe('Paint creation', () => {
    it('creates a new paint and returns created=1', async () => {
      mockBrandFound();
      mockPaintNotFound();
      mockPaintCreated();

      const res = await request(app)
        .post(ENDPOINT)
        .send([validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(1);
      expect(res.body.skipped).toBe(0);
      expect(res.body.errors).toHaveLength(0);
      expect(prisma.paint.create).toHaveBeenCalledOnce();
    });

    it('passes all fields to prisma.paint.create', async () => {
      mockBrandFound();
      mockPaintNotFound();
      mockPaintCreated();

      await request(app).post(ENDPOINT).send([validPaint]);

      expect(prisma.paint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Abaddon Black',
            type: 'BASE',
            code: 'CT-abaddon-black',
            brandId: mockBrand.id,
          }),
        }),
      );
    });

    it('creates a paint without code (code is optional)', async () => {
      mockBrandFound();
      mockPaintNotFound();
      mockPaintCreated();

      const paintWithoutRef = { name: 'Abaddon Black', brandSlug: 'citadel', type: 'BASE' };

      const res = await request(app).post(ENDPOINT).send([paintWithoutRef]);

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(1);
    });
  });

  //  Batch mixte
  describe('Mixed batch', () => {
    it('handles create + skip + error in a single call', async () => {
      // Paint 1 : nouveau → create
      // Paint 2 : déjà existant → skip
      // Paint 3 : brand inconnue → error

      (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockBrand)   // paint 1
        .mockResolvedValueOnce(mockBrand)   // paint 2
        .mockResolvedValueOnce(null);        // paint 3

      (prisma.paint.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)         // paint 1 : nouveau
        .mockResolvedValueOnce({ id: 'p2' });// paint 2 : existe déjà

      mockPaintCreated();

      const batch = [
        { name: 'Abaddon Black', brandSlug: 'citadel', type: 'BASE', code: 'REF-1' },
        { name: 'Averland Sunset', brandSlug: 'citadel', type: 'BASE', code: 'REF-2' },
        { name: 'Unknown Paint', brandSlug: 'unknown-brand', type: 'BASE', code: 'REF-3' },
      ];

      const res = await request(app).post(ENDPOINT).send(batch);

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(1);
      expect(res.body.skipped).toBe(1);
      expect(res.body.errors).toHaveLength(1);
    });
  });

  //  Erreur Prisma inattendue
  describe('Prisma errors', () => {
    it('records an error when prisma.paint.create throws', async () => {
      mockBrandFound();
      mockPaintNotFound();
      (prisma.paint.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('DB connection lost'),
      );

      const res = await request(app).post(ENDPOINT).send([validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0]).toMatch(/Abaddon Black/);
      expect(res.body.created).toBe(0);
    });

    it('records an error when prisma.paintBrand.findUnique throws', async () => {
      (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Timeout'),
      );

      const res = await request(app).post(ENDPOINT).send([validPaint]);

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.created).toBe(0);
    });
  });

  describe('Json export', () => {
      it('exports paints in correct format', async () => {
        (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
          {
            id: 'paint-1',
            name: 'Abaddon Black',
            code: 'CT-abaddon-black',
            type: 'BASE',
            brandId: mockBrand.id,
            brand: mockBrand,
          },
        ]);

        const res = await request(app).get('/api/admin/paints/export');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
          { name: 'Abaddon Black', code: 'CT-abaddon-black', type: 'BASE', brandSlug: 'citadel' },
        ]);
      });
  });
});