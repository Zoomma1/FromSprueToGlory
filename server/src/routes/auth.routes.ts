// ──────────────────────────────────────────────────────────
// 🔐 Auth Routes — Signup / Login / Refresh / Logout
// ──────────────────────────────────────────────────────────
// JWT authentication with refresh token rotation.
//
// FLOW:
//   1. Signup: create user → return access + refresh tokens
//   2. Login: verify credentials → return access + refresh tokens
//   3. Refresh: exchange valid refresh token → new access + refresh tokens
//   4. Logout: delete refresh token from DB
//
// WHY refresh token rotation?
//   - Short-lived access tokens (15min) limit damage if stolen
//   - Refresh tokens are stored in DB and can be revoked
//   - ALTERNATIVE: long-lived access tokens (simpler but higher risk)
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt';

const router = Router();

const signupSchema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = signupSchema;

const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

// ─── POST /api/auth/signup ──────────────────────────────
router.post('/signup', async (req: Request, res: Response) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }

    // Hash password (bcrypt with salt rounds = 12)
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    // Create user
    const user = await prisma.user.create({
        data: { email: parsed.data.email, passwordHash },
    });

    // Generate tokens
    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt },
    });

    res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
});

// ─── POST /api/auth/login ───────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt },
    });

    res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email } });
});

// ─── POST /api/auth/refresh ─────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
    }

    try {
        // Verify the refresh token signature
        const payload = verifyRefreshToken(parsed.data.refreshToken);

        // Check if token exists in DB and is not expired
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: parsed.data.refreshToken },
        });

        if (!storedToken || storedToken.expiresAt < new Date()) {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // Rotation: delete old, create new
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });

        const newPayload = { userId: payload.userId, email: payload.email };
        const newAccessToken = generateAccessToken(newPayload);
        const newRefreshToken = generateRefreshToken(newPayload);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.refreshToken.create({
            data: { token: newRefreshToken, userId: payload.userId, expiresAt },
        });

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch {
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// ─── POST /api/auth/logout ──────────────────────────────
router.post('/logout', async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out' });
});

export default router;
