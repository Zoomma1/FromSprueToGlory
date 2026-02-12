import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

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
const app = createApp();

app.listen(PORT, () => {
    console.log(`
  ⚔️  From Sprue to Glory API
  📡 Running on http://localhost:${PORT}
  🏥 Health check: http://localhost:${PORT}/api/health
  🌍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});
