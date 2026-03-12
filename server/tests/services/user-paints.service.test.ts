// ──────────────────────────────────────────────────────────
// User Paints Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        userCustomPaint: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
    },
}));

import { prisma } from '../../src/lib/prisma';
import { NotFoundError, ValidationError } from '../../src/lib/errors';
import { listPaints, createPaint, deletePaint } from '../../src/services/user-paints.service';

const samplePaint = {
    id: 'paint-1',
    userId: 'user-1',
    name: 'My Custom Black',
    type: 'BASE',
    notes: 'Mix of black and medium',
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('User Paints Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── listPaints ───────────────────────────────────────
    describe('listPaints', () => {
        it('calls findMany with correct userId and returns the result', async () => {
            const mockData = [samplePaint];
            (prisma.userCustomPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
                mockData,
            );

            const result = await listPaints('user-1');

            expect(prisma.userCustomPaint.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'user-1' },
                }),
            );
            expect(result).toEqual(mockData);
        });

        it('returns empty array when user has no custom paints', async () => {
            (prisma.userCustomPaint.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await listPaints('user-1');

            expect(result).toHaveLength(0);
        });
    });

    // ─── createPaint ──────────────────────────────────────
    describe('createPaint', () => {
        it('creates and returns the custom paint', async () => {
            (prisma.userCustomPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue(
                samplePaint,
            );

            const result = await createPaint('user-1', {
                name: 'My Custom Black',
                type: 'BASE',
            });

            expect(result.name).toBe('My Custom Black');
            expect(prisma.userCustomPaint.create).toHaveBeenCalledOnce();
        });

        it('passes userId to prisma.create', async () => {
            (prisma.userCustomPaint.create as ReturnType<typeof vi.fn>).mockResolvedValue(
                samplePaint,
            );

            await createPaint('user-1', { name: 'Test Paint' });

            expect(prisma.userCustomPaint.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ userId: 'user-1' }),
                }),
            );
        });

        it('throws ValidationError when name is missing', async () => {
            await expect(createPaint('user-1', {})).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when name is empty string', async () => {
            await expect(createPaint('user-1', { name: '' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when unknown field is included', async () => {
            await expect(
                createPaint('user-1', { name: 'Test', unknownField: 'x' }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── deletePaint ──────────────────────────────────────
    describe('deletePaint', () => {
        it('deletes the paint and returns void', async () => {
            (prisma.userCustomPaint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
                samplePaint,
            );
            (prisma.userCustomPaint.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await expect(deletePaint('user-1', 'paint-1')).resolves.toBeUndefined();
            expect(prisma.userCustomPaint.delete).toHaveBeenCalledWith({ where: { id: 'paint-1' } });
        });

        it('throws NotFoundError when paint does not exist', async () => {
            (prisma.userCustomPaint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(deletePaint('user-1', 'nope')).rejects.toThrow(NotFoundError);
            await expect(deletePaint('user-1', 'nope')).rejects.toThrow('Custom paint not found');
        });

        it('throws NotFoundError when paint belongs to a different user', async () => {
            // findFirst uses both id and userId in where clause — returns null for wrong owner
            (prisma.userCustomPaint.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(deletePaint('other-user', 'paint-1')).rejects.toThrow(NotFoundError);
        });
    });
});
