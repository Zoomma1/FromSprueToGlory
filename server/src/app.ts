import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';

// Route imports
import authRoutes from './routes/auth.routes';
import referenceRoutes from './routes/reference.routes';
import itemsRoutes from './routes/items.routes';
import colorSchemesRoutes from './routes/color-schemes.routes';
import mediaRoutes from './routes/media.routes';
import exportRoutes from './routes/export.routes';
import accountRoutes from './routes/account.routes';
import projectsRoutes from './routes/projects.routes';

// ──────────────────────────────────────────────
// 🏭 App Factory
// ──────────────────────────────────────────────
// WHY a factory function?
//   - Testable: we can create fresh app instances per test
//   - Configurable: easy to swap config per environment
//
// ALTERNATIVE: export app directly (simpler, but harder to test)
// ──────────────────────────────────────────────

export function createApp() {
    const app = express();

    // ─── Security middleware ───────────────────
    app.use(helmet());

    app.use(
        cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
            credentials: true,
        }),
    );

    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            standardHeaders: true,
            legacyHeaders: false,
        }),
    );

    // ─── Body parsing ─────────────────────────
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // ─── Health check ─────────────────────────
    app.get('/api/health', async (_req, res) => {
        let dbStatus = 'ok';
        let dbError: string | undefined;
        try {
            await prisma.$queryRawUnsafe('SELECT 1');
        } catch (err: unknown) {
            dbStatus = 'unreachable';
            if (err instanceof Error) {
                dbError = err.message;
            } else {
                dbError = typeof err === 'string' ? err : JSON.stringify(err);
            }
            if (!dbError) dbError = 'Unknown error';
        }
        const status = dbStatus === 'ok' ? 'ok' : 'degraded';
        res.status(status === 'ok' ? 200 : 503).json({
            status,
            name: 'From Sprue to Glory API',
            timestamp: new Date().toISOString(),
            database: dbStatus,
            ...(dbError && { dbError }),
        });
    });

    // ─── API Routes ───────────────────────────
    app.use('/api/auth', authRoutes);
    app.use('/api/reference', referenceRoutes);
    app.use('/api/items', itemsRoutes);
    app.use('/api/color-schemes', colorSchemesRoutes);
    app.use('/api/media', mediaRoutes);
    app.use('/api/export', exportRoutes);
    app.use('/api/account', accountRoutes);
    app.use('/api/projects', projectsRoutes);

    return app;
}
