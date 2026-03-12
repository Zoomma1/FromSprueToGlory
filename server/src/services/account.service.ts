// ──────────────────────────────────────────────────────────
// Account Service — Business Logic Layer
// ──────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

// ─── deleteAccount ────────────────────────────────────────

export async function deleteAccount(userId: string): Promise<void> {
    // Delete the user — all related data cascades via Prisma schema onDelete: Cascade
    await prisma.user.delete({ where: { id: userId } });
}
