// ──────────────────────────────────────────────────────────
// Auth Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the auth routes:
//   POST /api/auth/signup  — validation, duplicate email, success
//   POST /api/auth/login   — validation, unknown user, wrong password, success
//   POST /api/auth/refresh — missing token, invalid JWT, not in DB, expired, success
//   POST /api/auth/logout  — with and without a refresh token
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken } from '../src/utils/jwt';
import * as authService from '../src/services/auth.service';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        refreshToken: {
            create: vi.fn(),
            findUnique: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
        passwordResetToken: {
            findUnique: vi.fn(),
            deleteMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
    },
}));

// ─── Mock email ───────────────────────────────────────────
vi.mock('../src/lib/email', () => ({
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock bcrypt ─────────────────────────────────────────
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('$hashed$'),
        compare: vi.fn(),
    },
}));

// ─── Mock JWT utils ──────────────────────────────────────
vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
}));

const app = createApp();
const server = app.listen(0);
afterAll(() => {
    server.close();
});

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── SIGNUP ──────────────────────────────────────────
    describe('POST /api/auth/signup', () => {
        it('creates a user and returns tokens with 201', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('stores the refresh token in the database after signup', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
        });

        it('returns 409 when the email is already registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });

            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Email already registered');
        });

        it('returns 400 for an invalid email format', async () => {
            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'not-an-email', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when password is shorter than 8 characters', async () => {
            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when both email and password are missing', async () => {
            const res = await request(server).post('/api/auth/signup').send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when email is missing', async () => {
            const res = await request(server)
                .post('/api/auth/signup')
                .send({ password: 'password123' });

            expect(res.status).toBe(400);
        });

        it('does not expose password or passwordHash in the success response', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('passwordHash');
            expect(JSON.stringify(res.body)).not.toContain('password123');
        });

        it('does not expose the password value in Zod validation error details', async () => {
            const res = await request(server)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'short' });

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).not.toContain('short');
        });
    });

    // ─── LOGIN ────────────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('logs in with valid credentials and returns tokens', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('returns 401 when the password is wrong', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpass1' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('returns 401 when the email is not registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'password123' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('returns 401 with a Google-specific message for Google-only accounts', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: null,
                googleId: 'google-123',
            });

            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'anypassword' });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/google/i);
        });

        it('returns 400 for an invalid email format', async () => {
            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'not-valid', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when password is too short', async () => {
            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'short' });

            expect(res.status).toBe(400);
        });

        it('does not expose password or passwordHash in the success response', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('passwordHash');
            expect(JSON.stringify(res.body)).not.toContain('password123');
            expect(JSON.stringify(res.body)).not.toContain('$hashed$');
        });

        it('does not expose the password value in Zod validation error details', async () => {
            const res = await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'short' });

            expect(res.status).toBe(400);
            expect(JSON.stringify(res.body)).not.toContain('short');
        });

        it('stores a new refresh token in the DB after login', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(server)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
        });
    });

    // ─── REFRESH ──────────────────────────────────────────
    describe('POST /api/auth/refresh', () => {
        it('returns new tokens for a valid refresh token', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue({
                userId: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-token' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });

        it('rotates the token: deletes old and creates new', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue({
                userId: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-token' });

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'valid-refresh-token', expiresAt: { gt: expect.any(Date) } },
            });
            expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
        });

        it('returns 400 when refreshToken field is missing', async () => {
            const res = await request(server).post('/api/auth/refresh').send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 when the JWT signature is invalid', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
                throw new Error('invalid signature');
            });

            const res = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'tampered-token' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired refresh token');
        });

        it('returns 401 when the token is not found in the database', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue({
                userId: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

            const res = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'unknown-token' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired refresh token');
        });

        it('returns 401 when the token is expired', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue({
                userId: 'user-1',
                email: 'test@example.com',
            });
            // Expired token won't match the expiresAt > now condition → count: 0
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

            const res = await request(server)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'expired-token' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired refresh token');
        });
    });

    // ─── handleGoogleCallback (service) ──────────────────
    // Tested directly (no HTTP) — the OAuth redirect can't be intercepted via supertest.
    // We verify the 3 business cases independently of the HTTP layer.
    describe('authService.handleGoogleCallback', () => {
        it('creates a new account when googleId and email are both unknown', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'new@example.com',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await authService.handleGoogleCallback('google-new', 'new@example.com');

            expect(prisma.user.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ googleId: 'google-new', email: 'new@example.com' }),
                }),
            );
            expect(result).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
        });

        it('logs in an existing Google user without creating a new account', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                id: 'user-1',
                email: 'test@example.com',
                googleId: 'google-123',
                passwordHash: null,
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await authService.handleGoogleCallback('google-123', 'test@example.com');

            expect(prisma.user.create).not.toHaveBeenCalled();
            expect(result).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
        });

        it('links googleId to an existing email-only account', async () => {
            // first lookup by googleId → not found, second by email → found
            (prisma.user.findUnique as ReturnType<typeof vi.fn>)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 'user-1', email: 'test@example.com', googleId: null, passwordHash: 'hashed' });
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                googleId: 'google-new',
            });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await authService.handleGoogleCallback('google-new', 'test@example.com');

            expect(prisma.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ googleId: 'google-new' }),
                }),
            );
            expect(result).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
        });
    });

    // ─── GET /api/auth/session ────────────────────────────
    describe('GET /api/auth/session', () => {
        const cookiePayload = JSON.stringify({
            accessToken: 'access-tok',
            refreshToken: 'refresh-tok',
            user: { id: 'user-1', email: 'test@example.com' },
        });

        it('returns 401 if no oauth_tokens cookie is present', async () => {
            const res = await request(server).get('/api/auth/session');
            expect(res.status).toBe(401);
        });

        it('returns tokens and clears the cookie when the cookie is valid', async () => {
            const res = await request(server)
                .get('/api/auth/session')
                .set('Cookie', `oauth_tokens=${encodeURIComponent(cookiePayload)}`);

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                accessToken: 'access-tok',
                refreshToken: 'refresh-tok',
                user: { id: 'user-1', email: 'test@example.com' },
            });

            // Cookie must be cleared in the response (value empty, expires in the past)
            const setCookie = res.headers['set-cookie'] as string[] | string | undefined;
            const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
            expect(cookies.some((c) => c.startsWith('oauth_tokens=;'))).toBe(true);
        });
    });

    // ─── FORGOT PASSWORD ──────────────────────────────────
    describe('POST /api/auth/forgot-password', () => {
        it('returns 200 with a generic message when the email exists', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                passwordHash: '$hashed$',
            });
            (prisma.passwordResetToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/forgot-password')
                .send({ email: 'test@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('If that email is registered, a reset link has been sent');
        });

        it('returns 200 with the same generic message when the email is not registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(server)
                .post('/api/auth/forgot-password')
                .send({ email: 'nobody@example.com' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('If that email is registered, a reset link has been sent');
        });

        it('returns 400 for an invalid email format', async () => {
            const res = await request(server)
                .post('/api/auth/forgot-password')
                .send({ email: 'not-an-email' });

            expect(res.status).toBe(400);
        });
    });

    // ─── RESET PASSWORD ───────────────────────────────────
    describe('POST /api/auth/reset-password', () => {
        const validToken = {
            id: 'prt-1',
            userId: 'user-1',
            token: 'valid-hex-token',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            usedAt: null,
        };

        it('returns 200 and resets the password on a valid token', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validToken);
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.passwordResetToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/reset-password')
                .send({ token: 'valid-hex-token', newPassword: 'newpass123' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Password reset successfully');
        });

        it('returns 400 when the token is not found in DB', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(server)
                .post('/api/auth/reset-password')
                .send({ token: 'unknown', newPassword: 'newpass123' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when the token is expired', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...validToken,
                expiresAt: new Date(Date.now() - 1000),
            });

            const res = await request(server)
                .post('/api/auth/reset-password')
                .send({ token: 'expired-token', newPassword: 'newpass123' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when the token has already been used', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...validToken,
                usedAt: new Date(),
            });

            const res = await request(server)
                .post('/api/auth/reset-password')
                .send({ token: 'used-token', newPassword: 'newpass123' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when newPassword is too short', async () => {
            const res = await request(server)
                .post('/api/auth/reset-password')
                .send({ token: 'valid-hex-token', newPassword: 'short' });

            expect(res.status).toBe(400);
        });
    });

    // ─── LOGOUT ───────────────────────────────────────────
    describe('POST /api/auth/logout', () => {
        it('deletes the refresh token and returns 200', async () => {
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(server)
                .post('/api/auth/logout')
                .send({ refreshToken: 'some-token' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Logged out');
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'some-token' },
            });
        });

        it('returns 200 even when no refreshToken is provided in the body', async () => {
            const res = await request(server).post('/api/auth/logout').send({});

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Logged out');
            // No token to delete — deleteMany should not be called
            expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
        });
    });
});

// ─── Auth Rate Limiting (ARL-01/02/03) ───────────────────
// Each test creates its own app instance so limiter state does not
// leak between tests. NODE_ENV is 'test' by default, so we pass
// skipAuthRateLimit: false to explicitly enable the limiter.
describe('Auth Rate Limiting (ARL-01/02/03)', () => {
    it('POST /api/auth/login — 11th request returns 429 (ARL-01)', async () => {
        const localApp = createApp({ skipAuthRateLimit: false });
        for (let i = 0; i < 10; i++) {
            await request(localApp).post('/api/auth/login').send({});
        }
        const res = await request(localApp).post('/api/auth/login').send({});
        expect(res.status).toBe(429);
    });

    it('POST /api/auth/signup — 11th request returns 429 (ARL-02)', async () => {
        const localApp = createApp({ skipAuthRateLimit: false });
        for (let i = 0; i < 10; i++) {
            await request(localApp).post('/api/auth/signup').send({});
        }
        const res = await request(localApp).post('/api/auth/signup').send({});
        expect(res.status).toBe(429);
    });

    it('POST /api/auth/refresh — 11th request returns 429 (ARL-03)', async () => {
        const localApp = createApp({ skipAuthRateLimit: false });
        for (let i = 0; i < 10; i++) {
            await request(localApp).post('/api/auth/refresh').send({});
        }
        const res = await request(localApp).post('/api/auth/refresh').send({});
        expect(res.status).toBe(429);
    });
});