import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { handleGoogleCallback } from '../services/auth.service';

// ──────────────────────────────────────────────────────────
// WHY a configurePassport() function instead of top-level code?
//   Registering the GoogleStrategy at import time crashes in tests
//   because GOOGLE_CLIENT_ID is not set. Wrapping it in a function
//   lets index.ts call it at startup while tests import the routes
//   safely without triggering the initialization.
// ──────────────────────────────────────────────────────────

export function configurePassport() {
    passport.use(new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleId = profile.id;
                const email = profile.emails?.[0].value ?? '';
                const result = await handleGoogleCallback(googleId, email);
                done(null, result);
            } catch (err) {
                done(err as Error);
            }
        },
    ));
}

export default passport;