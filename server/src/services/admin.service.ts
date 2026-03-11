// ──────────────────────────────────────────────────────────
// Admin Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import type { PaintType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ValidationError } from '../lib/errors';

// ─── Types ────────────────────────────────────────────────

interface PaintSyncItem {
    name: string;
    brandSlug: string;
    type: string;
    code?: string | null;
}

interface SyncResult {
    created: number;
    skipped: number;
    errors: string[];
}

// ─── syncPaints ───────────────────────────────────────────

export async function syncPaints(body: unknown): Promise<SyncResult> {
    const rawBody = body;
    const rawArray = Array.isArray(rawBody)
        ? rawBody.map((item: unknown) => {
            const record = item as Record<string, unknown>;
            return record.json ? (record.json as PaintSyncItem) : (record as unknown as PaintSyncItem);
        })
        : [];

    if (rawArray.length === 0) {
        throw new ValidationError('Expected a non-empty array of paints');
    }

    const results: SyncResult = { created: 0, skipped: 0, errors: [] };

    for (const paint of rawArray) {
        const { name, brandSlug, type, code } = paint;

        if (!name || !brandSlug || !type) {
            results.errors.push(`Missing fields for paint: ${JSON.stringify(paint)}`);
            continue;
        }

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