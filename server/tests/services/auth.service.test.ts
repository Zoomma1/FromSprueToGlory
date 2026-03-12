// ──────────────────────────────────────────────────────────
// Auth Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma, bcryptjs, and jwt utils are mocked at module level.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
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

// ─── Mock JWT utils ───────────────────────────────────────
vi.mock('../../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('access-tok'),
    generateRefreshToken: vi.fn().mockReturnValue('refresh-tok'),
    verifyRefreshToken: vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' }),
}));

// ─── Mock bcryptjs ────────────────────────────────────────
vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed-pw'),
        compare: vi.fn().mockResolvedValue(true),
    },
}));

import { prisma } from '../../src/lib/prisma';
import { ConflictError, UnauthorizedError, ValidationError } from '../../src/lib/errors';
import { login, signup, refresh, logout } from '../../src/services/auth.service';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken } from '../../src/utils/jwt';

const sampleUser = {
    id: 'user-1',
    email: 'a@b.com',
    passwordHash: 'hashed-pw',
};

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const sampleStoredToken = {
    id: 'rt-1',
    token: 'refresh-tok',
    userId: 'user-1',
    expiresAt: futureDate,
};

describe('Auth Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Restore default mock return values after clearAllMocks
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed-pw');
        (verifyRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue({
            userId: 'user-1',
            email: 'a@b.com',
        });
    });

    // ─── login ────────────────────────────────────────────
    describe('login', () => {
        it('returns accessToken and refreshToken on valid credentials', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(sampleUser);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await login({ email: 'a@b.com', password: 'password123' });

            expect(result).toHaveProperty('accessToken', 'access-tok');
            expect(result).toHaveProperty('refreshToken', 'refresh-tok');
            expect(result.user).toEqual({ id: 'user-1', email: 'a@b.com' });
        });

        it('throws UnauthorizedError when user is not found', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(login({ email: 'no@one.com', password: 'password123' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws UnauthorizedError when password does not match', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(sampleUser);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

            await expect(login({ email: 'a@b.com', password: 'wrong-pw' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws ValidationError when email is missing', async () => {
            await expect(login({ password: 'password123' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when password is missing', async () => {
            await expect(login({ email: 'a@b.com' })).rejects.toThrow(ValidationError);
        });
    });

    // ─── signup ───────────────────────────────────────────
    describe('signup', () => {
        it('returns tokens and user object on successful signup', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleUser);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await signup({ email: 'new@user.com', password: 'password123' });

            expect(result).toHaveProperty('accessToken', 'access-tok');
            expect(result).toHaveProperty('refreshToken', 'refresh-tok');
            expect(result.user.email).toBe('a@b.com');
        });

        it('hashes the password before storing', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleUser);
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await signup({ email: 'new@user.com', password: 'password123' });

            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
        });

        it('throws ConflictError when email is already registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(sampleUser);

            await expect(signup({ email: 'a@b.com', password: 'password123' })).rejects.toThrow(
                ConflictError,
            );
        });

        it('throws ValidationError when email is invalid', async () => {
            await expect(signup({ email: 'not-an-email', password: 'password123' })).rejects.toThrow(
                ValidationError,
            );
        });

        it('throws ValidationError when password is too short', async () => {
            await expect(signup({ email: 'a@b.com', password: 'short' })).rejects.toThrow(
                ValidationError,
            );
        });
    });

    // ─── refresh ──────────────────────────────────────────
    describe('refresh', () => {
        it('returns new accessToken and refreshToken on valid token', async () => {
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
                sampleStoredToken,
            );
            (prisma.refreshToken.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await refresh({ refreshToken: 'refresh-tok' });

            expect(result).toHaveProperty('accessToken', 'access-tok');
            expect(result).toHaveProperty('refreshToken', 'refresh-tok');
        });

        it('deletes the old token before issuing new one', async () => {
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
                sampleStoredToken,
            );
            (prisma.refreshToken.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await refresh({ refreshToken: 'refresh-tok' });

            expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
        });

        it('throws UnauthorizedError when token is not in DB', async () => {
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(refresh({ refreshToken: 'unknown-tok' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws UnauthorizedError when token is expired in DB', async () => {
            const expiredToken = { ...sampleStoredToken, expiresAt: new Date(Date.now() - 1000) };
            (prisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
                expiredToken,
            );

            await expect(refresh({ refreshToken: 'refresh-tok' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws UnauthorizedError when JWT verification fails', async () => {
            (verifyRefreshToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
                throw new Error('jwt malformed');
            });

            await expect(refresh({ refreshToken: 'bad-sig-tok' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws ValidationError when refreshToken field is missing', async () => {
            await expect(refresh({})).rejects.toThrow(ValidationError);
        });
    });

    // ─── logout ───────────────────────────────────────────
    describe('logout', () => {
        it('deletes the refresh token and returns a message', async () => {
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
                count: 1,
            });

            const result = await logout({ refreshToken: 'refresh-tok' });

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'refresh-tok' },
            });
            expect(result).toEqual({ message: 'Logged out' });
        });

        it('returns a message without calling delete when no token is provided', async () => {
            const result = await logout({});

            expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
            expect(result).toEqual({ message: 'Logged out' });
        });
    });
});
