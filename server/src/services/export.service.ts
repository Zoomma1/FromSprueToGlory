// ──────────────────────────────────────────────────────────
// Export Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import z from 'zod';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/errors';

// ─── exportQuerySchema ────────────────────────────────────

export const exportQuerySchema = z.object({
    format: z.enum(['json', 'csv']).default('json'),
}).strict();

// ─── exportItems ──────────────────────────────────────────

export async function exportItems(
    userId: string,
    query: unknown,
): Promise<{ type: 'json'; items: unknown[] } | { type: 'csv'; csv: string; filename: string }> {
    const parsed = exportQuerySchema.safeParse(query);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }
    const { format } = parsed.data;

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
        const headers =
            'name,status,gameSystem,faction,model,quantity,price,currency,store,tags,notes,purchaseDate,createdAt';

        type ItemWithIncludes = (typeof items)[number];

        const rows = items.map((i: ItemWithIncludes) =>
            [
                `"${i.name}"`,
                i.status,
                `"${i.gameSystem.name}"`,
                `"${i.faction.name}"`,
                `"${i.model?.name || ''}"`,
                i.quantity,
                i.price ?? '',
                i.currency,
                `"${i.store || ''}"`,
                `"${i.tags.join(';')}"`,
                `"${(i.notes || '').replace(/"/g, '""')}"`,
                i.purchaseDate?.toISOString() || '',
                i.createdAt.toISOString(),
            ].join(','),
        );

        const csv = [headers, ...rows].join('\n');
        return { type: 'csv', csv, filename: 'pile-of-shame.csv' };
    }

    return { type: 'json', items };
}

// ─── exportColorSchemes ───────────────────────────────────

export async function exportColorSchemes(userId: string) {
    return prisma.colorScheme.findMany({
        where: { userId },
        include: {
            steps: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    technique: { select: { name: true } },
                    paint: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}