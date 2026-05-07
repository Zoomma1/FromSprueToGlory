// ──────────────────────────────────────────────────────────
// Owned Paints Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// GET    /api/paints              — catalog with user status
// POST   /api/paints/owned/:id   — mark as owned
// DELETE /api/paints/owned/:id   — remove from owned
// POST   /api/paints/wishlist/:id — add to wishlist
// DELETE /api/paints/wishlist/:id — remove from wishlist
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as ownedPaintsService from '../services/owned-paints.service';
import type { PaintFilter } from '../services/owned-paints.service';

const router = Router();
router.use(authMiddleware);

const VALID_FILTERS: PaintFilter[] = ['owned', 'need', 'toBuy', 'notOwned'];

// ─── GET /api/paints ─────────────────────────────────────

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const rawFilter = req.query.filter as string | undefined;
        const filter: PaintFilter =
            rawFilter && (VALID_FILTERS as string[]).includes(rawFilter)
                ? (rawFilter as PaintFilter)
                : undefined;

        const search = (req.query.search as string | undefined)?.trim() || undefined;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const result = await ownedPaintsService.listPaintsWithStatus(userId, filter, page, limit, search);
        res.json(result);
    }),
);

// ─── POST /api/paints/owned/:paintId ─────────────────────

router.post(
    '/owned/:paintId',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paintId = req.params['paintId'] as string;
        await ownedPaintsService.markAsOwned(userId, paintId);
        res.status(201).json({ paintId });
    }),
);

// ─── DELETE /api/paints/owned/:paintId ───────────────────

router.delete(
    '/owned/:paintId',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paintId = req.params['paintId'] as string;
        await ownedPaintsService.removeFromOwned(userId, paintId);
        res.status(204).send();
    }),
);

// ─── POST /api/paints/wishlist/:paintId ──────────────────

router.post(
    '/wishlist/:paintId',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paintId = req.params['paintId'] as string;
        await ownedPaintsService.addToWishlist(userId, paintId);
        res.status(201).json({ paintId });
    }),
);

// ─── DELETE /api/paints/wishlist/:paintId ────────────────

router.delete(
    '/wishlist/:paintId',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paintId = req.params['paintId'] as string;
        await ownedPaintsService.removeFromWishlist(userId, paintId);
        res.status(204).send();
    }),
);

export default router;
