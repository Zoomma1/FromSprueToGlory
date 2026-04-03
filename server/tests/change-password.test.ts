// ──────────────────────────────────────────────────────────
// Change Password Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of PATCH /api/users/me/password:
//   - Auth middleware
//   - Validation (body schema)
//   - Wrong current password
//   - Google-only account (no passwordHash)
//   - Success path
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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
    default: {
        hash: vi.fn().mockResolvedValue('new-hashed-password'),
        compare: vi.fn(),
    },
}));

const app = createApp();
const AUTH = 'Bearer fake-token';
const VALID_BODY = { currentPassword: 'OldPass123', newPassword: 'NewPass456' };

describe('PATCH /api/users/me/password', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).patch('/api/users/me/password').send(VALID_BODY);
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });

            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired token');
        });
    });

    // ─── VALIDATION ───────────────────────────────────────
    describe('Validation', () => {
        it('returns 400 when currentPassword is missing', async () => {
            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send({ newPassword: 'NewPass456' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when newPassword is missing', async () => {
            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send({ currentPassword: 'OldPass123' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when newPassword is shorter than 8 characters', async () => {
            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send({ currentPassword: 'OldPass123', newPassword: 'short' });

            expect(res.status).toBe(400);
        });
    });

    // ─── BUSINESS LOGIC ───────────────────────────────────
    describe('Business logic', () => {
        it('returns 401 when current password is wrong', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                passwordHash: 'stored-hash',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Current password is incorrect');
        });

        it('returns 401 for a Google-only account (no passwordHash)', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                passwordHash: null,
            });

            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Please sign in with Google');
        });

        it('updates the password and returns 200 on success', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                passwordHash: 'stored-hash',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Password updated successfully');
        });

        it('updates only the authenticated user (scoped by userId from token)', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                passwordHash: 'stored-hash',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'user-1' } })
            );
        });

        it('hashes the new password before storing it', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                passwordHash: 'stored-hash',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(app)
                .patch('/api/users/me/password')
                .set('Authorization', AUTH)
                .send(VALID_BODY);

            expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456', 12);
            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { passwordHash: 'new-hashed-password' } })
            );
        });
    });
});
