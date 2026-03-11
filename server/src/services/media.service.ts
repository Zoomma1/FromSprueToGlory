// ──────────────────────────────────────────────────────────
// Media Service — Business Logic Layer
// ──────────────────────────────────────────────────────────
// S3 pre-signed URL generation.
// Dynamic imports avoid crash if aws-sdk is not installed.
// ──────────────────────────────────────────────────────────

import { AppError } from '../lib/errors';

// ─── isS3Configured ───────────────────────────────────────

function isS3Configured(): boolean {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.S3_BUCKET
    );
}

// ─── presignUpload ────────────────────────────────────────

export async function presignUpload(
    userId: string,
    fileName: string,
    contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
    if (!isS3Configured()) {
        throw new AppError(503, 'S3 not configured');
    }

    const key = `users/${userId}/${Date.now()}-${fileName}`;

    try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

        const s3 = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            ...(process.env.S3_ENDPOINT
                ? {
                    endpoint: process.env.S3_ENDPOINT,
                    forcePathStyle: true,
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

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

        return { uploadUrl, key };
    } catch (err) {
        console.error('S3 presign-upload error:', err);
        throw new AppError(500, 'Failed to generate upload URL');
    }
}

// ─── presignRead ──────────────────────────────────────────

export async function presignRead(key: string): Promise<{ readUrl: string; key: string }> {
    if (!isS3Configured()) {
        throw new AppError(503, 'S3 not configured');
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

        const readUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return { readUrl, key };
    } catch (err) {
        console.error('S3 presign-read error:', err);
        throw new AppError(500, 'Failed to generate read URL');
    }
}