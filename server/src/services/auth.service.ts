// ──────────────────────────────────────────────────────────
// Auth Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken, TokenPayload, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';

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

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: parsed.data.refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

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