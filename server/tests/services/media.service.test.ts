// ──────────────────────────────────────────────────────────
// Media Service Unit Tests
// ──────────────────────────────────────────────────────────
// Tests the service layer directly — no HTTP, no Supertest.
// lib/s3 singleton, @aws-sdk packages, and Prisma are all mocked.
// ──────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────
vi.mock('../../src/lib/s3', () => ({
    getS3Client: vi.fn().mockReturnValue({}),
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn().mockResolvedValue('https://s3/mock-signed-url'),
}));
vi.mock('@aws-sdk/client-s3', () => ({
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
}));
vi.mock('../../src/lib/prisma', () => ({
    prisma: {
        item: { findFirst: vi.fn() },
    },
}));

import { getS3Client } from '../../src/lib/s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError, ValidationError } from '../../src/lib/errors';
import { presignUpload, presignRead } from '../../src/services/media.service';

describe('Media Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getS3Client as ReturnType<typeof vi.fn>).mockReturnValue({});
        (getSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue('https://s3/mock-signed-url');
    });

    // ─── presignUpload ────────────────────────────────────
    describe('presignUpload', () => {
        it('returns { uploadUrl, key } when body is valid and S3 is configured', async () => {
            const result = await presignUpload('user-1', {
                fileName: 'test.jpg',
                fileType: 'image/jpeg',
            });

            expect(result).toHaveProperty('uploadUrl');
            expect(result).toHaveProperty('key');
            expect(result.uploadUrl).toBe('https://s3/mock-signed-url');
        });

        it('throws ValidationError when fileName is missing', async () => {
            await expect(
                presignUpload('user-1', { fileType: 'image/jpeg' }),
            ).rejects.toThrow(ValidationError);
        });

        it('throws ValidationError when fileType is not in accepted enum', async () => {
            await expect(
                presignUpload('user-1', { fileName: 'test.pdf', fileType: 'application/pdf' }),
            ).rejects.toThrow(ValidationError);
        });

        it('throws AppError with statusCode 503 when getS3Client returns null', async () => {
            (getS3Client as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

            const error = await presignUpload('user-1', {
                fileName: 'test.jpg',
                fileType: 'image/jpeg',
            }).catch((e) => e);

            expect(error).toBeInstanceOf(AppError);
            expect(error.statusCode).toBe(503);
        });

        it('returned key contains the userId', async () => {
            const result = await presignUpload('user-abc', {
                fileName: 'test.jpg',
                fileType: 'image/jpeg',
            });

            expect(result.key).toContain('user-abc');
        });
    });

    // ─── presignRead ──────────────────────────────────────
    describe('presignRead', () => {
        it('returns { readUrl } with a valid key string', async () => {
            const result = await presignRead('users/user-1/12345-test.jpg');

            expect(result).toHaveProperty('readUrl');
            expect(result.readUrl).toBe('https://s3/mock-signed-url');
        });

        it('throws AppError with statusCode 503 when getS3Client returns null', async () => {
            (getS3Client as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

            const error = await presignRead('users/user-1/12345-test.jpg').catch((e) => e);

            expect(error).toBeInstanceOf(AppError);
            expect(error.statusCode).toBe(503);
        });
    });
});
