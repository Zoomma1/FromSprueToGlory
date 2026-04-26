// ──────────────────────────────────────────────────────────
// Owned Paints Service Unit Tests
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        paint: { findMany: vi.fn(), findFirst: vi.fn() },
        userOwnedPaint: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
        userWishlistPaint: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
        colorSchemeStep: { findMany: vi.fn() },
        similarPaint: { findMany: vi.fn() },
    },
}));

import { prisma } from '../../src/lib/prisma';
import { NotFoundError } from '../../src/lib/errors';
import {
    listPaintsWithStatus,
    markAsOwned,
    removeFromOwned,
    addToWishlist,
    removeFromWishlist,
} from '../../src/services/owned-paints.service';

const PAINT_1 = { id: 'paint-1', name: 'Abaddon Black', hex: null, type: 'BASE', code: null, notes: null, brandId: 'brand-1', brand: { id: 'brand-1', name: 'Citadel', slug: 'citadel' } };
const PAINT_2 = { id: 'paint-2', name: 'Mephiston Red', hex: '#A30000', type: 'BASE', code: null, notes: null, brandId: 'brand-1', brand: { id: 'brand-1', name: 'Citadel', slug: 'citadel' } };
const PAINT_3 = { id: 'paint-3', name: 'Agrax Earthshade', hex: null, type: 'SHADE', code: null, notes: null, brandId: 'brand-1', brand: { id: 'brand-1', name: 'Citadel', slug: 'citadel' } };
const PAINT_4 = { id: 'paint-4', name: 'Retributor Armour', hex: '#C9A84C', type: 'METALLIC', code: null, notes: null, brandId: 'brand-1', brand: { id: 'brand-1', name: 'Citadel', slug: 'citadel' } };

describe('Owned Paints Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (prisma.similarPaint as any).findMany.mockResolvedValue([]);
    });

    // ─── listPaintsWithStatus ─────────────────────────────
    describe('listPaintsWithStatus', () => {
        it('assigns status "owned" to paints in UserOwnedPaint', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await listPaintsWithStatus('user-1', undefined);

            const owned = result.paints.find(p => p.id === 'paint-1');
            const notOwned = result.paints.find(p => p.id === 'paint-2');
            expect(owned?.status).toBe('owned');
            expect(notOwned?.status).toBe('notOwned');
        });

        it('assigns status "need" to paints in color scheme steps but not owned', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { paintId: 'paint-1', colorScheme: { id: 'scheme-1', name: 'Blood Angels' } },
            ]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await listPaintsWithStatus('user-1', undefined);

            const need = result.paints.find(p => p.id === 'paint-1');
            expect(need?.status).toBe('need');
            expect(need?.neededForSchemes).toEqual([{ id: 'scheme-1', name: 'Blood Angels' }]);
        });

        it('assigns status "toBuy" to paints in wishlist but not owned or needed', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-2' }]);

            const result = await listPaintsWithStatus('user-1', undefined);

            const toBuy = result.paints.find(p => p.id === 'paint-2');
            expect(toBuy?.status).toBe('toBuy');
        });

        it('"need" paints also appear in "toBuy" filter', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2, PAINT_3]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { paintId: 'paint-1', colorScheme: { id: 'scheme-1', name: 'Blood Angels' } },
            ]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-2' }]);

            const result = await listPaintsWithStatus('user-1', 'toBuy');

            expect(result.paints.map(p => p.id)).toContain('paint-1'); // need → included in toBuy
            expect(result.paints.map(p => p.id)).toContain('paint-2'); // wishlist
            expect(result.paints.map(p => p.id)).not.toContain('paint-3'); // plain notOwned → excluded
        });

        it('returns correct counts', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2, PAINT_3, PAINT_4]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { paintId: 'paint-2', colorScheme: { id: 'scheme-1', name: 'BA' } },
            ]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-3' }]);

            const result = await listPaintsWithStatus('user-1', undefined);

            expect(result.counts).toEqual({ owned: 1, need: 1, toBuy: 2, notOwned: 1 });
        });

        it('filters to only "owned" paints when filter=owned', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await listPaintsWithStatus('user-1', 'owned');

            expect(result.paints).toHaveLength(1);
            expect(result.paints[0].id).toBe('paint-1');
        });

        it('includes similarOwned hint for not-owned paints that have similar paints in collection', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([PAINT_1, PAINT_2]);
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-1' }]);
            (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
            (prisma.userWishlistPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ paintId: 'paint-2' }]);
            // Reverse lookup: paint-2 (not owned) is similar to paint-1 (owned)
            (prisma.similarPaint as any).findMany.mockResolvedValue([
                { paintId: 'paint-2', similarPaint: { id: 'paint-1', name: 'Abaddon Black' } },
            ]);

            const result = await listPaintsWithStatus('user-1', undefined);

            const toBuy = result.paints.find(p => p.id === 'paint-2');
            expect(toBuy?.similarOwned).toEqual([{ id: 'paint-1', name: 'Abaddon Black' }]);
        });
    });

    // ─── markAsOwned ──────────────────────────────────────
    describe('markAsOwned', () => {
        it('creates a UserOwnedPaint record', async () => {
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(PAINT_1);
            (prisma.userOwnedPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });

            await markAsOwned('user-1', 'paint-1');

            expect(prisma.userOwnedPaint.create).toHaveBeenCalledWith({
                data: { userId: 'user-1', paintId: 'paint-1' },
            });
        });

        it('throws NotFoundError if paint does not exist', async () => {
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(markAsOwned('user-1', 'paint-999')).rejects.toThrow(NotFoundError);
        });
    });

    // ─── removeFromOwned ──────────────────────────────────
    describe('removeFromOwned', () => {
        it('deletes the UserOwnedPaint record', async () => {
            (prisma.userOwnedPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-1' });
            (prisma.userOwnedPaint.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await removeFromOwned('user-1', 'paint-1');

            expect(prisma.userOwnedPaint.delete).toHaveBeenCalledWith({
                where: { userId_paintId: { userId: 'user-1', paintId: 'paint-1' } },
            });
        });

        it('throws NotFoundError if paint is not owned', async () => {
            (prisma.userOwnedPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(removeFromOwned('user-1', 'paint-1')).rejects.toThrow(NotFoundError);
        });
    });

    // ─── addToWishlist ────────────────────────────────────
    describe('addToWishlist', () => {
        it('creates a UserWishlistPaint record', async () => {
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(PAINT_2);
            (prisma.userWishlistPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-2' });

            await addToWishlist('user-1', 'paint-2');

            expect(prisma.userWishlistPaint.create).toHaveBeenCalledWith({
                data: { userId: 'user-1', paintId: 'paint-2' },
            });
        });

        it('throws NotFoundError if paint does not exist', async () => {
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(addToWishlist('user-1', 'paint-999')).rejects.toThrow(NotFoundError);
        });
    });

    // ─── removeFromWishlist ───────────────────────────────
    describe('removeFromWishlist', () => {
        it('deletes the UserWishlistPaint record', async () => {
            (prisma.userWishlistPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user-1', paintId: 'paint-2' });
            (prisma.userWishlistPaint.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await removeFromWishlist('user-1', 'paint-2');

            expect(prisma.userWishlistPaint.delete).toHaveBeenCalledWith({
                where: { userId_paintId: { userId: 'user-1', paintId: 'paint-2' } },
            });
        });

        it('throws NotFoundError if paint is not in wishlist', async () => {
            (prisma.userWishlistPaint.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(removeFromWishlist('user-1', 'paint-2')).rejects.toThrow(NotFoundError);
        });
    });
});
