import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyRepository } from '../repositories';

function hashBody(body: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? '')).digest('hex');
}

export function idempotency(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('Idempotency-Key');
  if (!key) {
    res.status(400).json({ error: '缺少 Idempotency-Key 请求头' });
    return;
  }

  const existing = IdempotencyRepository.get(key);
  if (existing) {
    try {
      const cached = JSON.parse(existing.responseJson);
      res.setHeader('X-Idempotent-Replayed', 'true');
      res.status(cached.status).json(cached.body);
      return;
    } catch {
      // fall through
    }
  }

  IdempotencyRepository.purgeOld();
  const requestHash = hashBody(req.body);

  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    IdempotencyRepository.set(key, requestHash, JSON.stringify({ status: res.statusCode, body }));
    return originalJson(body);
  };

  next();
}
