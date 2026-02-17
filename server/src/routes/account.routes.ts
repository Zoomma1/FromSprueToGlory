// ──────────────────────────────────────────────────────────
// 🗑️ Account Routes — Delete account
// ──────────────────────────────────────────────────────────
// Cascading deletion of user and all associated data.
// This is required by GDPR and good practice.
//
// WHY cascading delete?
//   - The Prisma schema uses onDelete: Cascade on relations
//   - Deleting the user automatically deletes items, schemes, tokens, etc.
//   - ALTERNATIVE: soft delete (mark as deleted, keep data) — more complex
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// ─── DELETE /api/account ─────────────────────────────────
router.delete('/', async (req: Request, res: Response) => {
    const userId = req.userId as string;

    // Delete the user — all related data cascades
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Account and all associated data deleted' });
});

export default router;
