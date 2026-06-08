import express, { type Request, type Response } from 'express';
import { getAllPerspectives } from '../db/db.js';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const perspectives = await getAllPerspectives();
    res.json({ success: true, data: perspectives });
  } catch (_error) {
    res.status(500).json({ success: false, error: '获取视角列表失败' });
  }
});

export default router;
