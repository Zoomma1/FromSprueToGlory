// ──────────────────────────────────────────────────────────
// Google Link Feature Tests
// ──────────────────────────────────────────────────────────
// Covers:
//   GET  /api/users/me        — hasGoogleLinked field
//   POST /api/users/me/google-link — link intent (cookie + redirect)
//   linkGoogle()              — service logic (direct unit test)
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import * as authService from '../src/services/auth.service';

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
    default: { hash: vi.fn(), compare: vi.fn() },
}));

const app = createApp();
const AUTH = 'Bearer fake-token';

// ─── Helpers ──────────────────────────────────────────────

function getCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie'] as string[] | string | undefined;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
}

// ═══════════════════════════════════════════════════════════

describe('Google Link Feature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── GET /api/users/me — hasGoogleLinked ──────────────
    describe('GET /api/users/me', () => {
        it('returns hasGoogleLinked: false when no Google account is linked', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com', currency: 'EUR', googleId: null,
            });

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.hasGoogleLinked).toBe(false);
        });

        it('returns hasGoogleLinked: true when a Google account is linked', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com', currency: 'EUR', googleId: 'google-abc',
            });

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.hasGoogleLinked).toBe(true);
        });

        it('does not expose the raw googleId in the response', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com', currency: 'EUR', googleId: 'google-abc',
            });

            const res = await request(app).get('/api/users/me').set('Authorization', AUTH);

            expect(res.body.googleId).toBeUndefined();
        });
    });

    // ─── POST /api/users/me/google-link ───────────────────
    describe('POST /api/users/me/google-link', () => {
        it('returns 401 without Authorization header', async () => {
            const res = await request(app).post('/api/users/me/google-link');
            expect(res.status).toBe(401);
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });

            const res = await request(app)
                .post('/api/users/me/google-link')
                .set('Authorization', 'Bearer bad-token');

            expect(res.status).toBe(401);
        });

        it('returns 200 with a redirectUrl pointing to the Google OAuth flow', async () => {
            const res = await request(app)
                .post('/api/users/me/google-link')
                .set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.redirectUrl).toContain('/api/auth/google');
        });

        it('sets a google_link_intent cookie containing the authenticated userId', async () => {
            const res = await request(app)
                .post('/api/users/me/google-link')
                .set('Authorization', AUTH);

            const cookies = getCookies(res);
            const linkCookie = cookies.find(c => c.startsWith('google_link_intent='));
            expect(linkCookie).toBeDefined();
            expect(linkCookie).toContain('user-1');
        });

        it('uses the userId from the token — not from the request body', async () => {
            const res = await request(app)
                .post('/api/users/me/google-link')
                .set('Authorization', AUTH)
                .send({ userId: 'attacker-id' });

            const cookies = getCookies(res);
            const linkCookie = cookies.find(c => c.startsWith('google_link_intent='));
            expect(linkCookie).toContain('user-1');
            expect(linkCookie).not.toContain('attacker-id');
        });

        it('sets the cookie with a short maxAge (5 minutes)', async () => {
            const res = await request(app)
                .post('/api/users/me/google-link')
                .set('Authorization', AUTH);

            const cookies = getCookies(res);
            const linkCookie = cookies.find(c => c.startsWith('google_link_intent='));
            // Max-Age=300 → 5 minutes
            expect(linkCookie).toContain('Max-Age=300');
        });
    });

    // ─── linkGoogle() — service unit tests ───────────────
    describe('linkGoogle()', () => {
        it('links a Google account to the user and returns tokens', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null); // googleId not taken
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await authService.linkGoogle('user-1', 'google-abc');

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { googleId: 'google-abc' },
                select: { id: true, email: true },
            });
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('throws ConflictError if the Google account is already linked to another user', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'other-user', email: 'other@b.com',
            });

            await expect(authService.linkGoogle('user-1', 'google-abc')).rejects.toMatchObject({
                statusCode: 409,
            });
            expect(prisma.user.update).not.toHaveBeenCalled();
        });

        it('allows re-linking the same Google account to the same user (idempotent)', async () => {
            // googleId already on this user — not a conflict
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com',
            });
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1', email: 'a@b.com',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await expect(authService.linkGoogle('user-1', 'google-abc')).resolves.toHaveProperty('accessToken');
        });
    });
});
