// ──────────────────────────────────────────────────────────
// Admin Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// Admin-only seed routes. No auth middleware (keep as-is).
// All business logic lives in admin.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import * as adminService from '../services/admin.service';

const router = Router();

router.post(
    '/paints/sync',
    asyncHandler(async (req, res) => {
        const result = await adminService.syncPaints(req.body);
        res.status(200).json(result);
    }),
);

router.get(
    '/paints/export',
    asyncHandler(async (_req, res) => {
        const paints = await adminService.exportPaints();
        res.json(paints);
    }),
);

router.get(
    '/acquisition-channels',
    asyncHandler(async (req, res) => {
        const counts = await adminService.countAcquisitionChannels(req.query);
        res.json(counts);
    }),
);

export default router;