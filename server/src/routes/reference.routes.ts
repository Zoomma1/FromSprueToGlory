// ──────────────────────────────────────────────────────────
// Reference Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// These are public endpoints (no auth required) for reference data.
// Frontend loads these to populate dropdowns, filters, etc.
//
// WHY separate from items/schemes?
//   - Reference data is shared across all users
//   - Read-only: simpler endpoints, no mutations
//   - Easy to cache (CDN or service-worker)
//   - ALTERNATIVE: embed reference data in the frontend bundle (fast but rigid)
//
// All business logic lives in reference.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import * as referenceService from '../services/reference.service';

const router = Router();

// GET /api/reference/game-systems
router.get(
    '/game-systems',
    asyncHandler(async (_req, res) => {
        const systems = await referenceService.getGameSystems();
        res.json(systems);
    }),
);

// GET /api/reference/factions?gameSystemId=xxx
router.get(
    '/factions',
    asyncHandler(async (req, res) => {
        const gameSystemId = req.query.gameSystemId as string | undefined;
        const factions = await referenceService.getFactions(gameSystemId);
        res.json(factions);
    }),
);

// GET /api/reference/models?factionId=xxx
router.get(
    '/models',
    asyncHandler(async (req, res) => {
        const factionId = req.query.factionId as string | undefined;
        const models = await referenceService.getModels(factionId);
        res.json(models);
    }),
);

// GET /api/reference/paint-brands
router.get(
    '/paint-brands',
    asyncHandler(async (_req, res) => {
        const brands = await referenceService.getPaintBrands();
        res.json(brands);
    }),
);

// GET /api/reference/paints?brandId=xxx
router.get(
    '/paints',
    asyncHandler(async (req, res) => {
        const brandId = req.query.brandId as string | undefined;
        const type = req.query.type as string | undefined;
        const paints = await referenceService.getPaints(brandId, type);
        res.json(paints);
    }),
);

// GET /api/reference/similar-paints
router.get(
    '/similar-paints',
    asyncHandler(async (_req, res) => {
        const rows = await referenceService.getAllSimilarPaints();
        res.json(rows);
    }),
);

// GET /api/reference/paints/:id/similar
router.get(
    '/paints/:id/similar',
    asyncHandler(async (req, res) => {
        const similarPaints = await referenceService.getSimilarPaints(req.params.id as string);
        res.json(similarPaints);
    }),
);

// GET /api/reference/techniques
router.get(
    '/techniques',
    asyncHandler(async (_req, res) => {
        const techniques = await referenceService.getTechniques();
        res.json(techniques);
    }),
);

export default router;
