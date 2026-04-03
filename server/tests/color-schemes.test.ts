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
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        colorSchemeStepMix: {
            deleteMany: vi.fn(),
        },
        colorSchemeImage: {
            create: vi.fn(),
            findFirst: vi.fn(),
            delete: vi.fn(),
        },
        $transaction: vi.fn(),
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
        project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    },
}));

// ─── Mock S3 ──────────────────────────────────────────────
const mockSend = vi.fn();
vi.mock('../src/lib/s3', () => ({
    getS3Client: vi.fn(() => ({ send: mockSend })),
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
const PAINT_1 = '00000000-0000-0000-0000-000000000010';
const PAINT_2 = '00000000-0000-0000-0000-000000000011';

const validStep1 = { orderIndex: 1, area: 'Armor', techniqueId: TECH_1 };
const validStep2 = { orderIndex: 2, area: 'Trim',  techniqueId: TECH_2 };

const validMixStep = {
    orderIndex: 1,
    area: 'Armor',
    techniqueId: TECH_1,
    isMix: true,
    mix: [
        { paintId: PAINT_1, ratio: 70 },
        { paintId: PAINT_2, ratio: 30 },
    ],
};

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
        // Default: no old step images → no S3 deletions triggered by updateScheme
        (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        mockSend.mockResolvedValue({});
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

    // ─── POST /api/color-schemes — strict mode ────────────
    describe('POST /api/color-schemes — strict mode', () => {
        it('returns 400 when body has an unknown field', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ ...validSchemePayload, extraField: 'x' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when a step has an unknown field', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Test scheme',
                    steps: [{ ...validStep1, unknownStepField: 'y' }],
                });

            expect(res.status).toBe(400);
        });
    });

    // ─── POST /api/color-schemes — mix steps ─────────────
    describe('POST /api/color-schemes — mix steps', () => {
        it('creates a scheme with a valid mix step and returns 201', async () => {
            (prisma.colorScheme.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({ name: 'Red mix', steps: [validMixStep] });

            expect(res.status).toBe(201);
        });

        it('accepts a mix step with no ratio on entries', async () => {
            (prisma.colorScheme.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'No ratio mix',
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        isMix: true,
                        mix: [{ paintId: PAINT_1 }, { paintId: PAINT_2 }],
                    }],
                });

            expect(res.status).toBe(201);
        });

        it('returns 400 when isMix is true and mix[] is empty', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Empty mix',
                    steps: [{ orderIndex: 1, area: 'Armor', techniqueId: TECH_1, isMix: true, mix: [] }],
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 when isMix is true and mix is absent', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'No mix array',
                    steps: [{ orderIndex: 1, area: 'Armor', techniqueId: TECH_1, isMix: true }],
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 when isMix is true and paintId is set on the step', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Mix with paintId',
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        isMix: true,
                        paintId: PAINT_1,
                        mix: [{ paintId: PAINT_1, ratio: 70 }, { paintId: PAINT_2, ratio: 30 }],
                    }],
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 when a mix entry has neither paintId nor userCustomPaintId', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Empty entry',
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        isMix: true,
                        mix: [{ ratio: 50 }],
                    }],
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 when a mix entry has an unknown field (strict mode)', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Unknown entry field',
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        isMix: true,
                        mix: [{ paintId: PAINT_1, ratio: 100, unknownField: 'x' }],
                    }],
                });

            expect(res.status).toBe(400);
        });

        it('returns 400 when mix[] is provided without isMix: true', async () => {
            const res = await request(app)
                .post('/api/color-schemes')
                .set('Authorization', AUTH)
                .send({
                    name: 'Mix without flag',
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        mix: [{ paintId: PAINT_1, ratio: 100 }],
                    }],
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

        it('returns 400 when body has an unknown field', async () => {
            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ name: 'Updated', extraField: 'x' });

            expect(res.status).toBe(400);
        });
    });

    // ─── PUT /api/color-schemes/:id — mix steps ──────────
    describe('PUT /api/color-schemes/:id — mix steps', () => {
        it('replaces steps with mix entries via transaction and returns 200', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ steps: [validMixStep] });

            expect(res.status).toBe(200);
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('returns 400 when isMix is true and paintId is set on the step', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({
                    steps: [{
                        orderIndex: 1, area: 'Armor', techniqueId: TECH_1,
                        isMix: true,
                        paintId: PAINT_1,
                        mix: [{ paintId: PAINT_1, ratio: 70 }, { paintId: PAINT_2, ratio: 30 }],
                    }],
                });

            expect(res.status).toBe(400);
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

    // ─── POST /api/color-schemes/:id/images ──────────────
    describe('POST /api/color-schemes/:id/images', () => {
        it('creates an image record and returns 201', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeImage.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'img-1', colorSchemeId: 'cs-1', key: 'users/user-1/123-ref.jpg', order: 1,
            });

            const res = await request(app)
                .post('/api/color-schemes/cs-1/images')
                .set('Authorization', AUTH)
                .send({ key: 'users/user-1/123-ref.jpg', order: 1 });

            expect(res.status).toBe(201);
            expect(res.body.key).toBe('users/user-1/123-ref.jpg');
        });

        it('returns 400 when key is missing', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes/cs-1/images')
                .set('Authorization', AUTH)
                .send({ order: 1 });

            expect(res.status).toBe(400);
        });

        it('returns 400 when order is missing', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            const res = await request(app)
                .post('/api/color-schemes/cs-1/images')
                .set('Authorization', AUTH)
                .send({ key: 'users/user-1/123-ref.jpg' });

            expect(res.status).toBe(400);
        });

        it('returns 404 when the scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/color-schemes/nope/images')
                .set('Authorization', AUTH)
                .send({ key: 'users/user-1/123-ref.jpg', order: 1 });

            expect(res.status).toBe(404);
        });

        it('returns 403 when the scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...sampleScheme, userId: 'other-user',
            });

            const res = await request(app)
                .post('/api/color-schemes/cs-1/images')
                .set('Authorization', AUTH)
                .send({ key: 'users/user-1/123-ref.jpg', order: 1 });

            expect(res.status).toBe(403);
        });
    });

    // ─── DELETE /api/color-schemes/:id/images/:imageId ───
    describe('DELETE /api/color-schemes/:id/images/:imageId', () => {
        const sampleImage = { id: 'img-1', colorSchemeId: 'cs-1', key: 'users/user-1/ref.jpg', order: 1 };

        it('deletes the image record and returns 204', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeImage.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);
            (prisma.colorSchemeImage.delete as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);

            const res = await request(app)
                .delete('/api/color-schemes/cs-1/images/img-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
            expect(prisma.colorSchemeImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
        });

        it('calls S3 send with the image key', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeImage.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);
            (prisma.colorSchemeImage.delete as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);

            await request(app)
                .delete('/api/color-schemes/cs-1/images/img-1')
                .set('Authorization', AUTH);

            expect(mockSend).toHaveBeenCalledOnce();
        });

        it('still deletes the DB record even when S3 fails', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeImage.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);
            (prisma.colorSchemeImage.delete as ReturnType<typeof vi.fn>).mockResolvedValue(sampleImage);
            mockSend.mockRejectedValueOnce(new Error('S3 unavailable'));

            const res = await request(app)
                .delete('/api/color-schemes/cs-1/images/img-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
            expect(prisma.colorSchemeImage.delete).toHaveBeenCalledOnce();
        });

        it('returns 404 when the image does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeImage.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/color-schemes/cs-1/images/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
        });

        it('returns 403 when the scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...sampleScheme, userId: 'other-user',
            });

            const res = await request(app)
                .delete('/api/color-schemes/cs-1/images/img-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(403);
        });
    });

    // ─── GET /:id includes images ─────────────────────────
    describe('GET /api/color-schemes/:id — images field', () => {
        it('returns the scheme with its images array', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...sampleScheme,
                images: [{ id: 'img-1', colorSchemeId: 'cs-1', key: 'users/user-1/ref.jpg', order: 1 }],
            });

            const res = await request(app).get('/api/color-schemes/cs-1').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.images).toHaveLength(1);
            expect(res.body.images[0].key).toBe('users/user-1/ref.jpg');
        });
    });

    // ─── PUT /:id — stepImageKey ──────────────────────────
    describe('PUT /api/color-schemes/:id — stepImageKey', () => {
        it('accepts a step with stepImageKey and returns 200', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...sampleScheme,
                steps: [{ ...sampleScheme.steps[0], stepImageKey: 'users/user-1/step.jpg' }],
            });

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ steps: [{ orderIndex: 1, area: 'Armor', techniqueId: TECH_1, stepImageKey: 'users/user-1/step.jpg' }] });

            expect(res.status).toBe(200);
        });

        it('deletes old step S3 keys removed by an update', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { stepImageKey: 'users/user-1/old-step.jpg' },
            ]);
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ steps: [{ orderIndex: 1, area: 'Armor', techniqueId: TECH_1 }] });

            expect(mockSend).toHaveBeenCalledOnce();
        });

        it('does not call S3 when no step images are removed', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);
            // findMany already returns [] from beforeEach
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue(sampleScheme);

            await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ steps: [validStep1, validStep2] });

            expect(mockSend).not.toHaveBeenCalled();
        });
    });

    // ─── Ownership enforcement (OWN-02) ──────────────────
    // Wave 0: These tests are RED until Plan 02 fixes the service.
    // Currently the service returns 404 because findFirst({ where: { id, userId } })
    // returns null for both not-found AND wrong-owner cases.
    describe('Ownership enforcement (OWN-02)', () => {
        it('PUT /api/color-schemes/:id — returns 403 when scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'cs-1',
                userId: 'other-user',
                steps: [],
            });

            const res = await request(app)
                .put('/api/color-schemes/cs-1')
                .set('Authorization', AUTH)
                .send({ name: 'Updated' });

            expect(res.status).toBe(403);
        });

        it('DELETE /api/color-schemes/:id — returns 403 when scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'cs-1',
                userId: 'other-user',
                steps: [],
            });

            const res = await request(app)
                .delete('/api/color-schemes/cs-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(403);
        });
    });
});