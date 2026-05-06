// ──────────────────────────────────────────────────────────
// Export Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        item: { findMany: vi.fn() },
        colorScheme: { findMany: vi.fn() },
        userOwnedPaint: { findMany: vi.fn() },
    },
}));

import { prisma } from '../../src/lib/prisma';
import { ValidationError } from '../../src/lib/errors';
import { exportItems, exportColorSchemes, exportOwnedPaints } from '../../src/services/export.service';

// ─── Fixtures ────────────────────────────────────────────

const mockItem = {
    name: 'Test Mini',
    status: 'OWNED',
    gameSystem: { name: 'WH40K' },
    faction: { name: 'SM' },
    model: { name: 'Marine' },
    quantity: 1,
    price: null,
    currency: 'EUR',
    store: null,
    tags: [],
    notes: null,
    purchaseDate: null,
    createdAt: new Date('2024-01-01'),
    statusHistory: [],
};

const mockScheme = {
    id: 'scheme-1',
    name: 'Red Recipe',
    userId: 'user-1',
    steps: [],
    createdAt: new Date('2024-01-01'),
};

const mockOwnedPaintWithHex = {
    userId: 'user-1',
    paintId: 'paint-1',
    paint: {
        name: 'Abaddon Black',
        code: null,
        hex: '#231F20',
        type: 'BASE',
        brand: { name: 'Citadel Colour' },
    },
};

const mockOwnedPaintWithoutHex = {
    userId: 'user-1',
    paintId: 'paint-2',
    paint: {
        name: 'Custom Mix',
        code: 'CM-01',
        hex: null,
        type: 'OTHER',
        brand: { name: 'Vallejo' },
    },
};

describe('Export Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── exportItems ─────────────────────────────────────
    describe('exportItems', () => {
        it('returns { type: "json", items } when format is json', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

            const result = await exportItems('user-1', { format: 'json' });

            expect(result.type).toBe('json');
            if (result.type === 'json') {
                expect(result.items).toHaveLength(1);
            }
        });

        it('returns { type: "csv", csv, filename } when format is csv', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockItem]);

            const result = await exportItems('user-1', { format: 'csv' });

            expect(result.type).toBe('csv');
            if (result.type === 'csv') {
                expect(result.csv).toContain('name,status,gameSystem');
                expect(result.filename).toBe('pile-of-shame.csv');
            }
        });

        it('returns CSV with only header row when item.findMany returns empty array', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await exportItems('user-1', { format: 'csv' });

            expect(result.type).toBe('csv');
            if (result.type === 'csv') {
                expect(result.csv.trim().split('\n')).toHaveLength(1);
            }
        });

        it('throws ValidationError when format is invalid', async () => {
            await expect(exportItems('user-1', { format: 'xml' })).rejects.toThrow(ValidationError);
        });

        it('defaults to json format when query is empty', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await exportItems('user-1', {});

            expect(result.type).toBe('json');
        });
    });

    // ─── exportColorSchemes ───────────────────────────────
    describe('exportColorSchemes', () => {
        it('returns array from colorScheme.findMany', async () => {
            (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockScheme]);

            const result = await exportColorSchemes('user-1');

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({ name: 'Red Recipe' });
        });

        it('returns empty array when no schemes', async () => {
            (prisma.colorScheme.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await exportColorSchemes('user-1');

            expect(result).toHaveLength(0);
        });
    });

    // ─── exportOwnedPaints ───────────────────────────────
    describe('exportOwnedPaints', () => {
        it('returns WPF-aligned shape with hex and computed r/g/b', async () => {
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockOwnedPaintWithHex]);

            const result = await exportOwnedPaints('user-1');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                name: 'Abaddon Black',
                brand: 'Citadel Colour',
                set: null,
                hex: '#231F20',
                r: 35,
                g: 31,
                b: 32,
                type: 'BASE',
                code: null,
            });
        });

        it('returns null hex/r/g/b when paint has no hex', async () => {
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockOwnedPaintWithoutHex]);

            const result = await exportOwnedPaints('user-1');

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                name: 'Custom Mix',
                brand: 'Vallejo',
                hex: null,
                r: null,
                g: null,
                b: null,
                code: 'CM-01',
            });
        });

        it('returns empty array when user has no owned paints', async () => {
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await exportOwnedPaints('user-1');

            expect(result).toEqual([]);
        });

        it('passes userId filter and includes paint + brand', async () => {
            (prisma.userOwnedPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await exportOwnedPaints('user-42');

            expect(prisma.userOwnedPaint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user-42' },
                    include: expect.objectContaining({
                        paint: expect.objectContaining({
                            include: expect.objectContaining({
                                brand: true,
                            }),
                        }),
                    }),
                }),
            );
        });
    });
});