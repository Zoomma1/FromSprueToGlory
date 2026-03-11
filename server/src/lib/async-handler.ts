// ──────────────────────────────────────────────────────────
// asyncHandler — wraps async route handlers for Express
// ──────────────────────────────────────────────────────────
// WHY this utility?
//   Express 4 does not catch rejected promises from async route handlers.
//   Without this wrapper, unhandled promise rejections bypass the error
//   handler entirely and crash the process.
//   This wrapper catches any rejection and passes it to next(err),
//   which reaches the centralized errorHandler in app.ts.
//
//   No new dependencies — uses only existing Express types.
// ──────────────────────────────────────────────────────────

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
    return (req, res, next) => fn(req, res, next).catch(next);
}
