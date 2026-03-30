// ──────────────────────────────────────────────────────────
// Reference Route Tests
// ──────────────────────────────────────────────────────────
// Reference endpoints are public (no auth required).
// Covers every endpoint and the optional query-filter branches:
//   GET /api/reference/game-systems
//   GET /api/reference/factions   (with / without gameSystemId)
//   GET /api/reference/models     (with / without factionId)
//   GET /api/reference/paint-brands
//   GET /api/reference/paints     (with / without brandId and type)
//   GET /api/reference/techniques
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        gameSystem:   { findMany: vi.fn() },
        faction:      { findMany: vi.fn() },
        model:        { findMany: vi.fn() },
        paintBrand:   { findMany: vi.fn() },
        paint:        { findMany: vi.fn() },
        technique:    { findMany: vi.fn() },
        similarPaint: { findMany: vi.fn() },
        // Stubs for routes loaded during app creation
        user:             { findUnique: vi.fn(), create: vi.fn() },
        refreshToken:     { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        item:             { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        itemStatusHistory:{ create: vi.fn(), findMany: vi.fn() },
        colorScheme:      { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        colorSchemeStep:  { deleteMany: vi.fn() },
        project:          { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        $transaction:     vi.fn(),
        $queryRawUnsafe:  vi.fn(),
    },
}));

// Stubs — JWT mock not needed for public endpoints, but createApp loads other routes that use it
vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn(), compare: vi.fn() },
}));

const app = createApp();

const sampleGameSystem = { id: 'gs-1', name: 'Warhammer 40K', slug: 'wh40k' };
const sampleFaction    = { id: 'f-1',  name: 'Space Marines', gameSystemId: 'gs-1' };
const sampleModel      = { id: 'm-1',  name: 'Intercessor',   factionId: 'f-1' };
const sampleBrand      = { id: 'b-1',  name: 'Citadel',       slug: 'citadel' };
const samplePaint      = { id: 'p-1',  name: 'Macragge Blue', brandId: 'b-1', type: 'BASE' };
const sampleTechnique  = { id: 't-1',  name: 'Layering' };
const sampleSimilarPaintRow = {
    paintId: 'p-1',
    similarPaintId: 'p-2',
    source: 'redgrimm',
    similarPaint: {
        id: 'p-2',
        name: 'Dead White',
        type: 'BASE',
        code: '72.001',
        brand: { id: 'b-2', name: 'Vallejo', slug: 'vallejo' },
    },
};

describe('Reference Routes', () => {
    beforeEach(() => vi.clearAllMocks());

    // ─── GET /api/reference/game-systems ─────────────────
    describe('GET /api/reference/game-systems', () => {
        it('returns all game systems', async () => {
            (prisma.gameSystem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleGameSystem]);

            const res = await request(app).get('/api/reference/game-systems');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Warhammer 40K');
        });

        it('returns an empty list when there are no game systems', async () => {
            (prisma.gameSystem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/game-systems');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('does not require authentication', async () => {
            (prisma.gameSystem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/game-systems');

            // No Authorization header — should still return 200
            expect(res.status).toBe(200);
        });
    });

    // ─── GET /api/reference/factions ─────────────────────
    describe('GET /api/reference/factions', () => {
        it('returns all factions when no gameSystemId is given', async () => {
            (prisma.faction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleFaction]);

            const res = await request(app).get('/api/reference/factions');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(prisma.faction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        it('filters by gameSystemId when provided', async () => {
            (prisma.faction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleFaction]);

            await request(app).get('/api/reference/factions?gameSystemId=gs-1');

            expect(prisma.faction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { gameSystemId: 'gs-1' } }),
            );
        });

        it('returns an empty list when no factions match', async () => {
            (prisma.faction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/factions?gameSystemId=unknown');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    // ─── GET /api/reference/models ───────────────────────
    describe('GET /api/reference/models', () => {
        it('returns all models when no factionId is given', async () => {
            (prisma.model.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleModel]);

            const res = await request(app).get('/api/reference/models');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(prisma.model.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        it('filters by factionId when provided', async () => {
            (prisma.model.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleModel]);

            await request(app).get('/api/reference/models?factionId=f-1');

            expect(prisma.model.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { factionId: 'f-1' } }),
            );
        });

        it('returns an empty list when no models match', async () => {
            (prisma.model.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/models?factionId=unknown');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    // ─── GET /api/reference/paint-brands ─────────────────
    describe('GET /api/reference/paint-brands', () => {
        it('returns all paint brands', async () => {
            (prisma.paintBrand.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleBrand]);

            const res = await request(app).get('/api/reference/paint-brands');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Citadel');
        });

        it('returns an empty list when there are no brands', async () => {
            (prisma.paintBrand.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/paint-brands');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    // ─── GET /api/reference/paints ───────────────────────
    describe('GET /api/reference/paints', () => {
        it('returns all paints when no filters are given', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);

            const res = await request(app).get('/api/reference/paints');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} }),
            );
        });

        it('filters by brandId when provided', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);

            await request(app).get('/api/reference/paints?brandId=b-1');

            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { brandId: 'b-1' } }),
            );
        });

        it('filters by type when provided', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);

            await request(app).get('/api/reference/paints?type=BASE');

            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { type: 'BASE' } }),
            );
        });

        it('combines brandId and type filters', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaint]);

            await request(app).get('/api/reference/paints?brandId=b-1&type=BASE');

            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { brandId: 'b-1', type: 'BASE' } }),
            );
        });

        it('returns an empty list when no paints match', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/paints?type=UNKNOWN');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    // ─── GET /api/reference/paints/:id/similar ───────────
    describe('GET /api/reference/paints/:id/similar', () => {
        it('returns similar paints for a given paint id', async () => {
            (prisma.similarPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleSimilarPaintRow]);

            const res = await request(app).get('/api/reference/paints/p-1/similar');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toMatchObject({
                id: 'p-2',
                name: 'Dead White',
                type: 'BASE',
                code: '72.001',
                source: 'redgrimm',
                brand: { name: 'Vallejo', slug: 'vallejo' },
            });
        });

        it('passes the paintId to the query', async () => {
            (prisma.similarPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/reference/paints/p-1/similar');

            expect(prisma.similarPaint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { paintId: 'p-1' } }),
            );
        });

        it('returns an empty list when no similar paints exist', async () => {
            (prisma.similarPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/paints/unknown-id/similar');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('does not require authentication', async () => {
            (prisma.similarPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/paints/p-1/similar');

            expect(res.status).toBe(200);
        });
    });

    // ─── GET /api/reference/similar-paints ───────────────
    describe('GET /api/reference/similar-paints', () => {
        const samplePaintWithEquivalents = {
            id: 'p-1',
            name: 'White Scar',
            code: 'C1',
            brand: { name: 'Citadel', slug: 'citadel' },
            similarities: [
                {
                    paintId: 'p-1',
                    similarPaintId: 'p-2',
                    source: 'redgrimm',
                    similarPaint: {
                        id: 'p-2',
                        name: 'Dead White',
                        code: '72.001',
                        brand: { id: 'b-2', name: 'Vallejo', slug: 'vallejo' },
                    },
                },
            ],
        };

        it('returns all paints that have equivalents, with their equivalents', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([samplePaintWithEquivalents]);

            const res = await request(app).get('/api/reference/similar-paints');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toMatchObject({
                id: 'p-1',
                name: 'White Scar',
                brand: { name: 'Citadel', slug: 'citadel' },
                equivalents: [
                    { id: 'p-2', name: 'Dead White', code: '72.001', source: 'redgrimm', brand: { name: 'Vallejo', slug: 'vallejo' } },
                ],
            });
        });

        it('returns an empty list when no similar paints exist', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/similar-paints');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('does not require authentication', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/similar-paints');

            expect(res.status).toBe(200);
        });
    });

    // ─── GET /api/reference/techniques ───────────────────
    describe('GET /api/reference/techniques', () => {
        it('returns all techniques', async () => {
            (prisma.technique.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleTechnique]);

            const res = await request(app).get('/api/reference/techniques');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Layering');
        });

        it('returns an empty list when there are no techniques', async () => {
            (prisma.technique.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/reference/techniques');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });
});