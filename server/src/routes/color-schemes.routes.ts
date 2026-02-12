// ──────────────────────────────────────────────────────────
// 🎨 Color Schemes Routes — Painting recipes CRUD
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
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// ─── Zod Schemas ─────────────────────────────────────────
const stepSchema = z.object({
    orderIndex: z.number().int().positive(),
    area: z.string().min(1),
    techniqueId: z.string().uuid(),
    paintId: z.string().uuid().optional().nullable(),
    mix: z.string().optional().nullable(),
    dilution: z.string().optional().nullable(),
    tools: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    expectedResult: z.string().optional().nullable(),
});

const createSchemeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    gameSystemId: z.string().uuid().optional().nullable(),
    factionId: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    referencePhotoKey: z.string().optional().nullable(),
    steps: z.array(stepSchema).min(1, 'At least one step is required'),
});

const updateSchemeSchema = createSchemeSchema.partial().extend({
    steps: z.array(stepSchema).min(1).optional(),
});

// Validate steps have contiguous, unique orderIndex values
function validateStepOrder(steps: z.infer<typeof stepSchema>[]): string | null {
    const indices = steps.map((s) => s.orderIndex).sort((a, b) => a - b);
    const unique = new Set(indices);
    if (unique.size !== indices.length) return 'Duplicate orderIndex values found';
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] !== i + 1) return `orderIndex must be contiguous starting from 1 (gap at ${i + 1})`;
    }
    return null;
}

// ─── GET /api/color-schemes ──────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;

    const schemes = await prisma.colorScheme.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            gameSystem: { select: { name: true } },
            faction: { select: { name: true } },
            _count: { select: { steps: true, items: true } },
        },
    });

    res.json(schemes);
});

// ─── GET /api/color-schemes/:id ──────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;

    const scheme = await prisma.colorScheme.findFirst({
        where: { id: req.params.id, userId },
        include: {
            gameSystem: true,
            faction: true,
            steps: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    technique: true,
                    paint: { include: { brand: { select: { name: true } } } },
                },
            },
            items: { select: { id: true, name: true, status: true } },
        },
    });

    if (!scheme) {
        res.status(404).json({ error: 'Color scheme not found' });
        return;
    }
    res.json(scheme);
});

// ─── POST /api/color-schemes ─────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const parsed = createSchemeSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const orderError = validateStepOrder(parsed.data.steps);
    if (orderError) {
        res.status(400).json({ error: orderError });
        return;
    }

    const { steps, ...schemeData } = parsed.data;

    const scheme = await prisma.colorScheme.create({
        data: {
            ...schemeData,
            userId,
            steps: {
                create: steps,
            },
        },
        include: {
            steps: { orderBy: { orderIndex: 'asc' } },
        },
    });

    res.status(201).json(scheme);
});

// ─── PUT /api/color-schemes/:id ──────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const parsed = updateSchemeSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const existing = await prisma.colorScheme.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Color scheme not found' });
        return;
    }

    const { steps, ...schemeData } = parsed.data;

    if (steps) {
        const orderError = validateStepOrder(steps);
        if (orderError) {
            res.status(400).json({ error: orderError });
            return;
        }

        // Transaction: delete old steps, update scheme, create new steps
        const scheme = await prisma.$transaction(async (tx) => {
            await tx.colorSchemeStep.deleteMany({ where: { colorSchemeId: req.params.id } });
            return tx.colorScheme.update({
                where: { id: req.params.id },
                data: {
                    ...schemeData,
                    steps: { create: steps },
                },
                include: { steps: { orderBy: { orderIndex: 'asc' } } },
            });
        });

        res.json(scheme);
    } else {
        const scheme = await prisma.colorScheme.update({
            where: { id: req.params.id },
            data: schemeData,
            include: { steps: { orderBy: { orderIndex: 'asc' } } },
        });
        res.json(scheme);
    }
});

// ─── DELETE /api/color-schemes/:id ───────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;

    const existing = await prisma.colorScheme.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Color scheme not found' });
        return;
    }

    await prisma.colorScheme.delete({ where: { id: req.params.id } });
    res.status(204).send();
});

export default router;
