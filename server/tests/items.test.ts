// ──────────────────────────────────────────────────────────
// Items Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the items routes:
//   GET /api/items           — list with filters
//   GET /api/items/:id       — single item
//   POST /api/items          — create
//   PUT /api/items/:id       — update
//   DELETE /api/items/:id    — delete
//   PATCH /api/items/:id/status — status change + history
//   GET /api/items/:id/history  — status history
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        item: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        itemStatusHistory: {
            create: vi.fn(),
            findMany: vi.fn(),
        },
        $transaction: vi.fn(),
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        colorSchemeStep: { deleteMany: vi.fn() },
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

const GS_1 = '00000000-0000-0000-0000-000000000001';
const F_1  = '00000000-0000-0000-0000-000000000002';

const sampleItem = {
    id: 'item-1',
    userId: 'user-1',
    name: 'Intercessors',
    gameSystemId: GS_1,
    factionId: F_1,
    status: 'WANT',
    quantity: 1,
    currency: 'EUR',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe('Items Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).get('/api/items');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('returns 401 when token verification fails', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });
            const res = await request(app).get('/api/items').set('Authorization', 'Bearer bad');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired token');
        });
    });

    // ─── GET /api/items ───────────────────────────────────
    describe('GET /api/items', () => {
        it('returns all items for the authenticated user', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleItem]);

            const res = await request(app).get('/api/items').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Intercessors');
        });

        it('returns an empty list when the user has no items', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/items').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('forwards the status filter to Prisma', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/items?status=BOUGHT').set('Authorization', AUTH);

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ status: 'BOUGHT' }) }),
            );
        });

        it('forwards the search filter as an OR condition', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/items?search=space').set('Authorization', AUTH);

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
            );
        });

        it('forwards the tags filter as hasSome', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/items?tags=elite,troops').set('Authorization', AUTH);

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ tags: { hasSome: ['elite', 'troops'] } }),
                }),
            );
        });

        it('sorts by name ascending when sortBy=name&sortDir=asc', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/items?sortBy=name&sortDir=asc').set('Authorization', AUTH);

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { name: 'asc' } }),
            );
        });

        it('falls back to createdAt desc for an unsupported sortBy value', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await request(app).get('/api/items?sortBy=invalid').set('Authorization', AUTH);

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
            );
        });
    });

    // ─── GET /api/items/:id ───────────────────────────────
    describe('GET /api/items/:id', () => {
        it('returns the item when found', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);

            const res = await request(app).get('/api/items/item-1').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('item-1');
        });

        it('returns 404 when the item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).get('/api/items/nope').set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Item not found');
        });
    });

    // ─── POST /api/items ──────────────────────────────────
    describe('POST /api/items', () => {
        it('creates an item and returns 201', async () => {
            (prisma.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);

            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: 'Intercessors', gameSystemId: GS_1, factionId: F_1 });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Intercessors');
        });

        it('returns 400 when name is empty', async () => {
            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: '', gameSystemId: GS_1, factionId: F_1 });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when gameSystemId is missing', async () => {
            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: 'Intercessors', factionId: F_1 });

            expect(res.status).toBe(400);
        });

        it('returns 400 when gameSystemId is not a UUID', async () => {
            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: 'Intercessors', gameSystemId: 'not-a-uuid', factionId: F_1 });

            expect(res.status).toBe(400);
        });

        it('returns 400 when factionId is missing', async () => {
            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: 'Intercessors', gameSystemId: GS_1 });

            expect(res.status).toBe(400);
        });

        it('accepts optional fields and sets defaults', async () => {
            const itemWithDefaults = { ...sampleItem, quantity: 1, status: 'WANT' };
            (prisma.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(itemWithDefaults);

            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ name: 'Scouts', gameSystemId: GS_1, factionId: F_1 });

            expect(res.status).toBe(201);
            expect(prisma.item.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'WANT', quantity: 1 }),
                }),
            );
        });
    });

    // ─── PUT /api/items/:id ───────────────────────────────
    describe('PUT /api/items/:id', () => {
        it('updates and returns the item', async () => {
            const updated = { ...sampleItem, name: 'Updated' };
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.item.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

            const res = await request(app)
                .put('/api/items/item-1')
                .set('Authorization', AUTH)
                .send({ name: 'Updated' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });

        it('returns 404 when the item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .put('/api/items/nope')
                .set('Authorization', AUTH)
                .send({ name: 'Updated' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Item not found');
        });

        it('returns 400 when body fails schema validation', async () => {
            const res = await request(app)
                .put('/api/items/item-1')
                .set('Authorization', AUTH)
                .send({ quantity: -5 }); // negative quantity is invalid

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });
    });

    // ─── DELETE /api/items/:id ────────────────────────────
    describe('DELETE /api/items/:id', () => {
        it('deletes the item and returns 204', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.item.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app).delete('/api/items/item-1').set('Authorization', AUTH);

            expect(res.status).toBe(204);
            expect(prisma.item.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
        });

        it('returns 404 when the item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).delete('/api/items/nope').set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Item not found');
        });
    });

    // ─── PATCH /api/items/:id/status ─────────────────────
    describe('PATCH /api/items/:id/status', () => {
        it('changes status and creates a history record', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleItem, status: 'WANT' });
            const updated = { ...sampleItem, status: 'BOUGHT' };
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([updated, {}]);

            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({ status: 'BOUGHT' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('BOUGHT');
        });

        it('returns 400 when new status equals current status', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ ...sampleItem, status: 'WANT' });

            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({ status: 'WANT' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already');
        });

        it('returns 400 for an invalid status value', async () => {
            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({ status: 'INVALID_STATUS' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when status field is missing from body', async () => {
            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 404 when the item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/items/nope/status')
                .set('Authorization', AUTH)
                .send({ status: 'BOUGHT' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Item not found');
        });
    });

    // ─── GET /api/items/:id/history ───────────────────────
    describe('GET /api/items/:id/history', () => {
        it('returns the status history for the item', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.itemStatusHistory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { fromStatus: 'WANT', toStatus: 'BOUGHT', changedAt: new Date().toISOString() },
            ]);

            const res = await request(app).get('/api/items/item-1/history').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].toStatus).toBe('BOUGHT');
        });

        it('returns an empty array when there is no history', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.itemStatusHistory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const res = await request(app).get('/api/items/item-1/history').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('returns 404 when the item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).get('/api/items/nope/history').set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Item not found');
        });
    });
});
