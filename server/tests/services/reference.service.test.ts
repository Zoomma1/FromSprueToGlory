// ──────────────────────────────────────────────────────────
// Reference Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        gameSystem: {
            findMany: vi.fn(),
        },
        faction: {
            findMany: vi.fn(),
        },
        model: {
            findMany: vi.fn(),
        },
        paintBrand: {
            findMany: vi.fn(),
        },
        paint: {
            findMany: vi.fn(),
        },
        technique: {
            findMany: vi.fn(),
        },
    },
}));

import { prisma } from '../../src/lib/prisma';
import {
    getGameSystems,
    getFactions,
    getModels,
    getPaintBrands,
    getPaints,
    getTechniques,
} from '../../src/services/reference.service';

describe('Reference Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── getGameSystems ───────────────────────────────────
    describe('getGameSystems', () => {
        it('calls findMany and returns the array', async () => {
            const mockData = [{ id: 'gs-1', name: 'Warhammer 40K' }];
            (prisma.gameSystem.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getGameSystems();

            expect(prisma.gameSystem.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });
    });

    // ─── getFactions ──────────────────────────────────────
    describe('getFactions', () => {
        it('calls findMany without where clause when no gameSystemId', async () => {
            const mockData = [{ id: 'f-1', name: 'Space Marines' }];
            (prisma.faction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getFactions();

            expect(prisma.faction.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });

        it('filters by gameSystemId when provided', async () => {
            const mockData = [{ id: 'f-1', name: 'Space Marines' }];
            (prisma.faction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getFactions('gs-1');

            expect(prisma.faction.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { gameSystemId: 'gs-1' },
                }),
            );
            expect(result).toEqual(mockData);
        });
    });

    // ─── getModels ────────────────────────────────────────
    describe('getModels', () => {
        it('calls findMany without where clause when no factionId', async () => {
            const mockData = [{ id: 'm-1', name: 'Intercessors' }];
            (prisma.model.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getModels();

            expect(prisma.model.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });

        it('filters by factionId when provided', async () => {
            const mockData = [{ id: 'm-1', name: 'Intercessors' }];
            (prisma.model.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getModels('f-1');

            expect(prisma.model.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { factionId: 'f-1' },
                }),
            );
            expect(result).toEqual(mockData);
        });
    });

    // ─── getPaintBrands ───────────────────────────────────
    describe('getPaintBrands', () => {
        it('calls findMany and returns the array', async () => {
            const mockData = [{ id: 'pb-1', name: 'Citadel' }];
            (prisma.paintBrand.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getPaintBrands();

            expect(prisma.paintBrand.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });
    });

    // ─── getPaints ────────────────────────────────────────
    describe('getPaints', () => {
        it('calls findMany without filters when no arguments', async () => {
            const mockData = [{ id: 'p-1', name: 'Abaddon Black' }];
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getPaints();

            expect(prisma.paint.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });

        it('filters by brandId when provided', async () => {
            const mockData = [{ id: 'p-1', name: 'Abaddon Black' }];
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getPaints('pb-1');

            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ brandId: 'pb-1' }),
                }),
            );
            expect(result).toEqual(mockData);
        });

        it('filters by type when provided', async () => {
            const mockData = [{ id: 'p-1', name: 'Nuln Oil', type: 'SHADE' }];
            (prisma.paint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getPaints(undefined, 'SHADE');

            expect(prisma.paint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ type: 'SHADE' }),
                }),
            );
            expect(result).toEqual(mockData);
        });
    });

    // ─── getTechniques ────────────────────────────────────
    describe('getTechniques', () => {
        it('calls findMany and returns the array', async () => {
            const mockData = [{ id: 't-1', name: 'Drybrushing' }];
            (prisma.technique.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

            const result = await getTechniques();

            expect(prisma.technique.findMany).toHaveBeenCalledOnce();
            expect(result).toEqual(mockData);
        });
    });
});
