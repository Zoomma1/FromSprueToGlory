// ──────────────────────────────────────────────────────────
// Auth Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import crypto from 'crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, TokenPayload, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';
import { sendPasswordResetEmail } from '../lib/email';

// ─── Zod Schemas ──────────────────────────────────────────

const signupSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = signupSchema;

const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

// ─── signup ───────────────────────────────────────────────

export async function signup(body: unknown) {
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
        throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
        data: { email: parsed.data.email, passwordHash },
        select: { id: true, email: true },
    });

    const payload = { userId: user.id, email: user.email };

    return issueToken(payload);
}

// ─── login ────────────────────────────────────────────────

export async function login(body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, email: true, passwordHash: true },
    });
    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.passwordHash) {
        throw new UnauthorizedError('Please sign in with Google');
    }

    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
        throw new UnauthorizedError('Invalid email or password');
    }

    const payload = { userId: user.id, email: user.email };

    return issueToken(payload);
}

// ─── refresh ──────────────────────────────────────────────

export async function refresh(body: unknown) {
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Refresh token is required');
    }

    let payload: { userId: string; email: string };
    try {
        payload = verifyRefreshToken(parsed.data.refreshToken);
    } catch {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const result = await prisma.refreshToken.deleteMany({
        where: {
            token: parsed.data.refreshToken,
            expiresAt: { gt: new Date() },
        },
    });

    if (result.count === 0) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const newPayload = { userId: payload.userId, email: payload.email };

    return issueToken(newPayload);
}

// ─── logout ───────────────────────────────────────────────

export async function logout(body: unknown) {
    const { refreshToken } = body as { refreshToken?: string };
    if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    return { message: 'Logged out' };
}

// ─── Google callback ───────────────────────────────────────

export async function handleGoogleCallback(googleId: string, email: string) {
    const user = await prisma.user.findUnique({
        where: { googleId: googleId },
        select: { id: true, email: true },
    });

    if (user) {
        const payload = {userId: user.id, email: user.email};
        return issueToken(payload);
    }

    const userWithoutGoogleId = await prisma.user.findUnique({
        where: {email: email},
        select: { id: true, email: true },
    });

    if (!userWithoutGoogleId) {
        const newUser = await prisma.user.create({
            data: { email: email, googleId },
            select: { id: true, email: true },
        });
        const payload = {userId: newUser.id, email: newUser.email};
        return issueToken(payload);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userWithoutGoogleId.id },
        data: { googleId: googleId },
        select: { id: true, email: true },
    });
    const payload = {userId: updatedUser.id, email: updatedUser.email};
    return issueToken(payload);
}

// ─── linkGoogle ───────────────────────────────────────────────

export async function linkGoogle(userId: string, googleId: string) {
    const existing = await prisma.user.findUnique({ where: { googleId } });
    if (existing && userId !== existing.id) {
        throw new ConflictError('This Google account is already linked to another user');
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { googleId },
        select: { id: true, email: true },
    });

    const payload = { userId: updatedUser.id, email: updatedUser.email };

    return issueToken(payload);
}


// ─── changePassword ───────────────────────────────────────────────

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function changePassword(userId: string, body: unknown) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });

    if (!user) {
        throw new UnauthorizedError('User not found');
    }

    if (!user.passwordHash) {
        throw new UnauthorizedError('Please sign in with Google');
    }

    const validPassword = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!validPassword) {
        throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully' };
}

// ─── forgotPassword ───────────────────────────────────────────────

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email'),
});

export async function forgotPassword(body: unknown) {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    // Always respond the same way — never reveal if an email is registered
    const genericResponse = { message: 'If that email is registered, a reset link has been sent' };

    const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true, passwordHash: true },
    });

    // No account, or Google-only account (no password) — silently no-op
    if (!user || !user.passwordHash) return genericResponse;

    // Remove any existing unused reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await sendPasswordResetEmail(parsed.data.email, resetUrl);

    return genericResponse;
}

// ─── resetPassword ────────────────────────────────────────────────

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function resetPassword(body: unknown) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: parsed.data.token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        throw new ValidationError('Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash: newHash },
        }),
        prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { usedAt: new Date() },
        }),
        // Invalidate all active sessions for security
        prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { message: 'Password reset successfully' };
}

// ─── Helper function ───────────────────────────────────────────────

async function issueToken(payload: TokenPayload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
        data: { token: refreshToken, userId: payload.userId, expiresAt },
    });
    return { accessToken, refreshToken, user: { id: payload.userId, email: payload.email } };
}