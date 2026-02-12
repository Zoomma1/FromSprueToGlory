// ──────────────────────────────────────────────────────────
// 🧪 Auth Route Tests
// ──────────────────────────────────────────────────────────
// Tests for signup, login, refresh, and logout endpoints.
// Prisma + bcrypt are mocked so no live database is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

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

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken } from '../src/utils/jwt';

const app = createApp();

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── SIGNUP ──────────────────────────────────
    describe('POST /api/auth/signup', () => {
        it('should create a user and return tokens', async () => {
            (prisma.user.findUnique as any).mockResolvedValue(null);
            (prisma.user.create as any).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.create as any).mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should return 409 for duplicate email', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(409);
            expect(res.body.error).toBe('Email already registered');
        });

        it('should return 400 for invalid input', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'bad', password: 'short' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });
    });

    // ─── LOGIN ───────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as any).mockResolvedValue(true);
            (prisma.refreshToken.create as any).mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });

        it('should return 401 for wrong password', async () => {
            (prisma.user.findUnique as any).mockResolvedValue({
                id: 'user-1',
                email: 'test@example.com',
                passwordHash: '$hashed$',
            });
            (bcrypt.compare as any).mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpass1' });

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('Invalid email or password');
        });

        it('should return 401 for unknown email', async () => {
            (prisma.user.findUnique as any).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'no@user.com', password: 'password123' });

            expect(res.status).toBe(401);
        });
    });

    // ─── REFRESH ─────────────────────────────────
    describe('POST /api/auth/refresh', () => {
        it('should return new tokens for valid refresh token', async () => {
            (verifyRefreshToken as any).mockReturnValue({
                userId: 'user-1',
                email: 'test@example.com',
            });
            (prisma.refreshToken.findUnique as any).mockResolvedValue({
                id: 'rt-1',
                token: 'valid-refresh-token',
                expiresAt: new Date(Date.now() + 86400000), // future
            });
            (prisma.refreshToken.delete as any).mockResolvedValue({});
            (prisma.refreshToken.create as any).mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'valid-refresh-token' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });

        it('should return 400 for missing refresh token', async () => {
            const res = await request(app)
                .post('/api/auth/refresh')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    // ─── LOGOUT ──────────────────────────────────
    describe('POST /api/auth/logout', () => {
        it('should return logged out message', async () => {
            (prisma.refreshToken.deleteMany as any).mockResolvedValue({});

            const res = await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken: 'some-token' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Logged out');
        });
    });
});
