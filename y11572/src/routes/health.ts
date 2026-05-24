import { Router, Request, Response } from 'express';
import { testConnection } from '../database/connection';
import getRedisClient from '../config/redis';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();

  let redisConnected = false;
  try {
    const redis = getRedisClient();
    await redis.ping();
    redisConnected = true;
  } catch {
    redisConnected = false;
  }

  const allHealthy = dbConnected && redisConnected;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'healthy' : 'unhealthy',
      redis: redisConnected ? 'healthy' : 'unhealthy',
    },
  });
});

router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
