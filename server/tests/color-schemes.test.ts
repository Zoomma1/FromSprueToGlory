// ──────────────────────────────────────────────────────────
// 🧪 Color Schemes Route Tests
// ──────────────────────────────────────────────────────────
// Tests for color scheme CRUD + step validation logic.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        colorScheme: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        colorSchemeStep: {
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
        // Stubs for other routes
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
    },
}));

// ─── Mock JWT (make auth middleware pass) ─────────────────
vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('tok'),
    generateRefreshToken: vi.fn().mockReturnValue('rtok'),
    verifyAccessToken: vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' }),
    verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn(), compare: vi.fn() },
}));

import { prisma } from '../src/lib/prisma';

const app = createApp();
const AUTH = 'Bearer fake-token';

// Valid UUIDs required by Zod schema
const TECH_1 = '00000000-0000-0000-0000-000000000001';
const TECH_2 = '00000000-0000-0000-0000-000000000002';

const validSchemePayload = {
    name: 'Ultramarines Blue',
    steps: [
        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
        { orderIndex: 2, area: 'Trim', techniqueId: TECH_2 },
    ],
};

const sampleScheme = {
    id: 'cs-1',
    userId: 'user-1',
    name: 'Ultramarines Blue',
    steps: [
        { id: 'step-1', orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
        { id: 'step-2', orderIndex: 2, area: 'Trim', techniqueId: TECH_2 },
    ],
};

describe('Color Schemes Routes', () => {
    beforeEach(() => vi.clearAllMocks());

    // ─── LIST ────────────────────────────────────
    describe('GET /api/color-schemes', () => {
        it('should return color schemes for authenticated user', async () => {
            (prisma.colorScheme.findMany as any).mockResolvedValue([sampleScheme]);

            const res = await request(app)
                .get('/api/color-schemes')
                .set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Ultramarines Blue');
        });
    });

    // ─── CREATE ──────────────────────────────────
    describe('POST /api/color-schemes', () => {
        it('should create a scheme with steps and return 201', async () => {
            (prisma.colorScheme.create as any).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send(validSchemePayload);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Ultramarines Blue');
            expect(res.body.steps).toHaveLength(2);
        });

        it('should return 400 for duplicate orderIndex', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Bad scheme',
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 1, area: 'Trim', techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Duplicate');
        });

        it('should return 400 for gap in orderIndex', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Gappy scheme',
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 3, area: 'Trim', techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('contiguous');
        });

        it('should return 400 for empty steps', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ name: 'No steps' });

            expect(res.status).toBe(400);
        });
    });

    // ─── GET BY ID ───────────────────────────────
    describe('GET /api/color-schemes/:id', () => {
        it('should return 404 for unknown scheme', async () => {
            (prisma.colorScheme.findFirst as any).mockResolvedValue(null);

            const res = await request(app)
                .get('/api/color-schemes/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });
    });

    // ─── DELETE ──────────────────────────────────
    describe('DELETE /api/color-schemes/:id', () => {
        it('should delete scheme and return 204', async () => {
            (prisma.colorScheme.findFirst as any).mockResolvedValue(sampleScheme);
            (prisma.colorScheme.delete as any).mockResolvedValue({});

            const res = await request(app)
                .delete('/api/color-schemes/cs-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
        });

        it('should return 404 for unknown scheme', async () => {
            (prisma.colorScheme.findFirst as any).mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/color-schemes/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
        });
    });
});
