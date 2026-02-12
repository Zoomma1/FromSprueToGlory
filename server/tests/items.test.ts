// ──────────────────────────────────────────────────────────
// 🧪 Items Route Tests
// ──────────────────────────────────────────────────────────
// Tests for Items CRUD + status change + history.
// Auth middleware is mocked via verifyAccessToken.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

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
        // Needed for other routes that load during app creation
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        colorSchemeStep: { deleteMany: vi.fn() },
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
const GS_1 = '00000000-0000-0000-0000-000000000001';
const F_1 = '00000000-0000-0000-0000-000000000002';

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
    beforeEach(() => vi.clearAllMocks());

    // ─── LIST ────────────────────────────────────
    describe('GET /api/items', () => {
        it('should return items for authenticated user', async () => {
            (prisma.item.findMany as any).mockResolvedValue([sampleItem]);

            const res = await request(app)
                .get('/api/items')
                .set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].name).toBe('Intercessors');
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/items');
            expect(res.status).toBe(401);
        });
    });

    // ─── CREATE ──────────────────────────────────
    describe('POST /api/items', () => {
        it('should create an item and return 201', async () => {
            (prisma.item.create as any).mockResolvedValue(sampleItem);

            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({
                    name: 'Intercessors',
                    gameSystemId: GS_1,
                    factionId: F_1,
                });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Intercessors');
        });

        it('should return 400 for missing name', async () => {
            const res = await request(app)
                .post('/api/items')
                .set('Authorization', AUTH)
                .send({ gameSystemId: GS_1, factionId: F_1, name: '' });

            expect(res.status).toBe(400);
        });
    });

    // ─── DELETE ──────────────────────────────────
    describe('DELETE /api/items/:id', () => {
        it('should delete item and return 204', async () => {
            (prisma.item.findFirst as any).mockResolvedValue(sampleItem);
            (prisma.item.delete as any).mockResolvedValue({});

            const res = await request(app)
                .delete('/api/items/item-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
        });

        it('should return 404 for unknown item', async () => {
            (prisma.item.findFirst as any).mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/items/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
        });
    });

    // ─── STATUS CHANGE ───────────────────────────
    describe('PATCH /api/items/:id/status', () => {
        it('should change status and create history', async () => {
            (prisma.item.findFirst as any).mockResolvedValue({ ...sampleItem, status: 'WANT' });
            const updatedItem = { ...sampleItem, status: 'BOUGHT' };
            (prisma.$transaction as any).mockResolvedValue([updatedItem, {}]);

            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({ status: 'BOUGHT' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('BOUGHT');
        });

        it('should return 400 for same status', async () => {
            (prisma.item.findFirst as any).mockResolvedValue({ ...sampleItem, status: 'WANT' });

            const res = await request(app)
                .patch('/api/items/item-1/status')
                .set('Authorization', AUTH)
                .send({ status: 'WANT' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already');
        });
    });

    // ─── HISTORY ─────────────────────────────────
    describe('GET /api/items/:id/history', () => {
        it('should return status history', async () => {
            (prisma.item.findFirst as any).mockResolvedValue(sampleItem);
            (prisma.itemStatusHistory.findMany as any).mockResolvedValue([
                { fromStatus: 'WANT', toStatus: 'BOUGHT', changedAt: new Date().toISOString() },
            ]);

            const res = await request(app)
                .get('/api/items/item-1/history')
                .set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].toStatus).toBe('BOUGHT');
        });
    });
});
