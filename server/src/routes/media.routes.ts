// ──────────────────────────────────────────────────────────
// 📸 Media Routes — S3 Pre-signed URLs
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
// ──────────────────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

// Check if S3 is configured
function isS3Configured(): boolean {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.S3_BUCKET
    );
}

// ─── POST /api/media/presign-upload ──────────────────────
router.post('/presign-upload', async (req: Request, res: Response) => {
    if (!isS3Configured()) {
        res.status(503).json({
            error: 'S3 not configured',
            message: 'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET in .env',
        });
        return;
    }

    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
        res.status(400).json({ error: 'fileName and contentType are required' });
        return;
    }

    // Build a unique key: users/{userId}/{timestamp}-{fileName}
    const userId = req.userId;
    const key = `users/${userId}/${Date.now()}-${fileName}`;

    try {
        // Dynamic import to avoid crash if aws-sdk not installed
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const s3 = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            ...(process.env.S3_ENDPOINT
                ? {
                    endpoint: process.env.S3_ENDPOINT,
                    forcePathStyle: true, // needed for MinIO
                }
                : {}),
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

        res.json({ uploadUrl, key });
    } catch (err) {
        console.error('S3 presign-upload error:', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

// ─── GET /api/media/presign-read/:key ────────────────────
router.get('/presign-read/*', async (req: Request, res: Response) => {
    if (!isS3Configured()) {
        res.status(503).json({
            error: 'S3 not configured',
            message: 'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET in .env',
        });
        return;
    }

    // Key is everything after /presign-read/
    const key = req.params[0];
    if (!key) {
        res.status(400).json({ error: 'File key is required' });
        return;
    }

    try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const s3 = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            ...(process.env.S3_ENDPOINT
                ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
                : {}),
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
        });

        const readUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        res.json({ readUrl, key });
    } catch (err) {
        console.error('S3 presign-read error:', err);
        res.status(500).json({ error: 'Failed to generate read URL' });
    }
});

export default router;
