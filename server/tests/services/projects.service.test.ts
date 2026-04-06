// ──────────────────────────────────────────────────────────
// Projects Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// Prisma is mocked at the module level so no DB connection is needed.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        project: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        item: {
            updateMany: vi.fn(),
        },
        $transaction: vi.fn(),
    },
}));

import { prisma } from '../../src/lib/prisma';
import { NotFoundError, ValidationError } from '../../src/lib/errors';
import {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
} from '../../src/services/projects.service';

const sampleProject = {
    id: 'project-1',
    userId: 'user-1',
    name: 'Army of Darkness',
    description: 'My Space Marines',
    color: null,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
};

describe('Projects Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── listProjects ─────────────────────────────────────
    describe('listProjects', () => {
        it('returns { data, total } envelope from prisma transaction', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([
                [sampleProject],
                1,
            ]);

            const result = await listProjects('user-1', {});

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total', 1);
            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Army of Darkness');
        });

        it('returns { data: [], total: 0 } when user has no projects', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[], 0]);

            const result = await listProjects('user-1', {});

            expect(result.data).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it('applies pagination defaults when no query params provided', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[], 0]);

            await listProjects('user-1', {});

            expect(prisma.$transaction).toHaveBeenCalledOnce();
        });

        it('throws ValidationError on invalid pagination parameters', async () => {
            await expect(
                listProjects('user-1', { limit: 'not-a-number' }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── getProject ───────────────────────────────────────
    describe('getProject', () => {
        it('returns the project with completion when found', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);

            const result = await getProject('user-1', 'project-1');

            expect(result.id).toBe('project-1');
            expect(result).toHaveProperty('completion');
        });

        it('throws NotFoundError when project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(getProject('user-1', 'nope')).rejects.toThrow(NotFoundError);
            await expect(getProject('user-1', 'nope')).rejects.toThrow('Project not found');
        });
    });

    // ─── createProject ────────────────────────────────────
    describe('createProject', () => {
        it('creates and returns the project', async () => {
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);

            const result = await createProject('user-1', { name: 'Army of Darkness' });

            expect(result.name).toBe('Army of Darkness');
            expect(prisma.project.create).toHaveBeenCalledOnce();
        });

        it('passes userId to prisma.create', async () => {
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);

            await createProject('user-1', { name: 'Test' });

            expect(prisma.project.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ userId: 'user-1' }),
                }),
            );
        });

        it('throws ValidationError when name is missing', async () => {
            await expect(createProject('user-1', {})).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when name is empty string', async () => {
            await expect(createProject('user-1', { name: '' })).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when unknown field is included', async () => {
            await expect(
                createProject('user-1', { name: 'Test', unknownField: 'x' }),
            ).rejects.toThrow(ValidationError);
        });

        it('accepts defaultGameSystemId and defaultFactionId', async () => {
            const withDefaults = { ...sampleProject, defaultGameSystemId: 'gs-1', defaultFactionId: 'f-1' };
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(withDefaults);

            await createProject('user-1', {
                name: 'Test',
                defaultGameSystemId: 'gs-1',
                defaultFactionId: 'f-1',
            });

            expect(prisma.project.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        defaultGameSystemId: 'gs-1',
                        defaultFactionId: 'f-1',
                    }),
                }),
            );
        });

        it('accepts null defaultGameSystemId and defaultFactionId', async () => {
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            await expect(
                createProject('user-1', { name: 'Test', defaultGameSystemId: null, defaultFactionId: null }),
            ).resolves.toBeDefined();
        });

        it('accepts color and tags and passes them to prisma.create', async () => {
            const withMeta = { ...sampleProject, color: '#8B0000', tags: ['chaos', 'khorne'] };
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(withMeta);

            const result = await createProject('user-1', {
                name: 'Chaos Army',
                color: '#8B0000',
                tags: ['chaos', 'khorne'],
            });

            expect(result.color).toBe('#8B0000');
            expect(result.tags).toEqual(['chaos', 'khorne']);
            expect(prisma.project.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ color: '#8B0000', tags: ['chaos', 'khorne'] }),
                }),
            );
        });

        it('throws ValidationError when color format is invalid', async () => {
            await expect(
                createProject('user-1', { name: 'Test', color: 'not-a-color' }),
            ).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when tags has more than 10 items', async () => {
            await expect(
                createProject('user-1', {
                    name: 'Test',
                    tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
                }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── updateProject ────────────────────────────────────
    describe('updateProject', () => {
        it('updates and returns the project', async () => {
            const updated = { ...sampleProject, name: 'Updated' };
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            (prisma.project.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

            const result = await updateProject('user-1', 'project-1', { name: 'Updated' });

            expect(result.name).toBe('Updated');
        });

        it('throws NotFoundError when project does not belong to user', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(updateProject('user-1', 'nope', { name: 'x' })).rejects.toThrow(
                NotFoundError,
            );
        });

        it('throws ValidationError on invalid body', async () => {
            await expect(
                updateProject('user-1', 'project-1', { name: '' }),
            ).rejects.toThrow(ValidationError);
        });
    });

    // ─── deleteProject ────────────────────────────────────
    describe('deleteProject', () => {
        it('deletes the project and returns void', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            (prisma.item.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
            (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await expect(deleteProject('user-1', 'project-1')).resolves.toBeUndefined();
            expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'project-1' } });
        });

        it('unassigns items before deleting the project', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            (prisma.item.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
            (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            await deleteProject('user-1', 'project-1');

            expect(prisma.item.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ projectId: 'project-1' }),
                }),
            );
        });

        it('throws NotFoundError when project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await expect(deleteProject('user-1', 'nope')).rejects.toThrow(NotFoundError);
        });
    });
});
