// ──────────────────────────────────────────────────────────
// 🔑 JWT Utilities — Token generation & verification
// ──────────────────────────────────────────────────────────
// WHY separate JWT utils?
//   - Single responsibility: token logic in one place
//   - Easy to swap algorithms or add claims
//   - Testable in isolation
//   - ALTERNATIVE: use passport.js (more features but more complexity)
//
// 🎯 MINI-EXERCISE: Change JWT_EXPIRES_IN to "5s" (5 seconds).
//    Login, wait 6 seconds, then try to access a protected route.
//    What error do you get?
// ──────────────────────────────────────────────────────────

import * as jwt from 'jsonwebtoken';

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET: jwt.Secret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
    userId: string;
    email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
    // Cast to any to satisfy jwt.sign overloads in current type defs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (jwt.sign as any)(payload, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN } as any);
}

export function generateRefreshToken(payload: TokenPayload): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (jwt.sign as any)(payload, JWT_REFRESH_SECRET as any, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);
}

export function verifyAccessToken(token: string): TokenPayload {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.verify(token, JWT_SECRET as any) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.verify(token, JWT_REFRESH_SECRET as any) as TokenPayload;
}
