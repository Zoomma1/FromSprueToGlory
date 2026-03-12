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

// ─── getTechniques ────────────────────────────────────────

export async function getTechniques() {
    return prisma.technique.findMany({
        orderBy: { name: 'asc' },
    });
}
