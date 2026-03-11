// ──────────────────────────────────────────────────────────
// Export Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// All business logic lives in export.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as exportService from '../services/export.service';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/export/items?format=json|csv ───────────────

router.get(
    '/items',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const format = (req.query.format as string) || 'json';

        const result = await exportService.exportItems(userId, format);

        if (result.type === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
            res.send(result.csv);
        } else {
            res.json(result.items);
        }
    }),
);

// ─── GET /api/export/color-schemes ───────────────────────

router.get(
    '/color-schemes',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const schemes = await exportService.exportColorSchemes(userId);
        res.json(schemes);
    }),
);

export default router;