// ──────────────────────────────────────────────────────────
// 🗄️ Prisma Client Singleton
// ──────────────────────────────────────────────────────────
// WHY a singleton?
//   - PrismaClient manages a connection pool. Creating multiple
//     instances wastes database connections.
//   - In development, hot-reloading can create new instances each time.
//     Storing on `globalThis` prevents connection leaks.
//   - ALTERNATIVE: create PrismaClient in each file (wasteful, leaks connections)
//
// 🎯 MINI-EXERCISE: Add a console.log here to see how many times
//    this file gets loaded during development. You'll see it's only once!
// ──────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
