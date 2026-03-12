// ──────────────────────────────────────────────────────────
// Admin Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import z from 'zod';
import { PaintType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/errors';

// ─── syncPaintsBodySchema ─────────────────────────────────

export const syncPaintsBodySchema = z.array(
    z.object({
        name: z.string().min(1),
        brandSlug: z.string().min(1),
        type: z.string().min(1),
        code: z.string().optional(),
    }).strict(),
).min(1);

// ─── Types ────────────────────────────────────────────────

interface SyncResult {
    created: number;
    skipped: number;
    errors: string[];
}

// ─── syncPaints ───────────────────────────────────────────

export async function syncPaints(body: unknown): Promise<SyncResult> {
    const parsed = syncPaintsBodySchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Expected a non-empty array of paints', parsed.error.flatten());
    }
    const rawArray = parsed.data;

    const results: SyncResult = { created: 0, skipped: 0, errors: [] };

    for (const paint of rawArray) {
        const { name, brandSlug, type, code } = paint;

        try {
            const brand = await prisma.paintBrand.findUnique({
                where: { slug: brandSlug },
            });

            if (!brand) {
                results.errors.push(`Unknown brand slug: ${brandSlug}`);
                continue;
            }

            const existing = await prisma.paint.findFirst({
                where: {
                    brandId: brand.id,
                    code: code ?? undefined,
                    name: name,
                },
            });

            if (existing) {
                results.skipped++;
                continue;
            }

            await prisma.paint.create({
                data: {
                    name,
                    code: code ?? null,
                    type: type as PaintType,
                    brandId: brand.id,
                },
            });

            results.created++;
        } catch (err) {
            results.errors.push(`Error on "${name}": ${(err as Error).message}`);
        }
    }

    return results;
}

// ─── exportPaints ─────────────────────────────────────────

export async function exportPaints() {
    const paints = await prisma.paint.findMany({
        include: { brand: true },
    });

    return paints.map((p: (typeof paints)[number]) => ({
        name: p.name,
        code: p.code,
        type: p.type,
        brandSlug: p.brand.slug,
    }));
}