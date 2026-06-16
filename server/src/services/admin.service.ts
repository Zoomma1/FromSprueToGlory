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

// ─── countAcquisitionChannels ─────────────────────────────
// Signup counts per acquisition channel, optionally scoped to a campaign
// period via ?from / ?to (ISO dates on User.createdAt). null channels
// (OAuth signups + skips) are reported as `unattributed`.

const ACQUISITION_CHANNELS = ['reddit', 'discord', 'instagram', 'autre'] as const;

export const acquisitionPeriodSchema = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
});

export async function countAcquisitionChannels(query: unknown) {
    const parsed = acquisitionPeriodSchema.safeParse(query);
    if (!parsed.success) {
        throw new ValidationError('Invalid date range', parsed.error.flatten());
    }
    const { from, to } = parsed.data;

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (from) createdAt.gte = from;
    if (to) createdAt.lte = to;
    const where = from || to ? { createdAt } : {};

    const groups = await prisma.user.groupBy({
        by: ['acquisitionChannel'],
        where,
        _count: { _all: true },
    });

    const counts: Record<string, number> = {
        ...Object.fromEntries(ACQUISITION_CHANNELS.map((c) => [c, 0])),
        unattributed: 0,
    };
    for (const group of groups) {
        const key = group.acquisitionChannel ?? 'unattributed';
        if (key in counts) counts[key] = group._count._all;
    }
    return counts;
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