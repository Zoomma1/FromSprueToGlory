// ──────────────────────────────────────────────────────────
// Admin Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        paintBrand: { findUnique: vi.fn() },
        paint: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    },
}));

import { prisma } from '../../src/lib/prisma';
import { ValidationError } from '../../src/lib/errors';
import { syncPaints, exportPaints } from '../../src/services/admin.service';

// ─── Fixtures ────────────────────────────────────────────

const mockBrand = { id: 'brand-1', slug: 'citadel', name: 'Citadel' };
const validPaint = { name: 'Abaddon Black', brandSlug: 'citadel', type: 'BASE', code: 'CT-001' };

describe('Admin Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── syncPaints ───────────────────────────────────────
    describe('syncPaints', () => {
        it('throws ValidationError when body is not an array', async () => {
            await expect(syncPaints({})).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when body is empty array', async () => {
            await expect(syncPaints([])).rejects.toThrow(ValidationError);
        });

        it('creates paint when brand exists and paint is new', async () => {
            (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrand);
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.paint.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'paint-1' });

            const result = await syncPaints([validPaint]);

            expect(result).toEqual({ created: 1, skipped: 0, errors: [] });
            expect(prisma.paint.create).toHaveBeenCalledOnce();
        });

        it('skips paint when it already exists', async () => {
            (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrand);
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'paint-1' });

            const result = await syncPaints([validPaint]);

            expect(result).toEqual({ created: 0, skipped: 1, errors: [] });
            expect(prisma.paint.create).not.toHaveBeenCalled();
        });

        it('records error in errors[] when brand not found', async () => {
            (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const result = await syncPaints([validPaint]);

            expect(result.created).toBe(0);
            expect(result.skipped).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('citadel');
        });

        it('records error in errors[] when prisma.paint.create throws', async () => {
            (prisma.paintBrand.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockBrand);
            (prisma.paint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (prisma.paint.create as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('DB constraint violation'),
            );

            const result = await syncPaints([validPaint]);

            expect(result.created).toBe(0);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('Abaddon Black');
        });
    });

    // ─── exportPaints ─────────────────────────────────────
    describe('exportPaints', () => {
        it('returns mapped array with { name, code, type, brandSlug }', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                {
                    name: 'Abaddon Black',
                    code: 'CT-001',
                    type: 'BASE',
                    brand: { slug: 'citadel' },
                },
            ]);

            const result = await exportPaints();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                name: 'Abaddon Black',
                code: 'CT-001',
                type: 'BASE',
                brandSlug: 'citadel',
            });
        });

        it('returns empty array when paint.findMany returns []', async () => {
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await exportPaints();

            expect(result).toHaveLength(0);
        });
    });
});
