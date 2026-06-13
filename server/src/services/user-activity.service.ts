// ──────────────────────────────────────────────────────────
// User Activity Service — Adoption Metric (FSTG-12)
// ──────────────────────────────────────────────────────────
// Two-layer design, decided at refine 2026-06-01:
//   B (source of truth) → UserActivity, one row per user per UTC day.
//   A (denormalized)    → User.lastLoginAt = MAX(UserActivity.timestamp),
//                         kept in sync so "active in last N days" is a
//                         trivial User.count with no scan of the log.
//
// Dedup (1 row / user / day) is enforced STRUCTURALLY by the
// @@unique([userId, day]) constraint. trackUserActivity therefore issues a
// single INSERT ... ON CONFLICT DO NOTHING (createMany skipDuplicates) — no
// read-before-write, idempotent, and race-safe under concurrent requests.
//
// "active" = "used the app", not "logged in": the refresh token lasts 7 days,
// so tracking on login alone would massively undercount. The helper is called
// from the auth middleware on every authenticated request, but the per-day
// unique constraint collapses the writes to one effective insert per day.
//
// No PII is stored: only userId + timestamps (+ optional route, no query string).
// ──────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Normalize a moment to UTC midnight — the dedup granularity. UTC (not
// Europe/Paris) keeps the boundary deterministic and DST-free; the slight
// offset for a FR user is irrelevant to a rolling N-day counter.
function utcDayStart(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ─── trackUserActivity ────────────────────────────────────
// Fire-and-forget from the auth middleware. MUST NOT throw: a tracking failure
// can never be allowed to break an authenticated request, so every error is
// swallowed here rather than at the call site.
export async function trackUserActivity(userId: string, route?: string): Promise<void> {
    try {
        const now = new Date();
        const day = utcDayStart(now);

        // ON CONFLICT DO NOTHING: count is 1 the first time today, 0 afterwards.
        const { count } = await prisma.userActivity.createMany({
            data: [{ userId, day, route }],
            skipDuplicates: true,
        });

        // Only touch the denormalized field when a genuinely new day was logged,
        // so we keep the "one write per user per day" property end-to-end.
        if (count > 0) {
            await prisma.user.update({
                where: { id: userId },
                data: { lastLoginAt: now },
            });
        }
    } catch {
        // Swallow — tracking is best-effort and must never surface to the request.
    }
}

// ─── countActiveUsers ─────────────────────────────────────
// "How many distinct users were active in the last N days?" — single count
// over the denormalized lastLoginAt, no scan of the activity log.
export async function countActiveUsers(days = 7): Promise<number> {
    const cutoff = new Date(Date.now() - days * MS_PER_DAY);
    return prisma.user.count({
        where: { lastLoginAt: { gte: cutoff } },
    });
}

// ─── countReturningUsers ──────────────────────────────────
// "How many users came back?" — active on at least 2 distinct days within the
// window. One unique row per user per day means row-count == distinct-day-count,
// so a groupBy with a having-count >= 2 answers it directly.
export async function countReturningUsers(days = 7): Promise<number> {
    const cutoff = new Date(Date.now() - days * MS_PER_DAY);
    const rows = await prisma.userActivity.groupBy({
        by: ['userId'],
        where: { day: { gte: cutoff } },
        having: { userId: { _count: { gte: 2 } } },
    });
    return rows.length;
}
