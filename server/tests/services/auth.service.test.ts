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
vi.mock('../../src/lib/email', () => ({
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
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
import { sendPasswordResetEmail } from '../../src/lib/email';
import { ConflictError, UnauthorizedError, ValidationError } from '../../src/lib/errors';
import { login, signup, refresh, logout, forgotPassword, resetPassword } from '../../src/services/auth.service';
import bcrypt from 'bcryptjs';
import { verifyRefreshToken } from '../../src/utils/jwt';

const sampleUser = {
    id: 'user-1',
    email: 'a@b.com',
    passwordHash: 'hashed-pw',
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
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await refresh({ refreshToken: 'refresh-tok' });

            expect(result).toHaveProperty('accessToken', 'access-tok');
            expect(result).toHaveProperty('refreshToken', 'refresh-tok');
        });

        it('deletes the old token before issuing new one', async () => {
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
            (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await refresh({ refreshToken: 'refresh-tok' });

            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
                where: { token: 'refresh-tok', expiresAt: { gt: expect.any(Date) } },
            });
        });

        it('throws UnauthorizedError when token is not in DB', async () => {
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

            await expect(refresh({ refreshToken: 'unknown-tok' })).rejects.toThrow(
                UnauthorizedError,
            );
        });

        it('throws UnauthorizedError when token is expired in DB', async () => {
            // Expired token won't match the expiresAt > now condition → count: 0
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

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

    // ─── forgotPassword ───────────────────────────────────
    describe('forgotPassword', () => {
        const genericMsg = 'If that email is registered, a reset link has been sent';

        it('returns generic message when email is not registered', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const result = await forgotPassword({ email: 'unknown@test.com' });

            expect(result.message).toBe(genericMsg);
            expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('returns generic message for Google-only accounts (no passwordHash)', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                passwordHash: null,
            });

            const result = await forgotPassword({ email: 'google@test.com' });

            expect(result.message).toBe(genericMsg);
            expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('creates a reset token and sends email when user has a password', async () => {
            (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'user-1',
                passwordHash: 'hashed-pw',
            });
            (prisma.passwordResetToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await forgotPassword({ email: 'a@b.com' });

            expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
                where: { userId: 'user-1', usedAt: null },
            });
            expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
            expect(sendPasswordResetEmail).toHaveBeenCalledWith('a@b.com', expect.stringContaining('/auth/reset-password?token='));
            expect(result.message).toBe(genericMsg);
        });

        it('throws ValidationError for an invalid email format', async () => {
            await expect(forgotPassword({ email: 'not-an-email' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when email is missing', async () => {
            await expect(forgotPassword({})).rejects.toThrow(ValidationError);
        });
    });

    // ─── resetPassword ────────────────────────────────────
    describe('resetPassword', () => {
        const validToken = {
            id: 'rt-1',
            userId: 'user-1',
            token: 'valid-token-hex',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            usedAt: null,
        };

        it('updates the password and marks the token as used', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validToken);
            (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.passwordResetToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (prisma.refreshToken.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const result = await resetPassword({ token: 'valid-token-hex', newPassword: 'newpass123' });

            expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
            expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'rt-1' }, data: { usedAt: expect.any(Date) } }),
            );
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
            expect(result.message).toBe('Password reset successfully');
        });

        it('throws ValidationError when token is not found in DB', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(resetPassword({ token: 'unknown', newPassword: 'newpass123' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when token is expired', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...validToken,
                expiresAt: new Date(Date.now() - 1000),
            });

            await expect(resetPassword({ token: 'expired-tok', newPassword: 'newpass123' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when token has already been used', async () => {
            (prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...validToken,
                usedAt: new Date(),
            });

            await expect(resetPassword({ token: 'used-tok', newPassword: 'newpass123' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when newPassword is too short', async () => {
            await expect(resetPassword({ token: 'valid-token-hex', newPassword: 'short' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when token field is missing', async () => {
            await expect(resetPassword({ newPassword: 'newpass123' })).rejects.toThrow(ValidationError);
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
