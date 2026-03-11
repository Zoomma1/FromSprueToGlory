// ──────────────────────────────────────────────────────────
// Color Schemes Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';

// ─── Zod Schemas ──────────────────────────────────────────

export const stepSchema = z.object({
    orderIndex: z.number().int().positive(),
    area: z.string().min(1),
    techniqueId: z.string().uuid(),
    paintId: z.string().uuid().optional().nullable(),
    userCustomPaintId: z.string().uuid().optional().nullable(),
    mix: z.string().optional().nullable(),
    dilution: z.string().optional().nullable(),
    tools: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    expectedResult: z.string().optional().nullable(),
}).strict();

export const createSchemeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    gameSystemId: z.string().uuid().optional().nullable(),
    factionId: z.string().uuid().optional().nullable(),
    description: z.string().optional().nullable(),
    referencePhotoKey: z.string().optional().nullable(),
    steps: z.array(stepSchema).min(1, 'At least one step is required'),
}).strict();

export const updateSchemeSchema = createSchemeSchema.partial().extend({
    steps: z.array(stepSchema).min(1).optional(),
}).strict();

// ─── Helpers ──────────────────────────────────────────────

function validateStepOrder(steps: z.infer<typeof stepSchema>[]): string | null {
    const indices = steps.map((s) => s.orderIndex).sort((a, b) => a - b);
    const unique = new Set(indices);
    if (unique.size !== indices.length) return 'Duplicate orderIndex values found';
    for (let i = 0; i < indices.length; i++) {
        if (indices[i] !== i + 1) return `orderIndex must be contiguous starting from 1 (gap at ${i + 1})`;
    }
    return null;
}

// ─── listSchemes ──────────────────────────────────────────

export async function listSchemes(userId: string) {
    return prisma.colorScheme.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            gameSystem: { select: { name: true } },
            faction: { select: { name: true } },
            _count: { select: { steps: true, items: true } },
        },
    });
}

// ─── getScheme ────────────────────────────────────────────

export async function getScheme(userId: string, id: string) {
    const scheme = await prisma.colorScheme.findFirst({
        where: { id, userId },
        include: {
            gameSystem: true,
            faction: true,
            steps: {
                orderBy: { orderIndex: 'asc' },
                include: {
                    technique: true,
                    paint: { include: { brand: { select: { name: true } } } },
                    userCustomPaint: true,
                },
            },
            items: { select: { id: true, name: true, status: true } },
        },
    });

    if (!scheme) {
        throw new NotFoundError('Color scheme not found');
    }

    return scheme;
}

// ─── createScheme ─────────────────────────────────────────

export async function createScheme(userId: string, body: unknown) {
    const parsed = createSchemeSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const orderError = validateStepOrder(parsed.data.steps);
    if (orderError) {
        throw new ValidationError(orderError);
    }

    const { steps, ...schemeData } = parsed.data;

    return prisma.colorScheme.create({
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
}

// ─── updateScheme ─────────────────────────────────────────

export async function updateScheme(userId: string, id: string, body: unknown) {
    const parsed = updateSchemeSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const existing = await prisma.colorScheme.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Color scheme not found');
    }

    const { steps, ...schemeData } = parsed.data;

    if (steps) {
        const orderError = validateStepOrder(steps);
        if (orderError) {
            throw new ValidationError(orderError);
        }

        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.colorSchemeStep.deleteMany({ where: { colorSchemeId: id } });
            return tx.colorScheme.update({
                where: { id },
                data: {
                    ...schemeData,
                    steps: { create: steps },
                },
                include: { steps: { orderBy: { orderIndex: 'asc' } } },
            });
        });
    }

    return prisma.colorScheme.update({
        where: { id },
        data: schemeData,
        include: { steps: { orderBy: { orderIndex: 'asc' } } },
    });
}

// ─── deleteScheme ─────────────────────────────────────────

export async function deleteScheme(userId: string, id: string): Promise<void> {
    const existing = await prisma.colorScheme.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Color scheme not found');
    }

    await prisma.colorScheme.delete({ where: { id } });
}