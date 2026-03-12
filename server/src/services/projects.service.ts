// ──────────────────────────────────────────────────────────
// Projects Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';
import { STATUS_WEIGHT } from '../constants/status-weight';
import { paginationSchema } from '../lib/pagination';

// ─── Zod Schemas ──────────────────────────────────────────

export const createProjectSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
}).strict();

export const updateProjectSchema = createProjectSchema.partial();

// ─── Helpers ──────────────────────────────────────────────

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

// ─── ProjectSummary type ──────────────────────────────────

type ProjectSummary = {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    itemCount: number;
    completion: number;
    statusCounts: Record<string, number>;
};

// ─── listProjects ─────────────────────────────────────────

export async function listProjects(
    userId: string,
    filters: Record<string, string | undefined> = {},
): Promise<{ data: ProjectSummary[]; total: number }> {
    // Parse and validate pagination params
    const paginationParsed = paginationSchema.safeParse({
        limit: filters.limit,
        offset: filters.offset,
    });
    if (!paginationParsed.success) {
        throw new ValidationError('Invalid pagination parameters', paginationParsed.error.flatten());
    }
    const { limit, offset } = paginationParsed.data;

    const [projects, total] = await prisma.$transaction([
        prisma.project.findMany({
            where: { userId },
            include: {
                items: { select: { id: true, status: true, quantity: true } },
            },
            orderBy: { updatedAt: 'desc' },
            skip: offset,
            take: limit,
        }),
        prisma.project.count({ where: { userId } }),
    ]);

    type ProjectWithItems = (typeof projects)[number];

    const data = projects.map((p: ProjectWithItems) => ({
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
                (p.items ?? [])
                    .filter((i: ProjectWithItems['items'][number]) => i.status === s)
                    .reduce((sum: number, i: ProjectWithItems['items'][number]) => sum + i.quantity, 0),
            ]),
        ),
    }));

    return { data, total };
}

// ─── createProject ────────────────────────────────────────

export async function createProject(userId: string, body: unknown) {
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    return prisma.project.create({
        data: { ...parsed.data, userId },
    });
}

// ─── getProject ───────────────────────────────────────────

export async function getProject(userId: string, id: string) {
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
        throw new NotFoundError('Project not found');
    }

    return {
        ...project,
        completion: computeCompletion(project.items ?? []),
    };
}

// ─── updateProject ────────────────────────────────────────

export async function updateProject(userId: string, id: string, body: unknown) {
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Project not found');
    }

    return prisma.project.update({
        where: { id },
        data: parsed.data,
    });
}

// ─── deleteProject ────────────────────────────────────────

export async function deleteProject(userId: string, id: string): Promise<void> {
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Project not found');
    }

    await prisma.item.updateMany({
        where: { projectId: id },
        data: { projectId: null },
    });

    await prisma.project.delete({ where: { id } });
}

// ─── assignItems ──────────────────────────────────────────

export async function assignItems(userId: string, id: string, itemIds: unknown) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new ValidationError('itemIds array required');
    }

    const project = await prisma.project.findFirst({ where: { id, userId } });
    if (!project) {
        throw new NotFoundError('Project not found');
    }

    await prisma.item.updateMany({
        where: { id: { in: itemIds as string[] }, userId },
        data: { projectId: id },
    });

    return { assigned: (itemIds as string[]).length };
}

// ─── unassignItems ────────────────────────────────────────

export async function unassignItems(userId: string, id: string, itemIds: unknown) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new ValidationError('itemIds array required');
    }

    await prisma.item.updateMany({
        where: { id: { in: itemIds as string[] }, userId, projectId: id },
        data: { projectId: null },
    });

    return { unassigned: (itemIds as string[]).length };
}
