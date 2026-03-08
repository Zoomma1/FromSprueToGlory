// ──────────────────────────────────────────────────────────
// 🎨 User Custom Paints Routes
// ──────────────────────────────────────────────────────────
// Allows authenticated users to manage their own private paints
// that are not part of the shared reference catalog.
// Brand is always conceptually "Other" — no PaintBrand FK.
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// Mirror of Prisma's PaintType enum — avoids importing from @prisma/client
// so tests don't require `prisma generate` to have run.
const PAINT_TYPES = [
    'BASE', 'LAYER', 'SHADE', 'DRY', 'CONTRAST', 'TECHNICAL',
    'AIR', 'METALLIC', 'INK', 'PRIMER', 'VARNISH', 'TEXTURE', 'OTHER',
] as const;

// ─── Zod Schema ───────────────────────────────────────────
const createPaintSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(PAINT_TYPES).optional().nullable(),
    notes: z.string().optional().nullable(),
});

// ─── GET /api/user-paints ────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    const userId = req.userId as string;

    const paints = await prisma.userCustomPaint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json(paints);
});

// ─── POST /api/user-paints ───────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const parsed = createPaintSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const paint = await prisma.userCustomPaint.create({
        data: {
            userId,
            name: parsed.data.name,
            type: parsed.data.type ?? null,
            notes: parsed.data.notes ?? null,
        },
    });

    res.status(201).json(paint);
});

// ─── DELETE /api/user-paints/:id ─────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const id = req.params.id as string;

    const existing = await prisma.userCustomPaint.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Custom paint not found' });
        return;
    }

    await prisma.userCustomPaint.delete({ where: { id } });
    res.status(204).send();
});

export default router;