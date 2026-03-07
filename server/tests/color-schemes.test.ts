// ──────────────────────────────────────────────────────────
// Color Schemes Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the color-schemes routes:
//   GET  /api/color-schemes        — list
//   GET  /api/color-schemes/:id    — single scheme
//   POST /api/color-schemes        — create (step validation)
//   PUT  /api/color-schemes/:id    — update (with and without steps)
//   DELETE /api/color-schemes/:id  — delete
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

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
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
        project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    },
}));

// ─── Mock JWT ─────────────────────────────────────────────
const mockVerifyAccessToken = vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' });

vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('tok'),
    generateRefreshToken: vi.fn().mockReturnValue('rtok'),
    verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
    verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn(), compare: vi.fn() },
}));

const app = createApp();
const AUTH = 'Bearer fake-token';

const TECH_1 = '00000000-0000-0000-0000-000000000001';
const TECH_2 = '00000000-0000-0000-0000-000000000002';

const validStep1 = { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 };
const validStep2 = { orderIndex: 2, area: 'Trim',  techniqueId: TECH_2 };

const validSchemePayload = {
    name: 'Ultramarines Blue',
    steps: [validStep1, validStep2],
};

const sampleScheme = {
    id: 'cs-1',
    userId: 'user-1',
    name: 'Ultramarines Blue',
    steps: [
        { id: 'step-1', orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
        { id: 'step-2', orderIndex: 2, area: 'Trim',  techniqueId: TECH_2 },
    ],
};

describe('Color Schemes Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).get('/api/color-schemes');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });

            const res = await request(app)
                .get('/api/color-schemes')
                .set('Authorization', 'Bearer bad-token');

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired token');
        });
    });

    // ─── GET /api/color-schemes ───────────────────────────
    describe('GET /api/color-schemes', () => {
        it('returns the list of color schemes', async () => {
            (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleScheme]);

            const res = await request(app).get('/api/color-schemes').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Ultramarines Blue');
        });

        it('returns an empty list when the user has no schemes', async () => {
            (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/color-schemes').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
    });

    // ─── GET /api/color-schemes/:id ───────────────────────
    describe('GET /api/color-schemes/:id', () => {
        it('returns the scheme when found', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app).get('/api/color-schemes/cs-1').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('cs-1');
            expect(res.body.steps).toHaveLength(2);
        });

        it('returns 404 when the scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).get('/api/color-schemes/nope').set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });
    });

    // ─── POST /api/color-schemes ──────────────────────────
    describe('POST /api/color-schemes', () => {
        it('creates a scheme with steps and returns 201', async () => {
            (prisma.colorScheme.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send(validSchemePayload);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Ultramarines Blue');
            expect(res.body.steps).toHaveLength(2);
        });

        it('returns 400 when name is missing', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ steps: [validStep1] });

            expect(res.status).toBe(400);
        });

        it('returns 400 when name is empty', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ name: '', steps: [validStep1] });

            expect(res.status).toBe(400);
        });

        it('returns 400 when steps array is empty', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ name: 'No steps', steps: [] });

            expect(res.status).toBe(400);
        });

        it('returns 400 when steps are missing entirely', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ name: 'No steps' });

            expect(res.status).toBe(400);
        });

        it('returns 400 for duplicate orderIndex values', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Bad scheme',
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 1, area: 'Trim',  techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Duplicate');
        });

        it('returns 400 when orderIndex values have a gap', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Gappy scheme',
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 3, area: 'Trim',  techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('contiguous');
        });

        it('returns 400 when orderIndex does not start at 1', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Bad start',
                    steps: [
                        { orderIndex: 2, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 3, area: 'Trim',  techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('contiguous');
        });

        it('returns 400 when a step techniqueId is not a UUID', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Bad step',
                    steps: [{ orderIndex: 1, area: 'Armor', techniqueId: 'not-a-uuid' }],
                });

            expect(res.status).toBe(400);
        });
    });

    // ─── PUT /api/color-schemes/:id ───────────────────────
    describe('PUT /api/color-schemes/:id', () => {
        it('updates name only (no steps) and returns the scheme', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            const updated = { ...sampleScheme, name: 'Crimson Fists' };
            (prisma.colorScheme.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ name: 'Crimson Fists' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Crimson Fists');
            // Steps replacement via transaction should NOT be called
            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('replaces steps via a transaction when steps are provided', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ name: 'Updated', steps: [validStep1, validStep2] });

            expect(res.status).toBe(200);
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('returns 404 when the scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .put('/api/color-schemes/nope')
                .set('Authorization', AUTH)
                .send({ name: 'Updated' });

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });

        it('returns 400 for duplicate orderIndex in updated steps', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 1, area: 'Trim',  techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Duplicate');
        });

        it('returns 400 for a gap in orderIndex in updated steps', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({
                    steps: [
                        { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 },
                        { orderIndex: 3, area: 'Trim',  techniqueId: TECH_2 },
                    ],
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('contiguous');
        });
    });

    // ─── DELETE /api/color-schemes/:id ───────────────────
    describe('DELETE /api/color-schemes/:id', () => {
        it('deletes the scheme and returns 204', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorScheme.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app)
                .delete('/api/color-schemes/cs-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
            expect(prisma.colorScheme.delete).toHaveBeenCalledWith({ where: { id: 'cs-1' } });
        });

        it('returns 404 when the scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/color-schemes/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toContain('not found');
        });

        it('returns 401 without an Authorization header', async () => {
            const res = await request(app).delete('/api/color-schemes/cs-1');
            expect(res.status).toBe(401);
        });
    });
});