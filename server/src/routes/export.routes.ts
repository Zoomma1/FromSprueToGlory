// ──────────────────────────────────────────────────────────
// 📤 Export Routes — JSON/CSV export of user data
// ──────────────────────────────────────────────────────────
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/export/items?format=json|csv ───────────────
router.get('/items', async (req: Request, res: Response) => {

    const userId = req.userId as string;
    const format = (req.query.format as string) || 'json';

    const items = await prisma.item.findMany({
        where: { userId },
        include: {
            gameSystem: { select: { name: true } },
            faction: { select: { name: true } },
            model: { select: { name: true } },
            colorScheme: { select: { name: true } },
            statusHistory: { orderBy: { changedAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
        const headers = 'name,status,gameSystem,faction,model,quantity,price,currency,store,tags,notes,purchaseDate,createdAt';
        type ItemWithIncludes = (typeof items)[number];

        const rows = items.map((i: ItemWithIncludes) =>
            [
                `"${i.name}"`, i.status, `"${i.gameSystem.name}"`, `"${i.faction.name}"`,
                `"${i.model?.name || ''}"`, i.quantity, i.price ?? '', i.currency,
                `"${i.store || ''}"`, `"${i.tags.join(';')}"`, `"${(i.notes || '').replace(/"/g, '""')}"`,
                i.purchaseDate?.toISOString() || '', i.createdAt.toISOString(),
            ].join(','),
        );

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=pile-of-shame.csv');
        res.send([headers, ...rows].join('\n'));
    } else {
        res.json(items);
    }
});

// ─── GET /api/export/color-schemes ───────────────────────
router.get('/color-schemes', async (req: Request, res: Response) => {
    const userId = req.userId as string;

    const schemes = await prisma.colorScheme.findMany({
        where: { userId },
        include: {
            steps: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    technique: { select: { name: true } },
                    paint: { select: { name: true }, },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    res.json(schemes);
});

export default router;
