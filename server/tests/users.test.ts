// ──────────────────────────────────────────────────────────
// Users Route Tests
// ──────────────────────────────────────────────────────────
// Covers:
//   GET  /api/users/me — return user profile (id, email, currency)
//   PATCH /api/users/me — update preferred currency
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        $queryRawUnsafe: vi.fn(),
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

const mockUser = { id: 'user-1', email: 'a@b.com', currency: 'EUR', acquisitionChannel: null };

describe('Users Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).get('/api/users/me');
            expect(res.status).toBe(401);
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });
            const res = await request(app).get('/api/users/me').set('Authorization', 'Bearer bad');
            expect(res.status).toBe(401);
        });
    });

    // ─── GET /api/users/me ────────────────────────────────
    describe('GET /api/users/me', () => {
        it('returns the authenticated user profile', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ id: 'user-1', email: 'a@b.com', currency: 'EUR' });
        });

        it('exposes acquisitionChannel so the front knows whether to ask', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...mockUser,
                acquisitionChannel: 'reddit',
            });

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.acquisitionChannel).toBe('reddit');
        });

        it('exposes acquisitionChannel as null when never answered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.acquisitionChannel).toBeNull();
        });

        it('queries by the userId from the token, not from request params', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

            await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(prisma.user.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'user-1' } }),
            );
        });

        it('returns 404 when user is not found', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(404);
        });
    });

    // ─── PATCH /api/users/me ──────────────────────────────
    describe('PATCH /api/users/me', () => {
        it('updates and returns the user profile with the new currency', async () => {
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...mockUser,
                currency: 'GBP',
            });

            const res = await request(app)
                .patch('/api/users/me')
                .set('Authorization', AUTH)
                .send({ currency: 'GBP' });

            expect(res.status).toBe(200);
            expect(res.body.currency).toBe('GBP');
        });

        it('updates only the authenticated user (scoped by userId from token)', async () => {
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...mockUser,
                currency: 'USD',
            });

            await request(app)
                .patch('/api/users/me')
                .set('Authorization', AUTH)
                .send({ currency: 'USD' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'user-1' } }),
            );
        });

        it('returns 400 for an unknown currency code', async () => {
            const res = await request(app)
                .patch('/api/users/me')
                .set('Authorization', AUTH)
                .send({ currency: 'XYZ' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when currency field is missing', async () => {
            const res = await request(app)
                .patch('/api/users/me')
                .set('Authorization', AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it('accepts all supported currencies', async () => {
            const supported = ['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'CZK'];

            for (const currency of supported) {
                (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                    ...mockUser,
                    currency,
                });

                const res = await request(app)
                    .patch('/api/users/me')
                    .set('Authorization', AUTH)
                    .send({ currency });

                expect(res.status).toBe(200);
            }
        });
    });

    // ─── PATCH /api/users/me/acquisition-channel ──────────
    describe('PATCH /api/users/me/acquisition-channel', () => {
        it('persists the acquisition channel and returns the updated profile', async () => {
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...mockUser,
                acquisitionChannel: 'reddit',
            });

            const res = await request(app)
                .patch('/api/users/me/acquisition-channel')
                .set('Authorization', AUTH)
                .send({ acquisitionChannel: 'reddit' });

            expect(res.status).toBe(200);
            expect(res.body.acquisitionChannel).toBe('reddit');
        });

        it('updates only the authenticated user (scoped by userId from token)', async () => {
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...mockUser,
                acquisitionChannel: 'discord',
            });

            await request(app)
                .patch('/api/users/me/acquisition-channel')
                .set('Authorization', AUTH)
                .send({ acquisitionChannel: 'discord' });

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'user-1' },
                    data: { acquisitionChannel: 'discord' },
                }),
            );
        });

        it('accepts every channel of the closed list', async () => {
            for (const channel of ['reddit', 'discord', 'instagram', 'autre']) {
                (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                    ...mockUser,
                    acquisitionChannel: channel,
                });

                const res = await request(app)
                    .patch('/api/users/me/acquisition-channel')
                    .set('Authorization', AUTH)
                    .send({ acquisitionChannel: channel });

                expect(res.status).toBe(200);
            }
        });

        it('returns 400 for a channel outside the closed list', async () => {
            const res = await request(app)
                .patch('/api/users/me/acquisition-channel')
                .set('Authorization', AUTH)
                .send({ acquisitionChannel: 'tiktok' });

            expect(res.status).toBe(400);
            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it('returns 400 when the channel field is missing', async () => {
            const res = await request(app)
                .patch('/api/users/me/acquisition-channel')
                .set('Authorization', AUTH)
                .send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 with no Authorization header', async () => {
            const res = await request(app)
                .patch('/api/users/me/acquisition-channel')
                .send({ acquisitionChannel: 'reddit' });

            expect(res.status).toBe(401);
        });
    });
});
