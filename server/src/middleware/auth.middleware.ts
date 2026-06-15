// ──────────────────────────────────────────────────────────
// 🛡️ Auth Middleware — JWT Verification
// ──────────────────────────────────────────────────────────
// Extracts and verifies JWT from the Authorization header.
// Attaches userId to the request for downstream use.
//
// WHY middleware instead of checking in each route?
//   - DRY: write once, protect all routes that need auth
//   - Express middleware pattern: req → middleware → handler
//   - ALTERNATIVE: use a decorator pattern (cleaner but needs classes-based controllers)
// ──────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { trackUserActivity } from '../services/user-activity.service';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const payload = verifyAccessToken(token);
        req.userId = payload.userId;
        req.userEmail = payload.email;

        // Adoption tracking (FSTG-12): fire-and-forget. trackUserActivity
        // swallows its own errors and the per-day unique constraint dedups the
        // writes, so this never blocks or fails the authenticated request.
        void trackUserActivity(payload.userId, req.path);

        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
