import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from './app.js';
import { initDatabase, isDatabaseEmpty } from './db/database.js';
import { runSeed } from './db/seed.js';

try {
  initDatabase();
  if (isDatabaseEmpty()) {
    runSeed();
  }
} catch (error) {
  console.error('[DB] Initialization failed:', error);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
