// ──────────────────────────────────────────────────────────
// User Activity Service Unit Tests — FSTG-12
// ──────────────────────────────────────────────────────────
// Covers the adoption-metric tracking:
//   - dedup 1 row / user / UTC day (enforced by createMany skipDuplicates)
//   - lastLoginAt denormalization updated only when a new day is inserted
//   - tracking is fire-and-forget safe (insert failure never throws)
//   - "active in last N days" + "returning users" measurement queries
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        userActivity: { createMany: vi.fn(), groupBy: vi.fn() },
        user: { update: vi.fn(), count: vi.fn() },
    },
}));

import { prisma } from '../../src/lib/prisma';
import {
    trackUserActivity,
    countActiveUsers,
    countReturningUsers,
} from '../../src/services/user-activity.service';

const createMany = prisma.userActivity.createMany as ReturnType<typeof vi.fn>;
const groupBy = prisma.userActivity.groupBy as ReturnType<typeof vi.fn>;
const userUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const userCount = prisma.user.count as ReturnType<typeof vi.fn>;

describe('User Activity Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── trackUserActivity ────────────────────────────────
    describe('trackUserActivity', () => {
        it('inserts one row keyed by userId + UTC midnight day, idempotently', async () => {
            createMany.mockResolvedValue({ count: 1 });

            await trackUserActivity('user-1');

            expect(createMany).toHaveBeenCalledTimes(1);
            const arg = createMany.mock.calls[0][0];
            expect(arg.skipDuplicates).toBe(true);
            expect(arg.data).toHaveLength(1);
            expect(arg.data[0].userId).toBe('user-1');

            // day must be normalized to UTC midnight (the dedup granularity)
            const day: Date = arg.data[0].day;
            expect(day.getUTCHours()).toBe(0);
            expect(day.getUTCMinutes()).toBe(0);
            expect(day.getUTCSeconds()).toBe(0);
            expect(day.getUTCMilliseconds()).toBe(0);
        });

        it('updates lastLoginAt when a new day row is actually inserted', async () => {
            createMany.mockResolvedValue({ count: 1 });

            await trackUserActivity('user-1');

            expect(userUpdate).toHaveBeenCalledTimes(1);
            const arg = userUpdate.mock.calls[0][0];
            expect(arg.where).toEqual({ id: 'user-1' });
            expect(arg.data.lastLoginAt).toBeInstanceOf(Date);
        });

        it('does NOT update lastLoginAt when the user already has a row today (dedup hit)', async () => {
            createMany.mockResolvedValue({ count: 0 });

            await trackUserActivity('user-1');

            expect(userUpdate).not.toHaveBeenCalled();
        });

        it('persists the optional route without query string', async () => {
            createMany.mockResolvedValue({ count: 1 });

            await trackUserActivity('user-1', '/api/projects');

            expect(createMany.mock.calls[0][0].data[0].route).toBe('/api/projects');
        });

        it('swallows insert errors — never throws so the auth request still succeeds', async () => {
            createMany.mockRejectedValue(new Error('DB unreachable'));

            await expect(trackUserActivity('user-1')).resolves.toBeUndefined();
            expect(userUpdate).not.toHaveBeenCalled();
        });
    });

    // ─── countActiveUsers ─────────────────────────────────
    describe('countActiveUsers', () => {
        it('counts users with lastLoginAt within the window (default 7 days)', async () => {
            userCount.mockResolvedValue(42);

            const result = await countActiveUsers();

            expect(result).toBe(42);
            const arg = userCount.mock.calls[0][0];
            expect(arg.where.lastLoginAt.gte).toBeInstanceOf(Date);

            // cutoff ≈ now - 7 days
            const cutoff: Date = arg.where.lastLoginAt.gte;
            const approxDaysAgo = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
            expect(approxDaysAgo).toBeGreaterThan(6.9);
            expect(approxDaysAgo).toBeLessThan(7.1);
        });

        it('honours a custom window', async () => {
            userCount.mockResolvedValue(10);

            await countActiveUsers(30);

            const cutoff: Date = userCount.mock.calls[0][0].where.lastLoginAt.gte;
            const approxDaysAgo = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
            expect(approxDaysAgo).toBeGreaterThan(29.9);
            expect(approxDaysAgo).toBeLessThan(30.1);
        });
    });

    // ─── countReturningUsers ──────────────────────────────
    describe('countReturningUsers', () => {
        it('counts users active on at least 2 distinct days in the window', async () => {
            groupBy.mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }]);

            const result = await countReturningUsers();

            expect(result).toBe(2);
            const arg = groupBy.mock.calls[0][0];
            expect(arg.by).toEqual(['userId']);
            expect(arg.where.day.gte).toBeInstanceOf(Date);
            // returning = >= 2 distinct days (one unique row per day, so row count == distinct days)
            expect(arg.having.userId._count.gte).toBe(2);
        });

        it('returns 0 when nobody came back', async () => {
            groupBy.mockResolvedValue([]);

            expect(await countReturningUsers()).toBe(0);
        });
    });
});
