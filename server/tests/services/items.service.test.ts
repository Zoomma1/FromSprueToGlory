// ──────────────────────────────────────────────────────────
// Items Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        item: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        itemStatusHistory: {
            create: vi.fn(),
            findMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

import { prisma } from '../../src/lib/prisma';
import { NotFoundError, ValidationError } from '../../src/lib/errors';
import {
    listItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    changeStatus,
    getHistory,
} from '../../src/services/items.service';

const GS_1 = '00000000-0000-0000-0000-000000000001';
const F_1 = '00000000-0000-0000-0000-000000000002';

const sampleItem = {
    id: 'item-1',
    userId: 'user-1',
    name: 'Intercessors',
    gameSystemId: GS_1,
    factionId: F_1,
    status: 'WANT',
    quantity: 1,
    currency: 'EUR',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe('Items Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── listItems ────────────────────────────────────────
    describe('listItems', () => {
        it('returns the items array from prisma', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([sampleItem]);

            const result = await listItems('user-1', {});

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Intercessors');
            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
            );
        });

        it('passes status filter to prisma when provided', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await listItems('user-1', { status: 'BOUGHT' });

            expect(prisma.item.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ status: 'BOUGHT' }) }),
            );
        });

        it('returns an empty array when user has no items', async () => {
            (prisma.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            const result = await listItems('user-1', {});

            expect(result).toHaveLength(0);
        });
    });

    // ─── getItem ──────────────────────────────────────────
    describe('getItem', () => {
        it('returns the item when found', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);

            const result = await getItem('user-1', 'item-1');

            expect(result.id).toBe('item-1');
        });

        it('throws NotFoundError when item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(getItem('user-1', 'nope')).rejects.toThrow(NotFoundError);
            await expect(getItem('user-1', 'nope')).rejects.toThrow('Item not found');
        });
    });

    // ─── createItem ───────────────────────────────────────
    describe('createItem', () => {
        it('creates and returns the item', async () => {
            (prisma.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);

            const result = await createItem('user-1', {
                name: 'Intercessors',
                gameSystemId: GS_1,
                factionId: F_1,
            });

            expect(result.name).toBe('Intercessors');
            expect(prisma.item.create).toHaveBeenCalledOnce();
        });

        it('throws ValidationError when name is missing', async () => {
            await expect(
                createItem('user-1', { gameSystemId: GS_1, factionId: F_1 }),
            ).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when name is empty string', async () => {
            await expect(
                createItem('user-1', { name: '', gameSystemId: GS_1, factionId: F_1 }),
            ).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when gameSystemId is not a UUID', async () => {
            await expect(
                createItem('user-1', { name: 'Test', gameSystemId: 'not-a-uuid', factionId: F_1 }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── updateItem ───────────────────────────────────────
    describe('updateItem', () => {
        it('updates and returns the item', async () => {
            const updated = { ...sampleItem, name: 'Updated' };
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.item.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

            const result = await updateItem('user-1', 'item-1', { name: 'Updated' });

            expect(result.name).toBe('Updated');
        });

        it('throws NotFoundError when item does not belong to user', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(updateItem('user-1', 'nope', { name: 'x' })).rejects.toThrow(NotFoundError);
        });
    });

    // ─── deleteItem ───────────────────────────────────────
    describe('deleteItem', () => {
        it('deletes the item and returns void', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.item.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await expect(deleteItem('user-1', 'item-1')).resolves.toBeUndefined();
            expect(prisma.item.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
        });

        it('throws NotFoundError when item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(deleteItem('user-1', 'nope')).rejects.toThrow(NotFoundError);
        });
    });

    // ─── changeStatus ─────────────────────────────────────
    describe('changeStatus', () => {
        it('changes status and returns updated item', async () => {
            const existing = { ...sampleItem, status: 'WANT' };
            const updated = { ...sampleItem, status: 'BOUGHT' };
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([updated, {}]);

            const result = await changeStatus('user-1', 'item-1', { status: 'BOUGHT' });

            expect(result.status).toBe('BOUGHT');
        });

        it('throws ValidationError when new status equals current status', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
                ...sampleItem,
                status: 'WANT',
            });

            await expect(changeStatus('user-1', 'item-1', { status: 'WANT' })).rejects.toThrow(
                ValidationError,
            );
            await expect(
                changeStatus('user-1', 'item-1', { status: 'WANT' }),
            ).rejects.toThrow('Status is already WANT');
        });

        it('throws NotFoundError when item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(changeStatus('user-1', 'nope', { status: 'BOUGHT' })).rejects.toThrow(
                NotFoundError,
            );
        });

        it('throws ValidationError when status value is invalid', async () => {
            await expect(
                changeStatus('user-1', 'item-1', { status: 'INVALID' }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── getHistory ───────────────────────────────────────
    describe('getHistory', () => {
        it('returns status history for the item', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleItem);
            (prisma.itemStatusHistory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
                { fromStatus: 'WANT', toStatus: 'BOUGHT', changedAt: new Date().toISOString() },
            ]);

            const result = await getHistory('user-1', 'item-1');

            expect(result).toHaveLength(1);
            expect(result[0].toStatus).toBe('BOUGHT');
        });

        it('throws NotFoundError when item does not exist', async () => {
            (prisma.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(getHistory('user-1', 'nope')).rejects.toThrow(NotFoundError);
        });
    });
});
