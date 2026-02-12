// ──────────────────────────────────────────────────────────
// 🧪 Health Route Tests — Ensures DB connectivity is checked
// ──────────────────────────────────────────────────────────
// Verifies that the /api/health endpoint reports database
// status correctly, both when the DB is reachable and when
// it is not.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';

// ─── Mock Prisma ─────────────────────────────────────────
vi.mock('../src/lib/prisma', () => ({
    prisma: {
        $queryRawUnsafe: vi.fn(),
        // Provide stubs so other routes don't crash during app init
        user: { findUnique: vi.fn(), create: vi.fn() },
        refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    },
}));

import { prisma } from '../src/lib/prisma';

const app = createApp();

describe('Health Check', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 200 with database: ok when DB is reachable', async () => {
        (prisma.$queryRawUnsafe as any).mockResolvedValue([{ '?column?': 1 }]);

        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.database).toBe('ok');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).not.toHaveProperty('dbError');
    });

    it('should return 503 with database: unreachable when DB is down', async () => {
        (prisma.$queryRawUnsafe as any).mockRejectedValue(
            new Error("Can't reach database server at `localhost:5432`"),
        );

        const res = await request(app).get('/api/health');

        expect(res.status).toBe(503);
        expect(res.body.status).toBe('degraded');
        expect(res.body.database).toBe('unreachable');
        expect(res.body.dbError).toContain('localhost:5432');
    });

    it('should return 503 with database: unreachable on auth errors', async () => {
        (prisma.$queryRawUnsafe as any).mockRejectedValue(
            new Error('password authentication failed for user "sprue"'),
        );

        const res = await request(app).get('/api/health');

        expect(res.status).toBe(503);
        expect(res.body.status).toBe('degraded');
        expect(res.body.database).toBe('unreachable');
        expect(res.body.dbError).toContain('authentication failed');
    });
});
