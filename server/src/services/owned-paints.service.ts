// ──────────────────────────────────────────────────────────
// Owned Paints Service — Business Logic Layer
// ──────────────────────────────────────────────────────────
// Manages the user's paint collection (owned + wishlist) and
// computes the status of each catalog paint for a given user.
//
// 4 statuses:
//   owned    — in UserOwnedPaint
//   need     — in a ColorSchemeStep for this user, not owned
//   toBuy    — in UserWishlistPaint OR need (not owned)
//   notOwned — not owned, not in any scheme, not in wishlist
// ──────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

export type PaintStatus = 'owned' | 'need' | 'toBuy' | 'notOwned';
export type PaintFilter = PaintStatus | undefined;

export interface PaintWithStatus {
    id: string;
    name: string;
    hex: string | null;
    type: string;
    code: string | null;
    brand: { id: string; name: string; slug: string };
    status: PaintStatus;
    neededForSchemes?: Array<{ id: string; name: string }>;
    similarOwned?: Array<{ id: string; name: string }>;
}

export interface PaintCollectionResult {
    paints: PaintWithStatus[];
    counts: { owned: number; need: number; toBuy: number; notOwned: number };
    hasMore: boolean;
}

// ─── listPaintsWithStatus ─────────────────────────────────

const PAGE_SIZE = 50;

export async function listPaintsWithStatus(
    userId: string,
    filter: PaintFilter,
    page = 1,
    limit = PAGE_SIZE,
): Promise<PaintCollectionResult> {
    const [allPaints, ownedRows, schemeSteps, wishlistRows] = await Promise.all([
        prisma.paint.findMany({
            orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
            include: { brand: true },
        }),
        prisma.userOwnedPaint.findMany({ where: { userId }, select: { paintId: true } }),
        prisma.colorSchemeStep.findMany({
            where: {
                paintId: { not: null },
                colorScheme: { userId },
            },
            select: { paintId: true, colorScheme: { select: { id: true, name: true } } },
        }),
        prisma.userWishlistPaint.findMany({ where: { userId }, select: { paintId: true } }),
    ]);

    const ownedSet = new Set(ownedRows.map(r => r.paintId));
    const wishlistSet = new Set(wishlistRows.map(r => r.paintId));

    // Reverse similarity lookup: paintId → owned paints that are similar
    const similarOwnedMap = new Map<string, Array<{ id: string; name: string }>>();
    if (ownedSet.size > 0) {
        const reverseLinks = await prisma.similarPaint.findMany({
            where: { similarPaintId: { in: Array.from(ownedSet) } },
            select: { paintId: true, similarPaint: { select: { id: true, name: true } } },
        });
        for (const link of reverseLinks) {
            const list = similarOwnedMap.get(link.paintId) ?? [];
            if (!list.some(p => p.id === link.similarPaint.id)) {
                list.push({ id: link.similarPaint.id, name: link.similarPaint.name });
            }
            similarOwnedMap.set(link.paintId, list);
        }
    }

    // Build need map: paintId → schemes that need it
    const needMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const step of schemeSteps) {
        if (!step.paintId) continue;
        if (ownedSet.has(step.paintId)) continue;
        const existing = needMap.get(step.paintId) ?? [];
        const scheme = step.colorScheme;
        if (scheme && !existing.some(s => s.id === scheme.id)) {
            existing.push({ id: scheme.id, name: scheme.name });
        }
        needMap.set(step.paintId, existing);
    }

    // Compute status for each paint
    const allWithStatus: PaintWithStatus[] = allPaints.map(paint => {
        let status: PaintStatus;
        if (ownedSet.has(paint.id)) {
            status = 'owned';
        } else if (needMap.has(paint.id)) {
            status = 'need';
        } else if (wishlistSet.has(paint.id)) {
            status = 'toBuy';
        } else {
            status = 'notOwned';
        }

        const result: PaintWithStatus = {
            id: paint.id,
            name: paint.name,
            hex: paint.hex ?? null,
            type: paint.type,
            code: paint.code ?? null,
            brand: { id: paint.brand.id, name: paint.brand.name, slug: paint.brand.slug },
            status,
        };

        if (status === 'need') {
            result.neededForSchemes = needMap.get(paint.id);
        }

        if (status !== 'owned') {
            const ownedSimilar = similarOwnedMap.get(paint.id);
            if (ownedSimilar?.length) {
                result.similarOwned = ownedSimilar;
            }
        }

        return result;
    });

    // Counts are always over the full unfiltered set
    const counts = {
        owned: allWithStatus.filter(p => p.status === 'owned').length,
        need: allWithStatus.filter(p => p.status === 'need').length,
        toBuy: allWithStatus.filter(p => p.status === 'need' || p.status === 'toBuy').length,
        notOwned: allWithStatus.filter(p => p.status === 'notOwned').length,
    };

    // Apply filter
    let filtered = allWithStatus;
    if (filter === 'owned') {
        filtered = allWithStatus.filter(p => p.status === 'owned');
    } else if (filter === 'need') {
        filtered = allWithStatus.filter(p => p.status === 'need');
    } else if (filter === 'toBuy') {
        filtered = allWithStatus.filter(p => p.status === 'need' || p.status === 'toBuy');
    } else if (filter === 'notOwned') {
        filtered = allWithStatus.filter(p => p.status === 'notOwned');
    }

    const skip = (page - 1) * limit;
    const paints = filtered.slice(skip, skip + limit);
    const hasMore = skip + limit < filtered.length;

    return { paints, counts, hasMore };
}

// ─── markAsOwned ──────────────────────────────────────────

export async function markAsOwned(userId: string, paintId: string): Promise<void> {
    const paint = await prisma.paint.findFirst({ where: { id: paintId } });
    if (!paint) throw new NotFoundError('Paint not found');

    await prisma.userOwnedPaint.create({ data: { userId, paintId } });
}

// ─── removeFromOwned ──────────────────────────────────────

export async function removeFromOwned(userId: string, paintId: string): Promise<void> {
    const existing = await prisma.userOwnedPaint.findUnique({
        where: { userId_paintId: { userId, paintId } },
    });
    if (!existing) throw new NotFoundError('Paint not in collection');

    await prisma.userOwnedPaint.delete({ where: { userId_paintId: { userId, paintId } } });
}

// ─── addToWishlist ────────────────────────────────────────

export async function addToWishlist(userId: string, paintId: string): Promise<void> {
    const paint = await prisma.paint.findFirst({ where: { id: paintId } });
    if (!paint) throw new NotFoundError('Paint not found');

    await prisma.userWishlistPaint.create({ data: { userId, paintId } });
}

// ─── removeFromWishlist ───────────────────────────────────

export async function removeFromWishlist(userId: string, paintId: string): Promise<void> {
    const existing = await prisma.userWishlistPaint.findUnique({
        where: { userId_paintId: { userId, paintId } },
    });
    if (!existing) throw new NotFoundError('Paint not in wishlist');

    await prisma.userWishlistPaint.delete({ where: { userId_paintId: { userId, paintId } } });
}
