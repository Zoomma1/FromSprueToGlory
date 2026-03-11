import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { prisma } from './lib/prisma';
import { AppError } from './lib/errors';
import { ValidationError } from './lib/errors';

// Route imports
import authRoutes from './routes/auth.routes';
import referenceRoutes from './routes/reference.routes';
import itemsRoutes from './routes/items.routes';
import colorSchemesRoutes from './routes/color-schemes.routes';
import mediaRoutes from './routes/media.routes';
import exportRoutes from './routes/export.routes';
import accountRoutes from './routes/account.routes';
import projectsRoutes from './routes/projects.routes';
import adminRoutes from './routes/admin.routes';
import userPaintsRoutes from './routes/user-paints.routes';

// ──────────────────────────────────────────────
// Centralized Error Handler
// ──────────────────────────────────────────────
// WHY four-argument signature?
//   Express identifies error-handling middleware by its arity (4 args).
//   The eslint rule @typescript-eslint/no-unused-vars is suppressed for
//   _next which must be declared even though it is never called.
// ──────────────────────────────────────────────
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        const body: Record<string, unknown> = { error: err.message };
        if (err instanceof ValidationError && err.details !== undefined) {
            body.details = err.details;
        }
        res.status(err.statusCode).json(body);
        return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
};

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
    app.use('/api/admin', adminRoutes);
    app.use('/api/user-paints', userPaintsRoutes);

    // Error handler must be mounted after all routes
    app.use(errorHandler);

    return app;
}
