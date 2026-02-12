// ──────────────────────────────────────────────────────────
// 🛡️ Auth Middleware — JWT Verification
// ──────────────────────────────────────────────────────────
// Extracts and verifies JWT from the Authorization header.
// Attaches userId to the request for downstream use.
//
// WHY middleware instead of checking in each route?
//   - DRY: write once, protect all routes that need auth
//   - Express middleware pattern: req → middleware → handler
//   - ALTERNATIVE: use a decorator pattern (cleaner but needs class-based controllers)
// ──────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = verifyAccessToken(token);
        (req as any).userId = payload.userId;
        (req as any).userEmail = payload.email;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
