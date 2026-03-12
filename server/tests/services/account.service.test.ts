// ──────────────────────────────────────────────────────────
// Account Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        user: {
            delete: vi.fn(),
        },
    },
}));

import { prisma } from '../../src/lib/prisma';
import { deleteAccount } from '../../src/services/account.service';

describe('Account Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── deleteAccount ────────────────────────────────────
    describe('deleteAccount', () => {
        it('calls prisma.user.delete with the correct userId', async () => {
            (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await deleteAccount('user-1');

            expect(prisma.user.delete).toHaveBeenCalledOnce();
            expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
        });

        it('resolves without throwing when Prisma succeeds', async () => {
            (prisma.user.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await expect(deleteAccount('user-42')).resolves.toBeUndefined();
        });
    });
});
