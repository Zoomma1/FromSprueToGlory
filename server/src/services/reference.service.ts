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

export async function getPaints(brandId?: string, type?: string) {
    return prisma.paint.findMany({
        where: {
            ...(brandId ? { brandId } : {}),
            ...(type ? { type: type as never } : {}),
        },
        orderBy: { name: 'asc' },
        include: { brand: { select: { name: true, slug: true } } },
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
        orderBy: { similarPaint: { name: 'asc' } },
    });

    return rows.map((r) => ({
        id: r.similarPaint.id,
        name: r.similarPaint.name,
        type: r.similarPaint.type,
        code: r.similarPaint.code,
        source: r.source,
        brand: r.similarPaint.brand,
    }));
}

// ─── getAllSimilarPaints ──────────────────────────────────

export async function getAllSimilarPaints() {
    const paints = await prisma.paint.findMany({
        where: { similarities: { some: {} } },
        include: {
            brand: { select: { name: true, slug: true } },
            similarities: {
                include: {
                    similarPaint: {
                        include: { brand: { select: { id: true, name: true, slug: true } } },
                    },
                },
                orderBy: { similarPaint: { name: 'asc' } },
            },
        },
        orderBy: { name: 'asc' },
    });

    return paints.map((paint) => ({
        id: paint.id,
        name: paint.name,
        code: paint.code,
        brand: paint.brand,
        equivalents: paint.similarities.map((sp) => ({
            id: sp.similarPaint.id,
            name: sp.similarPaint.name,
            code: sp.similarPaint.code,
            source: sp.source,
            brand: sp.similarPaint.brand,
        })),
    }));
}

// ─── getTechniques ────────────────────────────────────────

export async function getTechniques() {
    return prisma.technique.findMany({
        orderBy: { name: 'asc' },
    });
}
