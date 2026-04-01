// ──────────────────────────────────────────────────────────
// Projects Route Tests
// ──────────────────────────────────────────────────────────
// Covers every branch of the projects routes:
//   GET  /api/projects             — list with completion % and pagination
//   POST /api/projects             — create
//   GET  /api/projects/:id         — single project
//   PUT  /api/projects/:id         — update
//   DELETE /api/projects/:id       — delete (nullifies item projectIds)
//   POST /api/projects/:id/assign  — assign items
//   POST /api/projects/:id/unassign — unassign items
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
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
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            delete: vi.fn(),
        },
        itemStatusHistory: { create: vi.fn(), findMany: vi.fn() },
        $transaction: vi.fn(),
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
        colorScheme: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        colorSchemeStep: { deleteMany: vi.fn() },
    },
}));

// ─── Mock JWT ─────────────────────────────────────────────
const mockVerifyAccessToken = vi.fn().mockReturnValue({ userId: 'user-1', email: 'a@b.com' });

vi.mock('../src/utils/jwt', () => ({
    generateAccessToken: vi.fn().mockReturnValue('tok'),
    generateRefreshToken: vi.fn().mockReturnValue('rtok'),
    verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
    verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
    default: { hash: vi.fn(), compare: vi.fn() },
}));

const app = createApp();
const AUTH = 'Bearer fake-token';

const sampleProject = {
    id: 'proj-1',
    userId: 'user-1',
    name: 'Ultramarines Army',
    description: '500-point starter',
    color: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
};

const sampleProjectWithItems = {
    ...sampleProject,
    items: [
        { id: 'item-1', status: 'FINISHED', quantity: 1 },
        { id: 'item-2', status: 'WIP',      quantity: 2 },
    ],
};

describe('Projects Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockVerifyAccessToken.mockReturnValue({ userId: 'user-1', email: 'a@b.com' });
    });

    // ─── AUTH MIDDLEWARE ──────────────────────────────────
    describe('Auth middleware', () => {
        it('returns 401 with no Authorization header', async () => {
            const res = await request(app).get('/api/projects');
            expect(res.status).toBe(401);
        });

        it('returns 401 when the token is invalid', async () => {
            mockVerifyAccessToken.mockImplementationOnce(() => { throw new Error('jwt expired'); });
            const res = await request(app).get('/api/projects').set('Authorization', 'Bearer bad');
            expect(res.status).toBe(401);
        });
    });

    // ─── GET /api/projects ────────────────────────────────
    describe('GET /api/projects', () => {
        it('returns a flat array of projects with completion and status counts', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[sampleProjectWithItems], 1]);

            const res = await request(app).get('/api/projects').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty('completion');
            expect(res.body[0]).toHaveProperty('itemCount', 2);
            expect(res.body[0]).toHaveProperty('statusCounts');
            expect(res.body[0]).toHaveProperty('color');
            expect(res.body[0]).toHaveProperty('tags');
        });

        it('returns 0% completion for a project with no items', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[sampleProject], 1]);

            const res = await request(app).get('/api/projects').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body[0].completion).toBe(0);
            expect(res.body[0].itemCount).toBe(0);
        });

        it('returns 100% completion when all items are FINISHED', async () => {
            const finished = {
                ...sampleProject,
                items: [{ id: 'item-1', status: 'FINISHED', quantity: 1 }],
            };
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[finished], 1]);

            const res = await request(app).get('/api/projects').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body[0].completion).toBe(100);
        });

        it('returns [] when the user has no projects', async () => {
            (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([[], 0]);

            const res = await request(app).get('/api/projects').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });

        it('returns 400 when limit=0 (below min=1)', async () => {
            const res = await request(app).get('/api/projects?limit=0').set('Authorization', AUTH);
            expect(res.status).toBe(400);
        });
    });

    // ─── POST /api/projects ───────────────────────────────
    describe('POST /api/projects', () => {
        it('creates a project and returns 201', async () => {
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);

            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'Ultramarines Army', description: '500-point starter' });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Ultramarines Army');
        });

        it('creates a project without an optional description', async () => {
            const noDesc = { ...sampleProject, description: null };
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(noDesc);

            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'Minimal Project' });

            expect(res.status).toBe(201);
        });

        it('returns 400 when name is missing', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ description: 'No name' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when name is empty', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: '' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when body contains an unknown field (.strict())', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'My Project', extraField: 'x' });

            expect(res.status).toBe(400);
        });

        it('creates a project with color and tags', async () => {
            const withMeta = { ...sampleProject, color: '#8B0000', tags: ['chaos', 'khorne'] };
            (prisma.project.create as ReturnType<typeof vi.fn>).mockResolvedValue(withMeta);

            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'Ultramarines Army', color: '#8B0000', tags: ['chaos', 'khorne'] });

            expect(res.status).toBe(201);
            expect(res.body.color).toBe('#8B0000');
            expect(res.body.tags).toEqual(['chaos', 'khorne']);
        });

        it('returns 400 when color format is invalid', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'My Project', color: 'not-a-color' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when tags has more than 10 items', async () => {
            const res = await request(app)
                .post('/api/projects')
                .set('Authorization', AUTH)
                .send({ name: 'My Project', tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`) });

            expect(res.status).toBe(400);
        });
    });

    // ─── GET /api/projects/:id ────────────────────────────
    describe('GET /api/projects/:id', () => {
        it('returns the project with completion when found', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProjectWithItems);

            const res = await request(app).get('/api/projects/proj-1').set('Authorization', AUTH);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('proj-1');
            expect(res.body).toHaveProperty('completion');
        });

        it('returns 404 when the project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app).get('/api/projects/nope').set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });
    });

    // ─── PUT /api/projects/:id ────────────────────────────
    describe('PUT /api/projects/:id', () => {
        it('updates the project and returns it', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            const updated = { ...sampleProject, name: 'Renamed' };
            (prisma.project.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

            const res = await request(app)
                .put('/api/projects/proj-1')
                .set('Authorization', AUTH)
                .send({ name: 'Renamed' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Renamed');
        });

        it('returns 404 when the project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .put('/api/projects/nope')
                .set('Authorization', AUTH)
                .send({ name: 'Renamed' });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });

        it('returns 400 when name is empty', async () => {
            const res = await request(app)
                .put('/api/projects/proj-1')
                .set('Authorization', AUTH)
                .send({ name: '' });

            expect(res.status).toBe(400);
        });
    });

    // ─── DELETE /api/projects/:id ─────────────────────────
    describe('DELETE /api/projects/:id', () => {
        it('nullifies item projectIds and deletes the project, returning 204', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            (prisma.item.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
            (prisma.project.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

            const res = await request(app)
                .delete('/api/projects/proj-1')
                .set('Authorization', AUTH);

            expect(res.status).toBe(204);
            expect(prisma.item.updateMany).toHaveBeenCalledWith({
                where: { projectId: 'proj-1' },
                data: { projectId: null },
            });
            expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'proj-1' } });
        });

        it('returns 404 when the project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/projects/nope')
                .set('Authorization', AUTH);

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });
    });

    // ─── POST /api/projects/:id/assign ───────────────────
    describe('POST /api/projects/:id/assign', () => {
        it('assigns items to the project and returns the count', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(sampleProject);
            (prisma.item.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

            const res = await request(app)
                .post('/api/projects/proj-1/assign')
                .set('Authorization', AUTH)
                .send({ itemIds: ['item-1', 'item-2'] });

            expect(res.status).toBe(200);
            expect(res.body.assigned).toBe(2);
            expect(prisma.item.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ data: { projectId: 'proj-1' } }),
            );
        });

        it('returns 400 when itemIds is missing', async () => {
            const res = await request(app)
                .post('/api/projects/proj-1/assign')
                .set('Authorization', AUTH)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('itemIds array required');
        });

        it('returns 400 when itemIds is an empty array', async () => {
            const res = await request(app)
                .post('/api/projects/proj-1/assign')
                .set('Authorization', AUTH)
                .send({ itemIds: [] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('itemIds array required');
        });

        it('returns 400 when itemIds is not an array', async () => {
            const res = await request(app)
                .post('/api/projects/proj-1/assign')
                .set('Authorization', AUTH)
                .send({ itemIds: 'item-1' });

            expect(res.status).toBe(400);
        });

        it('returns 404 when the project does not exist', async () => {
            (prisma.project.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const res = await request(app)
                .post('/api/projects/nope/assign')
                .set('Authorization', AUTH)
                .send({ itemIds: ['item-1'] });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });
    });

    // ─── POST /api/projects/:id/unassign ─────────────────
    describe('POST /api/projects/:id/unassign', () => {
        it('unassigns items from the project and returns the count', async () => {
            (prisma.item.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

            const res = await request(app)
                .post('/api/projects/proj-1/unassign')
                .set('Authorization', AUTH)
                .send({ itemIds: ['item-1'] });

            expect(res.status).toBe(200);
            expect(res.body.unassigned).toBe(1);
            expect(prisma.item.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ data: { projectId: null } }),
            );
        });

        it('returns 400 when itemIds is missing', async () => {
            const res = await request(app)
                .post('/api/projects/proj-1/unassign')
                .set('Authorization', AUTH)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('itemIds array required');
        });

        it('returns 400 when itemIds is an empty array', async () => {
            const res = await request(app)
                .post('/api/projects/proj-1/unassign')
                .set('Authorization', AUTH)
                .send({ itemIds: [] });

            expect(res.status).toBe(400);
        });
    });
});
