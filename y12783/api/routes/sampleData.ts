import { Router, Request, Response } from 'express';
import * as store from '../repository/store.js';

const router = Router();

router.get('/status', (_req: Request, res: Response) => {
  const initialized = store.isInitialized();
  res.json({
    initialized,
    message: initialized ? '数据已初始化' : '尚未加载示例数据',
  });
});

router.post('/init', (_req: Request, res: Response) => {
  const result = store.initializeSampleData();
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

router.get('/check', (_req: Request, res: Response) => {
  const reagents = store.getAllReagents();
  const batches = store.getAllBatches();
  const spectrums = store.getAllSpectrums();

  res.json({
    reagents: reagents.length,
    batches: batches.length,
    spectrums: spectrums.length,
  });
});

export default router;
