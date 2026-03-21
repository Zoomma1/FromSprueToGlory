// ──────────────────────────────────────────────────────────
// Users Routes — Profile & Preferences
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import { ValidationError } from '../lib/errors';
import * as usersService from '../services/users.service';

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

export default router;
