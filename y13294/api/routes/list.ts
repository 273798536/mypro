import { Router, type Request, type Response } from 'express';
import { generate, rerun } from '../services/listService.js';

const router = Router();

/** POST /api/list/generate — 启动生成公示清单 */
router.post('/generate', (_req: Request, res: Response) => {
  res.json({ ok: true, data: generate() });
});

/** POST /api/list/rerun — 重跑处理（按改判记录重新评估并对齐当前状态） */
router.post('/rerun', (_req: Request, res: Response) => {
  res.json({ ok: true, data: rerun() });
});

export default router;
