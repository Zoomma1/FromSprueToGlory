// ──────────────────────────────────────────────────────────
// 📦 Items Routes — Pile of Shame CRUD
// ──────────────────────────────────────────────────────────
// Full CRUD for items + special status-change endpoint that
// automatically tracks status history.
//
// WHY a separate PATCH /status endpoint?
//   - Status changes have side-effects (history tracking)
//   - A generic PUT could accidentally bypass history
//   - Explicit intent: "I'm changing status" vs "I'm editing fields"
//   - ALTERNATIVE: trigger history in a Prisma middleware (implicit, harder to debug)
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All item routes require auth
router.use(authMiddleware);

// ─── Zod Schemas for validation ──────────────────────────
const createItemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    gameSystemId: z.string().uuid(),
    factionId: z.string().uuid(),
    modelId: z.string().uuid().optional().nullable(),
    points: z.number().int().positive().optional().nullable(),
    quantity: z.number().int().positive().default(1),
    purchaseDate: z.string().datetime().optional().nullable(),
    price: z.number().positive().optional().nullable(),
    currency: z.string().default('EUR'),
    store: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED']).default('WANT'),
    colorSchemeId: z.string().uuid().optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    photoKey: z.string().optional().nullable(),
});

const updateItemSchema = createItemSchema.partial();

const statusChangeSchema = z.object({
    status: z.enum(['WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED']),
});

// ─── GET /api/items — List items with filters ────────────
router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const { status, gameSystemId, factionId, modelId, tags, search, sortBy, sortDir } = req.query;

    // Build where clause dynamically
    const where: any = { userId };
    if (status) where.status = status;
    if (gameSystemId) where.gameSystemId = gameSystemId;
    if (factionId) where.factionId = factionId;
    if (modelId) where.modelId = modelId;
    if (tags) {
        const tagList = (tags as string).split(',');
        where.tags = { hasSome: tagList };
    }
    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { notes: { contains: search as string, mode: 'insensitive' } },
        ];
    }

    // Sorting
    const orderBy: any = {};
    const sortField = (sortBy as string) || 'createdAt';
    orderBy[sortField] = (sortDir as string) || 'desc';

    const items = await prisma.item.findMany({
        where,
        orderBy,
        include: {
            gameSystem: { select: { name: true, slug: true } },
            faction: { select: { name: true } },
            model: { select: { name: true } },
            colorScheme: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
        },
    });

    res.json(items);
});

// ─── GET /api/items/:id — Single item ────────────────────
router.get('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const item = await prisma.item.findFirst({
        where: { id: req.params.id, userId },
        include: {
            gameSystem: true,
            faction: true,
            model: true,
            colorScheme: { include: { steps: true } },
            statusHistory: { orderBy: { changedAt: 'desc' } },
        },
    });

    if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }
    res.json(item);
});

// ─── POST /api/items — Create item ──────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const parsed = createItemSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const item = await prisma.item.create({
        data: {
            ...parsed.data,
            userId,
            purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        },
    });

    res.status(201).json(item);
});

// ─── PUT /api/items/:id — Update item ───────────────────
router.put('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const parsed = updateItemSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    // Verify ownership
    const existing = await prisma.item.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    const item = await prisma.item.update({
        where: { id: req.params.id },
        data: {
            ...parsed.data,
            purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
        },
    });

    res.json(item);
});

// ─── DELETE /api/items/:id — Delete item ────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;

    const existing = await prisma.item.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    await prisma.item.delete({ where: { id: req.params.id } });
    res.status(204).send();
});

// ─── PATCH /api/items/:id/status — Change status ────────
// This is the KEY endpoint: it updates status AND creates history
router.patch('/:id/status', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    const parsed = statusChangeSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const existing = await prisma.item.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    if (existing.status === parsed.data.status) {
        res.status(400).json({ error: 'Status is already ' + parsed.data.status });
        return;
    }

    // Transaction: update status + create history entry atomically
    const [item] = await prisma.$transaction([
        prisma.item.update({
            where: { id: req.params.id },
            data: { status: parsed.data.status },
        }),
        prisma.itemStatusHistory.create({
            data: {
                itemId: req.params.id,
                fromStatus: existing.status,
                toStatus: parsed.data.status,
            },
        }),
    ]);

    res.json(item);
});

// ─── GET /api/items/:id/history — Status history ────────
router.get('/:id/history', async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;

    const existing = await prisma.item.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    const history = await prisma.itemStatusHistory.findMany({
        where: { itemId: req.params.id },
        orderBy: { changedAt: 'desc' },
    });

    res.json(history);
});

export default router;
