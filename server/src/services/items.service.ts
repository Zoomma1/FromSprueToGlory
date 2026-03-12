// ──────────────────────────────────────────────────────────
// Items Service — Business Logic Layer
// ──────────────────────────────────────────────────────────
// Contains all items business logic: validation, ownership checks,
// Prisma calls, and domain error throwing.
//
// WHY no Express imports?
//   Services are pure TypeScript — they accept plain values and
//   return plain values (or throw AppError subclasses). This makes
//   them testable without starting an HTTP server.
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';
import { paginationSchema } from '../lib/pagination';

// ─── Zod Schemas ──────────────────────────────────────────
export const createItemSchema = z.object({
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
}).strict();

export const updateItemSchema = createItemSchema.partial();

export const statusChangeSchema = z.object({
    status: z.enum(['WANT', 'BOUGHT', 'ASSEMBLED', 'WIP', 'FINISHED']),
}).strict();

// ─── listItems ────────────────────────────────────────────
export async function listItems(
    userId: string,
    filters: Record<string, string | undefined>,
): Promise<{ data: Awaited<ReturnType<typeof prisma.item.findMany>>; total: number }> {
    // Parse and validate pagination params
    const paginationParsed = paginationSchema.safeParse({
        limit: filters.limit,
        offset: filters.offset,
    });
    if (!paginationParsed.success) {
        throw new ValidationError('Invalid pagination parameters', paginationParsed.error.flatten());
    }
    const { limit, offset } = paginationParsed.data;

    const { status, gameSystemId, factionId, modelId, tags, search, sortBy, sortDir } = filters;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (gameSystemId) where.gameSystemId = gameSystemId;
    if (factionId) where.factionId = factionId;
    if (modelId) where.modelId = modelId;
    if (tags) {
        const tagList = tags.split(',');
        where.tags = { hasSome: tagList };
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
        ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'price', 'quantity'];
    const sortField = sortBy ?? 'createdAt';
    const sortDirection = sortDir === 'asc' ? 'asc' : 'desc';

    let orderBy: Record<string, 'asc' | 'desc'>;
    if (allowedSortFields.includes(sortField)) {
        orderBy = { [sortField]: sortDirection };
    } else {
        orderBy = { createdAt: 'desc' };
    }

    const [items, total] = await prisma.$transaction([
        prisma.item.findMany({
            where,
            orderBy,
            skip: offset,
            take: limit,
            include: {
                gameSystem: { select: { name: true, slug: true } },
                faction: { select: { name: true } },
                model: { select: { name: true } },
                colorScheme: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
            },
        }),
        prisma.item.count({ where }),
    ]);

    return { data: items, total };
}

// ─── getItem ──────────────────────────────────────────────
export async function getItem(userId: string, id: string) {
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
        throw new NotFoundError('Item not found');
    }

    return item;
}

// ─── createItem ───────────────────────────────────────────
export async function createItem(userId: string, body: unknown) {
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    return prisma.item.create({
        data: {
            ...parsed.data,
            userId,
            purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        },
    });
}

// ─── updateItem ───────────────────────────────────────────
export async function updateItem(userId: string, id: string, body: unknown) {
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Item not found');
    }

    return prisma.item.update({
        where: { id },
        data: {
            ...parsed.data,
            purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : undefined,
        },
    });
}

// ─── deleteItem ───────────────────────────────────────────
export async function deleteItem(userId: string, id: string): Promise<void> {
    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Item not found');
    }

    await prisma.item.delete({ where: { id } });
}

// ─── changeStatus ─────────────────────────────────────────
export async function changeStatus(userId: string, id: string, body: unknown) {
    const parsed = statusChangeSchema.safeParse(body);

    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Item not found');
    }

    if (existing.status === parsed.data.status) {
        throw new ValidationError(`Status is already ${parsed.data.status}`);
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

    return item;
}

// ─── getHistory ───────────────────────────────────────────
export async function getHistory(userId: string, id: string) {
    const existing = await prisma.item.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Item not found');
    }

    return prisma.itemStatusHistory.findMany({
        where: { itemId: id },
        orderBy: { changedAt: 'desc' },
    });
}
