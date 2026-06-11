/**
 * Vercel deploy entry handler, for serverless deployment, please don't modify this file
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { bootstrap } from './app.js';

let bootstrapPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap().then(() => {});
  }
  await bootstrapPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureInitialized();
  return app(req, res);
}