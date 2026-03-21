// ──────────────────────────────────────────────────────────
// Auth Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the auth routes:
//   POST /api/auth/signup  — validation, duplicate email, success
//   POST /api/auth/login   — validation, unknown user, wrong password, success
//   POST /api/auth/refresh — missing token, invalid JWT, not in DB, expired, success
//   POST /api/auth/logout  — with and without a refresh token
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken } from '../src/utils/jwt';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        refreshToken: {
            create: vi.fn(),
            findUnique: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
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

            const res = await request(app)
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

            await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
        });

        it('returns 409 when the email is already registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Email already registered');
        });

        it('returns 400 for an invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'not-an-email', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when password is shorter than 8 characters', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when both email and password are missing', async () => {
            const res = await request(app).post('/api/auth/signup').send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when email is missing', async () => {
            const res = await request(app)
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

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('passwordHash');
            expect(JSON.stringify(res.body)).not.toContain('password123');
        });

        it('does not expose the password value in Zod validation error details', async () => {
            const res = await request(app)
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

            const res = await request(app)
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

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpass1' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('returns 401 when the email is not registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nobody@example.com', password: 'password123' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('returns 400 for an invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'not-valid', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });

        it('returns 400 when password is too short', async () => {
            const res = await request(app)
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

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('passwordHash');
            expect(JSON.stringify(res.body)).not.toContain('password123');
            expect(JSON.stringify(res.body)).not.toContain('$hashed$');
        });

        it('does not expose the password value in Zod validation error details', async () => {
            const res = await request(app)
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

            await request(app)
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
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'rt-1',
                token: 'valid-refresh-token',
                expiresAt: new Date(Date.now() + 86400000),
            });
            (prisma.refreshToken.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app)
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
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'rt-1',
                token: 'valid-refresh-token',
                expiresAt: new Date(Date.now() + 86400000),
            });
            (prisma.refreshToken.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-token' });

            expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
            expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
        });

        it('returns 400 when refreshToken field is missing', async () => {
            const res = await request(app).post('/api/auth/refresh').send({});

            expect(res.status).toBe(400);
        });

        it('returns 401 when the JWT signature is invalid', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
                throw new Error('invalid signature');
            });

            const res = await request(app)
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
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
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
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'rt-1',
                token: 'expired-token',
                expiresAt: new Date(Date.now() - 1000), // in the past
            });

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'expired-token' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid or expired refresh token');
        });
    });

    // ─── LOGOUT ───────────────────────────────────────────
    describe('POST /api/auth/logout', () => {
        it('deletes the refresh token and returns 200', async () => {
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken: 'some-token' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Logged out');
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'some-token' },
            });
        });

        it('returns 200 even when no refreshToken is provided in the body', async () => {
            const res = await request(app).post('/api/auth/logout').send({});

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