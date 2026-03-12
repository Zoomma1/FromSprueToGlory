// ──────────────────────────────────────────────────────────
// Media Service — Business Logic Layer
// ──────────────────────────────────────────────────────────
// S3 pre-signed URL generation using the shared S3 singleton.
// ──────────────────────────────────────────────────────────

import z from 'zod';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError, ValidationError } from '../lib/errors';
import { getS3Client } from '../lib/s3';

// ─── presignUploadSchema ──────────────────────────────────

export const presignUploadSchema = z.object({
    fileName: z.string().min(1),
    fileType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
}).strict();

// ─── presignUpload ────────────────────────────────────────

export async function presignUpload(
    userId: string,
    body: unknown,
): Promise<{ uploadUrl: string; key: string }> {
    const parsed = presignUploadSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationError('Validation failed', parsed.error.flatten());
    }
    const { fileName, fileType } = parsed.data;

    const s3 = getS3Client();
    if (!s3) {
        throw new AppError(503, 'S3 not configured');
    }

    const key = `users/${userId}/${Date.now()}-${fileName}`;

    try {
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            ContentType: fileType,
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
    const s3 = getS3Client();
    if (!s3) {
        throw new AppError(503, 'S3 not configured');
    }

    try {
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
