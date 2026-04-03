// ──────────────────────────────────────────────────────────
// Color Schemes Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
//
// Wave 0: These tests are RED until Plan 02 fixes the service.
//   - TXN-02: $transaction error propagation
//   - OWN-01: updateScheme and deleteScheme throw ForbiddenError (not NotFoundError)
//             when a scheme belongs to a different user
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
// Must appear before imports of the module under test
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        colorScheme: {
            findFirst: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        colorSchemeStep: {
            findMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        colorSchemeStepMix: {
            deleteMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

vi.mock('../../src/lib/s3', () => ({
    getS3Client: vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) })),
}));

import { prisma } from '../../src/lib/prisma';
import { NotFoundError, ForbiddenError } from '../../src/lib/errors';
import { updateScheme, deleteScheme } from '../../src/services/color-schemes.service';

const TECH_1 = '00000000-0000-0000-0000-000000000001';

const validBody = {
    name: 'Test',
    steps: [{ orderIndex: 1, area: 'Armor', techniqueId: TECH_1 }],
};

describe('Color Schemes Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (prisma.colorSchemeStep.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    // ─── updateScheme — ownership ─────────────────────────
    describe('updateScheme — ownership', () => {
        it('throws NotFoundError when scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(updateScheme('user-1', 'cs-x', validBody)).rejects.toThrow(NotFoundError);
        });

        it('throws ForbiddenError when scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'cs-1',
                userId: 'other-user',
            });

            await expect(updateScheme('user-1', 'cs-1', validBody)).rejects.toThrow(ForbiddenError);
        });
    });

    // ─── deleteScheme — ownership ─────────────────────────
    describe('deleteScheme — ownership', () => {
        it('throws NotFoundError when scheme does not exist', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(deleteScheme('user-1', 'cs-x')).rejects.toThrow(NotFoundError);
        });

        it('throws ForbiddenError when scheme belongs to another user', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'cs-1',
                userId: 'other-user',
            });

            await expect(deleteScheme('user-1', 'cs-1')).rejects.toThrow(ForbiddenError);
        });
    });

    // ─── updateScheme — transaction rollback (TXN-02) ─────
    describe('updateScheme — transaction rollback (TXN-02)', () => {
        it('propagates error thrown inside transaction', async () => {
            (prisma.colorScheme.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'cs-1',
                userId: 'user-1',
            });
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
                new Error('DB constraint'),
            );

            await expect(updateScheme('user-1', 'cs-1', validBody)).rejects.toThrow('DB constraint');
        });
    });
});
