// ──────────────────────────────────────────────────────────
// Owned Paints Route Tests
// ──────────────────────────────────────────────────────────
// GET  /api/paints              — list with status
// POST /api/paints/owned/:id    — mark as owned
// DELETE /api/paints/owned/:id  — remove from owned
// POST /api/paints/wishlist/:id — add to wishlist
// DELETE /api/paints/wishlist/:id — remove from wishlist
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

vi.mock('../src/lib/prisma', () => ({
    prisma: {
        paint: { findMany: vi.fn(), findFirst: vi.fn() },
        userOwnedPaint: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
        userWishlistPaint: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
        colorSchemeStep: { findMany: vi.fn() },
        similarPaint: { findMany: vi.fn() },
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        colorScheme: { findMany: vi.fn(), findFirst: vi.fn() },
        project: { findMany: vi.fn(), findFirst: vi.fn() },
        item: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
        itemStatusHistory: { findMany: vi.fn() },
        $transaction: vi.fn(),
    },
}));

const mockVerifyAccessToken = vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('tok'),
    generateRefreshToken: vi.fn().mockReturnValue('rtok'),
    verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
    verifyRefreshToken: vi.fn(),
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));

import { prisma } from '../src/lib/prisma';

const app = createApp();
const AUTH = 'Bearer fake-token';

const samplePaint = {
    id: 'paint-1',
    name: 'Abaddon Black',
    hex: null,
    type: 'BASE',
    code: null,
    notes: null,
    brandId: 'brand-1',
    brand: { id: 'brand-1', name: 'Citadel', slug: 'citadel' },
};

describe('GET /api/paints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (prisma.similarPaint as any).findMany.mockResolvedValue([]);
    });

    it('returns 401 without auth', async () => {
        const res = await request(app).get('/api/paints');
        expect(res.status).toBe(401);
    });

    it('returns paints list with status and counts', async () => {
        (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);
        (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
        (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const res = await request(app).get('/api/paints').set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('paints');
        expect(res.body).toHaveProperty('counts');
        expect(res.body.paints[0].status).toBe('owned');
        expect(res.body.counts.owned).toBe(1);
    });

    it('accepts filter query param', async () => {
        (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);
        (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
        (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const res = await request(app).get('/api/paints?filter=owned').set('Authorization', AUTH);

        expect(res.status).toBe(200);
        expect(res.body.paints).toHaveLength(1);
    });
});

describe('POST /api/paints/owned/:paintId', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 on success', async () => {
        (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(samplePaint);
        (prisma.userOwnedPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });

        const res = await request(app).post('/api/paints/owned/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(201);
    });

    it('returns 404 if paint not found', async () => {
        (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await request(app).post('/api/paints/owned/paint-999').set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/paints/owned/:paintId', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 on success', async () => {
        (prisma.userOwnedPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });
        (prisma.userOwnedPaint.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

        const res = await request(app).delete('/api/paints/owned/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(204);
    });

    it('returns 404 if not owned', async () => {
        (prisma.userOwnedPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await request(app).delete('/api/paints/owned/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });
});

describe('POST /api/paints/wishlist/:paintId', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 201 on success', async () => {
        (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(samplePaint);
        (prisma.userWishlistPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });

        const res = await request(app).post('/api/paints/wishlist/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(201);
    });

    it('returns 404 if paint not found', async () => {
        (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await request(app).post('/api/paints/wishlist/paint-999').set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/paints/wishlist/:paintId', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 204 on success', async () => {
        (prisma.userWishlistPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });
        (prisma.userWishlistPaint.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

        const res = await request(app).delete('/api/paints/wishlist/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(204);
    });

    it('returns 404 if not in wishlist', async () => {
        (prisma.userWishlistPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const res = await request(app).delete('/api/paints/wishlist/paint-1').set('Authorization', AUTH);

        expect(res.status).toBe(404);
    });
});
