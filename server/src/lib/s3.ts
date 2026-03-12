// ──────────────────────────────────────────────────────────
// S3 Client Singleton
// ──────────────────────────────────────────────────────────
// WHY a singleton?
//   - S3Client holds connection context. Creating a new instance
//     per request wastes resources and re-reads credentials each call.
//   - Returns null when S3 env vars are missing (e.g., local dev without MinIO).
//     Callers throw 503 when null — same behaviour as the old isS3Configured() guard.
//
// WHY lazy (not eager)?
//   - Allows the server to start without S3 env vars set (read: offline development).
//   - The client is only constructed on first presign call.
//
// ALTERNATIVE: PrismaClient uses globalThis to survive hot-reload.
//   S3Client does not manage a connection pool so globalThis is not needed.
// ──────────────────────────────────────────────────────────

import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export function getS3Client(): S3Client | null {
    if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        !process.env.S3_BUCKET
    ) {
        return null;
    }

    if (!client) {
        client = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            ...(process.env.S3_ENDPOINT
                ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
                : {}),
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    return client;
}
