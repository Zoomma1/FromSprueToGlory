// ──────────────────────────────────────────────────────────
// Reference Service — Business Logic Layer
// ──────────────────────────────────────────────────────────
// Reference data is public (no user scoping).
// Functions take no userId parameter.
// ──────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

// ─── getGameSystems ───────────────────────────────────────

export async function getGameSystems() {
    return prisma.gameSystem.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { factions: true } } },
    });
}

// ─── getFactions ──────────────────────────────────────────

export async function getFactions(gameSystemId?: string) {
    return prisma.faction.findMany({
        where: gameSystemId ? { gameSystemId } : {},
        orderBy: { name: 'asc' },
        include: { gameSystem: { select: { name: true, slug: true } } },
    });
}

// ─── getModels ────────────────────────────────────────────

export async function getModels(factionId?: string) {
    return prisma.model.findMany({
        where: factionId ? { factionId } : {},
        orderBy: { name: 'asc' },
        include: { faction: { select: { name: true } } },
    });
}

// ─── getPaintBrands ───────────────────────────────────────

export async function getPaintBrands() {
    return prisma.paintBrand.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { paints: true } } },
    });
}

// ─── getPaints ────────────────────────────────────────────

export async function getPaints(brandId?: string, type?: string, q?: string) {
    return prisma.paint.findMany({
        where: {
            ...(brandId ? { brandId } : {}),
            ...(type ? { type: type as never } : {}),
            ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        },
        orderBy: { name: 'asc' },
        include: { brand: { select: { name: true, slug: true } } },
        ...(q ? { take: 20 } : {}),
    });
}

// ─── getSimilarPaints ─────────────────────────────────────

export async function getSimilarPaints(paintId: string) {
    const rows = await prisma.similarPaint.findMany({
        where: { paintId },
        include: {
            similarPaint: {
                include: { brand: { select: { id: true, name: true, slug: true } } },
            },
        },
        orderBy: { distance: { sort: 'asc', nulls: 'last' } },
    });

    return rows.map((r) => ({
        id: r.similarPaint.id,
        name: r.similarPaint.name,
        type: r.similarPaint.type,
        code: r.similarPaint.code,
        source: r.source,
        distance: r.distance,
        brand: r.similarPaint.brand,
    }));
}

// ─── getAllSimilarPaints ──────────────────────────────────

const CONVERTER_BRANDS = ['citadel', 'vallejo', 'army-painter', 'ak-interactive', 'green-stuff-world', 'scale75', 'p3', 'duncan', 'monument-hobby'];

export async function getAllSimilarPaints(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Query 1: paginated source paints (take limit+1 to detect hasMore without COUNT)
    const sourcePaints = await prisma.paint.findMany({
        where: {
            brand: { slug: { in: CONVERTER_BRANDS } },
            similarities: { some: { source: 'auto' } },
        },
        select: { id: true, name: true, code: true, brand: { select: { name: true, slug: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit + 1,
    });

    const hasMore = sourcePaints.length > limit;
    const page_paints = sourcePaints.slice(0, limit);

    if (page_paints.length === 0) return { data: [], hasMore: false };

    // Query 2: all similarities for this page's paints in one IN query
    const paintIds = page_paints.map((p) => p.id);
    const pairs = await prisma.similarPaint.findMany({
        where: { paintId: { in: paintIds }, source: 'auto' },
        include: { similarPaint: { include: { brand: { select: { id: true, name: true, slug: true } } } } },
        orderBy: { distance: { sort: 'asc', nulls: 'last' } },
    });

    // Group by source paint, keep top 5 per group (pairs already sorted by distance)
    const pairsByPaint = new Map<string, ReturnType<typeof mapEquivalent>[]>();
    for (const row of pairs) {
        const list = pairsByPaint.get(row.paintId) ?? [];
        if (list.length < 5) list.push(mapEquivalent(row));
        pairsByPaint.set(row.paintId, list);
    }

    const data = page_paints.map((paint) => ({
        id: paint.id,
        name: paint.name,
        code: paint.code,
        brand: paint.brand,
        equivalents: pairsByPaint.get(paint.id) ?? [],
    }));

    return { data, hasMore };
}

function mapEquivalent(row: { similarPaint: { id: string; name: string; code: string | null; brand: { id: string; name: string; slug: string } }; source: string | null; distance: number | null }) {
    return {
        id: row.similarPaint.id,
        name: row.similarPaint.name,
        code: row.similarPaint.code,
        source: row.source,
        distance: row.distance,
        brand: row.similarPaint.brand,
    };
}

// ─── getTechniques ────────────────────────────────────────

export async function getTechniques() {
    return prisma.technique.findMany({
        orderBy: { name: 'asc' },
    });
}
