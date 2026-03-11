// ──────────────────────────────────────────────────────────
// Projects Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// All business logic lives in projects.service.ts.

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as projectsService from '../services/projects.service';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/projects — List projects with completion ───

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const result = await projectsService.listProjects(userId);
        res.json(result);
    }),
);

// ─── POST /api/projects — Create project ─────────────────

router.post(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const project = await projectsService.createProject(userId, req.body);
        res.status(201).json(project);
    }),
);

// ─── GET /api/projects/:id — Single project with items ───

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const project = await projectsService.getProject(userId, id);
        res.json(project);
    }),
);

// ─── PUT /api/projects/:id — Update project ──────────────

router.put(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const project = await projectsService.updateProject(userId, id, req.body);
        res.json(project);
    }),
);

// ─── DELETE /api/projects/:id — Delete project ───────────

router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await projectsService.deleteProject(userId, id);
        res.status(204).send();
    }),
);

// ─── POST /api/projects/:id/assign — Assign items ────────

router.post(
    '/:id/assign',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await projectsService.assignItems(userId, id, req.body.itemIds);
        res.json(result);
    }),
);

// ─── POST /api/projects/:id/unassign — Unassign items ────

router.post(
    '/:id/unassign',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await projectsService.unassignItems(userId, id, req.body.itemIds);
        res.json(result);
    }),
);

export default router;