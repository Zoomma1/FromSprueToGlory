// ──────────────────────────────────────────────────────────
// Users Routes — Profile & Preferences
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import { ValidationError } from '../lib/errors';
import * as usersService from '../services/users.service';

// ─── Google Link Intent Store ─────────────────────────────
// Maps opaque token → userId. Entries expire after 5 minutes.

const googleLinkIntents = new Map<string, string>();

export function resolveGoogleLinkIntent(token: string): string | undefined {
    return googleLinkIntents.get(token);
}

const router = Router();
router.use(authMiddleware);

const updateSchema = z.object({
    currency: z.enum(['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'CZK']),
});

// ─── GET /api/users/me ────────────────────────────────────

router.get(
    '/me',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const profile = await usersService.getProfile(userId);
        res.json(profile);
    }),
);

// ─── PATCH /api/users/me ──────────────────────────────────

router.patch(
    '/me',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const parsed = updateSchema.safeParse(req.body);
        if (!parsed.success) throw new ValidationError('Invalid currency', parsed.error.errors);
        const profile = await usersService.updateCurrency(userId, parsed.data.currency);
        res.json(profile);
    }),
);

// ─── POST /api/users/me/google-link ──────────────────────

router.post(
    '/me/google-link',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const token = crypto.randomBytes(32).toString('hex');
        googleLinkIntents.set(token, userId);
        setTimeout(() => googleLinkIntents.delete(token), 5 * 60 * 1000);
        res.cookie('google_link_intent', token, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 5 * 60 * 1000, // 5 minutes — transit only
        });
        res.json({ redirectUrl: '/api/auth/google' });
    }),
);

export default router;
