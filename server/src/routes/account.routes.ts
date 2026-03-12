// ──────────────────────────────────────────────────────────
// Account Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// Cascading deletion of user and all associated data.
// This is required by GDPR and good practice.
//
// WHY cascading delete?
//   - The Prisma schema uses onDelete: Cascade on relations
//   - Deleting the user automatically deletes items, schemes, tokens, etc.
//   - ALTERNATIVE: soft delete (mark as deleted, keep data) — more complex
//
// All business logic lives in account.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as accountService from '../services/account.service';

const router = Router();
router.use(authMiddleware);

// ─── DELETE /api/account ─────────────────────────────────

router.delete(
    '/',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        await accountService.deleteAccount(userId);
        res.json({ message: 'Account and all associated data deleted' });
    }),
);

export default router;