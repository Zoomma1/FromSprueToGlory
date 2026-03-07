// ──────────────────────────────────────────────────────────
// Account Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the account route:
//   DELETE /api/account — cascading user deletion
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        item: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
        colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        colorSchemeStep: { deleteMany: vi.fn() },
        project: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        $transaction: vi.fn(),
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

describe('Account Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).delete('/api/account');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });

            const res = await request(app)
                .delete('/api/account')
                .set('Authorization', 'Bearer bad-token');

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired token');
        });
    });

    // ─── DELETE /api/account ──────────────────────────────
    describe('DELETE /api/account', () => {
        it('deletes the authenticated user and returns a confirmation message', async () => {
            (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'a@b.com',
            });

            const res = await request(app).delete('/api/account').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Account and all associated data deleted');
        });

        it('deletes only the authenticated user (scoped by userId from token)', async () => {
            (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(app).delete('/api/account').set('Authorization', AUTH);

            expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
        });

        it('uses the userId from the token, not from the request body', async () => {
            (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            // Even if a different userId is injected in the body, the route uses req.userId
            await request(app)
                .delete('/api/account')
                .set('Authorization', AUTH)
                .send({ userId: 'attacker-id' });

            expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
        });
    });
});