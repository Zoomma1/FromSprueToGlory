// ──────────────────────────────────────────────────────────
// Auth Routes — Thin HTTP adapter
// ──────────────────────────────────────────────────────────
// JWT authentication with refresh token rotation.
//
// FLOW:
//   1. Signup: create user → return access + refresh tokens
//   2. Login: verify credentials → return access + refresh tokens
//   3. Refresh: exchange valid refresh token → new access + refresh tokens
//   4. Logout: delete refresh token from DB
//
// WHY refresh token rotation?
//   - Short-lived access tokens (15min) limit damage if stolen
//   - Refresh tokens are stored in DB and can be revoked
//   - ALTERNATIVE: long-lived access tokens (simpler but higher risk)
//
// All business logic lives in auth.service.ts.
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler';
import passport from '../lib/passport';
import * as authService from '../services/auth.service';

const router = Router();

// ─── POST /api/auth/signup ──────────────────────────────

router.post(
    '/signup',
    asyncHandler(async (req, res) => {
        const result = await authService.signup(req.body);
        res.status(201).json(result);
    }),
);

// ─── POST /api/auth/login ───────────────────────────────

router.post(
    '/login',
    asyncHandler(async (req, res) => {
        const result = await authService.login(req.body);
        res.json(result);
    }),
);

// ─── POST /api/auth/refresh ─────────────────────────────

router.post(
    '/refresh',
    asyncHandler(async (req, res) => {
        const result = await authService.refresh(req.body);
        res.json(result);
    }),
);

// ─── POST /api/auth/logout ──────────────────────────────

router.post(
    '/logout',
    asyncHandler(async (req, res) => {
        const result = await authService.logout(req.body);
        res.json(result);
    }),
);

// ─── GET /api/auth/session ─────────────────────────────────

router.get(
   '/session',
    asyncHandler(async (req, res) => {
        const oauthToken = req.cookies.oauth_tokens;
        if (oauthToken) {
            const data = JSON.parse(decodeURIComponent(oauthToken));
            res.clearCookie('oauth_tokens').status(200).json(data);
            return;
        }
        res.status(401).json({ error: 'No active session' });
    }),
);

// ─── GET /api/auth/google ──────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// ─── GET /api/auth/google/callback ─────────────────────

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const tokens = req.user as { accessToken: string; refreshToken: string; user: object };
        res.cookie('oauth_tokens', JSON.stringify(tokens), {
            httpOnly: true,
            maxAge: 2 * 60 * 1000, // 2 minutes — transit only
            sameSite: 'lax',
        });
        res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:4200'}/auth/callback`);
    },
);

export default router;