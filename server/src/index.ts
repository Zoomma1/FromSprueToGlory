import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './lib/prisma';
import { configurePassport } from './lib/passport';

// ──────────────────────────────────────────────
// 🚀 Server Entry Point
// ──────────────────────────────────────────────
// WHY separate index.ts from app.ts?
//   - index.ts handles process-level concerns (env, port, listen)
//   - app.ts handles Express configuration (routes, middleware)
//   - This separation makes the app testable (import app without starting server)
//
// ALTERNATIVE: put everything in one file (simpler but untestable)
// ──────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000', 10);
configurePassport();
const app = createApp();

async function start() {
  // ─── Validate DB connection before accepting requests ───
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    console.log('  ✅ Database connection verified');
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : String(err);
    console.error(`
  ❌ DATABASE CONNECTION FAILED
  ─────────────────────────────────────
  Could not connect to the database.
  
  Check your DATABASE_URL in .env:
    ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || '(not set)'}
  
  Error: ${errMessage}
  ─────────────────────────────────────
        `);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
  ⚔️  From Sprue to Glory API
  📡 Running on http://localhost:${PORT}
  🏥 Health check: http://localhost:${PORT}/api/health
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
  });
}

start();
