// ──────────────────────────────────────────────────────────
// Color Schemes Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../lib/prisma';
import { getS3Client } from '../lib/s3';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';

// ─── Zod Schemas ──────────────────────────────────────────

const mixEntrySchema = z
    .object({
        paintId: z.string().uuid().optional().nullable(),
        userCustomPaintId: z.string().uuid().optional().nullable(),
        ratio: z.number().min(0).max(100).optional().nullable(),
    })
    .strict()
    .refine((entry) => entry.paintId != null || entry.userCustomPaintId != null, {
        message: 'Each mix entry must have a paintId or userCustomPaintId',
    });

export const stepSchema = z
    .object({
        orderIndex: z.number().int().positive(),
        area: z.string().min(1),
        techniqueId: z.string().uuid(),
        paintId: z.string().uuid().optional().nullable(),
        userCustomPaintId: z.string().uuid().optional().nullable(),
        isMix: z.boolean().default(false),
        stepImageKey: z.string().optional().nullable(),
        mix: z.array(mixEntrySchema).optional().nullable(),
        dilution: z.string().optional().nullable(),
        tools: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        expectedResult: z.string().optional().nullable(),
    })
    .strict()
    .superRefine((step, ctx) => {
        if (step.isMix) {
            if (!step.mix || step.mix.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'mix must be a non-empty array when isMix is true',
                });
            }
            if (step.paintId != null || step.userCustomPaintId != null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'paintId and userCustomPaintId must be null when isMix is true',
                });
            }
        } else {
            if (step.mix && step.mix.length > 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'mix must be absent or empty when isMix is false',
                });
            }
        }
    });

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

function buildStepCreateData(step: z.infer<typeof stepSchema>) {
    const { mix, ...stepFields } = step;
    if (step.isMix && mix && mix.length > 0) {
        return { ...stepFields, mixEntries: { create: mix } };
    }
    return stepFields;
}

// ─── S3 helper ────────────────────────────────────────────
// Best-effort: logs on failure but never throws, so a missing S3 file
// does not block the DB deletion.

async function deleteS3Key(key: string): Promise<void> {
    const s3 = getS3Client();
    if (!s3) return;
    try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    } catch (err) {
        console.error(`S3 delete failed for key ${key}:`, err);
    }
}

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
                    mixEntries: {
                        include: {
                            paint: { include: { brand: { select: { name: true } } } },
                            userCustomPaint: true,
                        },
                    },
                },
            },
            images: { orderBy: { order: 'asc' } },
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
                create: steps.map(buildStepCreateData),
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

    const existing = await prisma.colorScheme.findFirst({ where: { id } });
    if (!existing) {
        throw new NotFoundError('Color scheme not found');
    }
    if (existing.userId !== userId) {
        throw new ForbiddenError();
    }

    const { steps, ...schemeData } = parsed.data;

    if (steps) {
        const orderError = validateStepOrder(steps);
        if (orderError) {
            throw new ValidationError(orderError);
        }

        // Clean up S3 files for step images that are no longer present
        const oldStepsWithImages = await prisma.colorSchemeStep.findMany({
            where: { colorSchemeId: id, stepImageKey: { not: null } },
            select: { stepImageKey: true },
        });
        const newStepKeys = new Set(steps.filter(s => s.stepImageKey).map(s => s.stepImageKey));
        const keysToDelete = oldStepsWithImages
            .map(s => s.stepImageKey!)
            .filter(key => !newStepKeys.has(key));
        await Promise.all(keysToDelete.map(deleteS3Key));

        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.colorSchemeStep.deleteMany({ where: { colorSchemeId: id } });
            return tx.colorScheme.update({
                where: { id },
                data: {
                    ...schemeData,
                    steps: { create: steps.map(buildStepCreateData) },
                },
                include: {
                    steps: {
                        orderBy: { orderIndex: 'asc' },
                        include: { mixEntries: true },
                    },
                },
            });
        });
    }

    return prisma.colorScheme.update({
        where: { id },
        data: schemeData,
        include: { steps: { orderBy: { orderIndex: 'asc' } } },
    });
}

// ─── addSchemeImage ───────────────────────────────────────

export const addSchemeImageSchema = z.object({
    key: z.string().min(1),
    order: z.number().int().nonnegative(),
}).strict();

export async function addSchemeImage(userId: string, schemeId: string, body: unknown) {
    const parsed = addSchemeImageSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }

    const scheme = await prisma.colorScheme.findFirst({ where: { id: schemeId } });
    if (!scheme) throw new NotFoundError('Color scheme not found');
    if (scheme.userId !== userId) throw new ForbiddenError();

    return prisma.colorSchemeImage.create({
        data: { colorSchemeId: schemeId, key: parsed.data.key, order: parsed.data.order },
    });
}

// ─── removeSchemeImage ────────────────────────────────────

export async function removeSchemeImage(
    userId: string,
    schemeId: string,
    imageId: string,
): Promise<void> {
    const scheme = await prisma.colorScheme.findFirst({ where: { id: schemeId } });
    if (!scheme) throw new NotFoundError('Color scheme not found');
    if (scheme.userId !== userId) throw new ForbiddenError();

    const image = await prisma.colorSchemeImage.findFirst({
        where: { id: imageId, colorSchemeId: schemeId },
    });
    if (!image) throw new NotFoundError('Image not found');

    await deleteS3Key(image.key);
    await prisma.colorSchemeImage.delete({ where: { id: imageId } });
}

// ─── deleteScheme ─────────────────────────────────────────

export async function deleteScheme(userId: string, id: string): Promise<void> {
    const existing = await prisma.colorScheme.findFirst({ where: { id } });
    if (!existing) {
        throw new NotFoundError('Color scheme not found');
    }
    if (existing.userId !== userId) {
        throw new ForbiddenError();
    }

    await prisma.colorScheme.delete({ where: { id } });
}