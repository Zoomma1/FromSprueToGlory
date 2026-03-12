// ──────────────────────────────────────────────────────────
// 📦 Items Routes — Pile of Shame CRUD
// ──────────────────────────────────────────────────────────
// Thin HTTP adapter: extracts userId, calls service, sends response.
// All business logic, validation, and Prisma calls live in items.service.ts.
//
// WHY asyncHandler?
//   Express 4 does not catch rejected promises. asyncHandler wraps each
//   handler so thrown AppError subclasses propagate to the centralized
//   errorHandler in app.ts, producing the correct HTTP status code.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as itemsService from '../services/items.service';

const router = Router();

// All item routes require auth
router.use(authMiddleware);

// ─── GET /api/items — List items with filters ────────────
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const items = await itemsService.listItems(
            userId,
            req.query as Record<string, string | undefined>,
        );
        res.json(items.data);
    }),
);

// ─── GET /api/items/:id — Single item ────────────────────
router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await itemsService.getItem(userId, id);
        res.json(item);
    }),
);

// ─── POST /api/items — Create item ──────────────────────
router.post(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const item = await itemsService.createItem(userId, req.body);
        res.status(201).json(item);
    }),
);

// ─── PUT /api/items/:id — Update item ───────────────────
router.put(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await itemsService.updateItem(userId, id, req.body);
        res.json(item);
    }),
);

// ─── DELETE /api/items/:id — Delete item ────────────────
router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await itemsService.deleteItem(userId, id);
        res.status(204).send();
    }),
);

// ─── PATCH /api/items/:id/status — Change status ────────
// This is the KEY endpoint: it updates status AND creates history
router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await itemsService.changeStatus(userId, id, req.body);
        res.json(item);
    }),
);

// ─── GET /api/items/:id/history — Status history ────────
router.get(
    '/:id/history',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const history = await itemsService.getHistory(userId, id);
        res.json(history);
    }),
);

export default router;
