// ──────────────────────────────────────────────────────────
// 📁 Projects Routes — Group items into projects with completion %
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// ─── Zod Schemas ─────────────────────────────────────────

const createProjectSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
});

const updateProjectSchema = createProjectSchema.partial();

// ─── Status weights for completion calculation ───────────
const STATUS_WEIGHT: Record<string, number> = {
    WANT: 0,
    BOUGHT: 25,
    ASSEMBLED: 50,
    WIP: 75,
    FINISHED: 100,
};

function computeCompletion(items: { status: string; quantity: number }[]): number {
    if (items.length === 0) return 0;
    let totalWeight = 0;
    let totalQty = 0;
    for (const item of items) {
        const w = STATUS_WEIGHT[item.status] ?? 0;
        totalWeight += w * item.quantity;
        totalQty += item.quantity;
    }
    if (totalQty === 0) return 0;
    return Math.round(totalWeight / totalQty);
}

// ─── GET /api/projects — List projects with completion ───

router.get('/', async (req: Request, res: Response) => {
    const userId = req.userId as string;

    const projects = await prisma.project.findMany({
        where: { userId },
        include: {
            items: { select: { id: true, status: true, quantity: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    type ProjectWithItems = (typeof projects)[number];

    const result = projects.map((p: ProjectWithItems) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        itemCount: (p.items ?? []).length,
        completion: computeCompletion(p.items ?? []),
        statusCounts: Object.fromEntries(
            Object.keys(STATUS_WEIGHT).map((s) => [
                s,
                (p.items ?? []).filter((i: ProjectWithItems['items'][number]) => i.status === s).reduce((sum: number, i: ProjectWithItems['items'][number]) => sum + i.quantity, 0),
            ]),
        ),
    }));

    res.json(result);
});

// ─── POST /api/projects — Create project ─────────────────

router.post('/', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const parsed = createProjectSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    const project = await prisma.project.create({
        data: { ...parsed.data, userId },
    });

    res.status(201).json(project);
});

// ─── GET /api/projects/:id — Single project with items ───

router.get('/:id', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
            items: {
                include: {
                    gameSystem: { select: { id: true, name: true } },
                    faction: { select: { id: true, name: true } },
                },
                orderBy: { updatedAt: 'desc' },
            },
        },
    });

    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }

    res.json({
        ...project,
        completion: computeCompletion(project.items ?? []),
    });
});

// ─── PUT /api/projects/:id — Update project ──────────────

router.put('/:id', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const parsed = updateProjectSchema.safeParse(req.body);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }

    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }

    const project = await prisma.project.update({
        where: { id },
        data: parsed.data,
    });

    res.json(project);
});

// ─── DELETE /api/projects/:id — Delete project ───────────

router.delete('/:id', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }

    // Nullify projectId on all items first, then delete
    await prisma.item.updateMany({
        where: { projectId: id },
        data: { projectId: null },
    });

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
});

// ─── POST /api/projects/:id/assign — Assign items ────────

router.post('/:id/assign', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const { itemIds } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        res.status(400).json({ error: 'itemIds array required' });
        return;
    }

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }

    await prisma.item.updateMany({
        where: { id: { in: itemIds }, userId },
        data: { projectId: id },
    });

    res.json({ assigned: itemIds.length });
});

// ─── POST /api/projects/:id/unassign — Unassign items ────

router.post('/:id/unassign', async (req: Request, res: Response) => {
    const userId = req.userId as string;
    const { itemIds } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        res.status(400).json({ error: 'itemIds array required' });
        return;
    }

    await prisma.item.updateMany({
        where: { id: { in: itemIds }, userId, projectId: id },
        data: { projectId: null },
    });

    res.json({ unassigned: itemIds.length });
});

export default router;
