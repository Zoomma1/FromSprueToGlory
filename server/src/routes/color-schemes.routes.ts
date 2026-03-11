// ──────────────────────────────────────────────────────────
// Color Schemes Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// Color schemes include ordered steps (the painting recipe).
// Steps are managed as a nested array: when creating/updating
// a scheme, you send the full steps array and we replace them.
//
// WHY replace-all strategy for steps?
//   - Simpler than individual step CRUD with reordering
//   - Frontend sends the complete ordered list after drag-drop
//   - No orphan steps or ordering conflicts
//   - ALTERNATIVE: individual step endpoints (PATCH /steps/:id/order, etc)
//     → more complex, harder to keep orderIndex consistent
//
// 🎯 MINI-EXERCISE: What happens if you send steps with duplicate
//    orderIndex values? Try it and check the error response.
//
// All business logic lives in color-schemes.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as colorSchemesService from '../services/color-schemes.service';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/color-schemes ──────────────────────────────

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const schemes = await colorSchemesService.listSchemes(userId);
        res.json(schemes);
    }),
);

// ─── GET /api/color-schemes/:id ──────────────────────────

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const scheme = await colorSchemesService.getScheme(userId, id);
        res.json(scheme);
    }),
);

// ─── POST /api/color-schemes ─────────────────────────────

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const scheme = await colorSchemesService.createScheme(userId, req.body);
        res.status(201).json(scheme);
    }),
);

// ─── PUT /api/color-schemes/:id ──────────────────────────

router.put(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const scheme = await colorSchemesService.updateScheme(userId, id, req.body);
        res.json(scheme);
    }),
);

// ─── DELETE /api/color-schemes/:id ───────────────────────

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await colorSchemesService.deleteScheme(userId, id);
        res.status(204).send();
    }),
);

export default router;