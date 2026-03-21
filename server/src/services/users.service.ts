// ──────────────────────────────────────────────────────────
// Users Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';

const userSelect = { id: true, email: true, currency: true };

// ─── getProfile ───────────────────────────────────────────

export async function getProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
}

// ─── updateCurrency ───────────────────────────────────────

export async function updateCurrency(userId: string, currency: string) {
    return prisma.user.update({
        where: { id: userId },
        data: { currency },
        select: userSelect,
    });
}
