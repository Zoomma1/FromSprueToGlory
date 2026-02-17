// ──────────────────────────────────────────────────────────
// 📚 Reference Routes — Read-only reference data
// ──────────────────────────────────────────────────────────
// These are public endpoints (no auth required) for reference data.
// Frontend loads these to populate dropdowns, filters, etc.
//
// WHY separate from items/schemes?
//   - Reference data is shared across all users
//   - Read-only: simpler endpoints, no mutations
//   - Easy to cache (CDN or service-worker)
//   - ALTERNATIVE: embed reference data in the frontend bundle (fast but rigid)
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/reference/game-systems
router.get('/game-systems', async (_req, res) => {
    const systems = await prisma.gameSystem.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { factions: true } } },
    });
    res.json(systems);
});

// GET /api/reference/factions?gameSystemId=xxx
router.get('/factions', async (req, res) => {
    const { gameSystemId } = req.query;
    const factions = await prisma.faction.findMany({
        where: gameSystemId ? { gameSystemId: gameSystemId as string } : {},
        orderBy: { name: 'asc' },
        include: { gameSystem: { select: { name: true, slug: true } } },
    });
    res.json(factions);
});

// GET /api/reference/models?factionId=xxx
router.get('/models', async (req, res) => {
    const { factionId } = req.query;
    const models = await prisma.model.findMany({
        where: factionId ? { factionId: factionId as string } : {},
        orderBy: { name: 'asc' },
        include: { faction: { select: { name: true } } },
    });
    res.json(models);
});

// GET /api/reference/paint-brands
router.get('/paint-brands', async (_req, res) => {
    const brands = await prisma.paintBrand.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { paints: true } } },
    });
    res.json(brands);
});

// GET /api/reference/paints?brandId=xxx
router.get('/paints', async (req, res) => {
    const { brandId, type } = req.query;
    const paints = await prisma.paint.findMany({
        where: {
            ...(brandId ? { brandId: brandId as string } : {}),
            ...(type ? { type: type as never } : {}),
        },
        orderBy: { name: 'asc' },
        include: { brand: { select: { name: true, slug: true } } },
    });
    res.json(paints);
});

// GET /api/reference/techniques
router.get('/techniques', async (_req, res) => {
    const techniques = await prisma.technique.findMany({
        orderBy: { name: 'asc' },
    });
    res.json(techniques);
});

export default router;
