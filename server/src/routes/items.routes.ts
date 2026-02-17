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
    const userId = req.userId as string;
    const { status, gameSystemId, factionId, modelId, tags, search, sortBy, sortDir } = req.query;

    const where: Record<string, unknown> = { userId };
    if (status) (where as Record<string, unknown>).status = status as string;
    if (gameSystemId) (where as Record<string, unknown>).gameSystemId = gameSystemId as string;
    if (factionId) (where as Record<string, unknown>).factionId = factionId as string;
    if (modelId) (where as Record<string, unknown>).modelId = modelId as string;
    if (tags) {
        const tagList = (tags as string).split(',');
        // Use a non-any cast to keep ESLint happy
        (where as Record<string, unknown>).tags = { hasSome: tagList };
    }
    if (search) {
        (where as Record<string, unknown>).OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { notes: { contains: search as string, mode: 'insensitive' } },
        ];
    }

    // Sorting - whitelist supported fields to keep Prisma typing clean
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'price', 'quantity'];
    const sortField = (sortBy as string) || 'createdAt';
    const sortDirection = (sortDir as string) === 'asc' ? 'asc' : 'desc';

    // Use a typed, permissive orderBy structure instead of `any` to avoid ESLint warnings
    let orderBy: Record<string, 'asc' | 'desc'> | undefined;
    if (allowedSortFields.includes(sortField)) {
        // Build an orderBy object
        orderBy = { [sortField]: sortDirection as 'asc' | 'desc' };
    } else {
        // fallback
        orderBy = { createdAt: 'desc' };
    }

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
    const userId = req.userId as string;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
    const item = await prisma.item.findFirst({
        where: { id, userId },
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
    const userId = req.userId as string;
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
    const userId = req.userId as string;
    const parsed = updateItemSchema.safeParse(req.body);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    // Verify ownership
    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    const item = await prisma.item.update({
        where: { id },
        data: {
            ...parsed.data,
            purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
        },
    });

    res.json(item);
});

// ─── DELETE /api/items/:id — Delete item ────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    await prisma.item.delete({ where: { id } });
    res.status(204).send();
});

// ─── PATCH /api/items/:id/status — Change status ────────
// This is the KEY endpoint: it updates status AND creates history
router.patch('/:id/status', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const parsed = statusChangeSchema.safeParse(req.body);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
    }

    const existing = await prisma.item.findFirst({ where: { id, userId } });
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
            where: { id },
            data: { status: parsed.data.status },
        }),
        prisma.itemStatusHistory.create({
            data: {
                itemId: id,
                fromStatus: existing.status,
                toStatus: parsed.data.status,
            },
        }),
    ]);

    res.json(item);
});

// ─── GET /api/items/:id/history — Status history ────────
router.get('/:id/history', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Item not found' });
        return;
    }

    const history = await prisma.itemStatusHistory.findMany({
        where: { itemId: id },
        orderBy: { changedAt: 'desc' },
    });

    res.json(history);
});

export default router;
