// ──────────────────────────────────────────────────────────
// Media Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// Generates pre-signed URLs for direct upload/read from S3.
//
// FLOW:
//   1. Frontend requests a pre-signed upload URL
//   2. Backend generates it (never exposes credentials to client)
//   3. Frontend uploads directly to S3 using that URL
//   4. Frontend saves the file key in the item/scheme record
//
// WHY pre-signed?
//   - Backend never handles large file data
//   - Scales infinitely (S3 handles the bandwidth)
//   - Secure: URLs expire, no public bucket
//   - ALTERNATIVE: upload through backend (simpler but slower, memory-hungry)
//
// NOTE: S3 must be configured in .env. If not, these endpoints
//       return 503 with a helpful message.
//
// All business logic lives in media.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/async-handler';
import * as mediaService from '../services/media.service';

const router = Router();
router.use(authMiddleware);

// ─── POST /api/media/presign-upload ──────────────────────

router.post(
    '/presign-upload',
    asyncHandler(async (req, res) => {
        const userId = req.userId as string;
        const result = await mediaService.presignUpload(userId, req.body);
        res.json(result);
    }),
);

// ─── GET /api/media/presign-read/:key ────────────────────

router.get(
    '/presign-read/*',
    asyncHandler(async (req, res) => {
        const key = req.params[0];

        if (!key) {
            res.status(400).json({ error: 'File key is required' });
            return;
        }

        const result = await mediaService.presignRead(key);
        res.json(result);
    }),
);

export default router;
