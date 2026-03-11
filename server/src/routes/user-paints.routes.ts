// ──────────────────────────────────────────────────────────
// User Custom Paints Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// Allows authenticated users to manage their own private paints
// that are not part of the shared reference catalog.
// Brand is always conceptually "Other" — no PaintBrand FK.
//
// All business logic lives in user-paints.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as userPaintsService from '../services/user-paints.service';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/user-paints ────────────────────────────────

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paints = await userPaintsService.listPaints(userId);
        res.json(paints);
    }),
);

// ─── POST /api/user-paints ───────────────────────────────

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const paint = await userPaintsService.createPaint(userId, req.body);
        res.status(201).json(paint);
    }),
);

// ─── DELETE /api/user-paints/:id ─────────────────────────

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = req.params.id as string;
        await userPaintsService.deletePaint(userId, id);
        res.status(204).send();
    }),
);

export default router;