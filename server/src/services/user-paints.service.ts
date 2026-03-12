// ──────────────────────────────────────────────────────────
// User Paints Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { NotFoundError, ValidationError } from '../lib/errors';

// Mirror of Prisma's PaintType enum — avoids importing from @prisma/client
// so tests don't require `prisma generate` to have run.
const PAINT_TYPES = [
    'BASE', 'LAYER', 'SHADE', 'DRY', 'CONTRAST', 'TECHNICAL',
    'AIR', 'METALLIC', 'INK', 'PRIMER', 'VARNISH', 'TEXTURE', 'OTHER',
] as const;

// ─── Zod Schema ───────────────────────────────────────────

export const createPaintSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(PAINT_TYPES).optional().nullable(),
    notes: z.string().optional().nullable(),
}).strict();

// ─── listPaints ───────────────────────────────────────────

export async function listPaints(userId: string) {
    return prisma.userCustomPaint.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── createPaint ──────────────────────────────────────────

export async function createPaint(userId: string, body: unknown) {
    const parsed = createPaintSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    return prisma.userCustomPaint.create({
        data: {
            userId,
            name: parsed.data.name,
            type: parsed.data.type ?? null,
            notes: parsed.data.notes ?? null,
        },
    });
}

// ─── deletePaint ──────────────────────────────────────────

export async function deletePaint(userId: string, id: string): Promise<void> {
    const existing = await prisma.userCustomPaint.findFirst({ where: { id, userId } });
    if (!existing) {
        throw new NotFoundError('Custom paint not found');
    }

    await prisma.userCustomPaint.delete({ where: { id } });
}